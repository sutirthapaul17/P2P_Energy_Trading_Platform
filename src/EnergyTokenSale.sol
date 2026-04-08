// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EnergyTokenSale
 * @dev Handles buying and selling of ENERGY tokens with ETH
 * Separated from main marketplace for cleaner architecture
 */
contract EnergyTokenSale is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    IERC20 public energyToken;
    address public treasury;
    uint256 public tokenPrice; // Price in wei per token
    
    // Limits
    uint256 public dailyPurchaseLimit = 10000 * 10**18;
    uint256 public dailySellLimit = 5000 * 10**18;
    uint256 public globalDailyPurchaseLimit = 100000 * 10**18;
    uint256 public globalDailySellLimit = 50000 * 10**18;
    uint256 public minPurchaseAmount = 10 * 10**18;
    uint256 public minSellAmount = 10 * 10**18;
    
    // Flags
    bool public tokenSalesActive = true;
    bool public tokenBuysActive = true;
    bool public tokenSellsActive = true;
    
    // Trackers
    mapping(address => uint256) public userDailyPurchases;
    mapping(address => uint256) public userDailySells;
    mapping(address => uint256) public lastPurchaseReset;
    mapping(address => uint256) public lastSellReset;
    uint256 public globalDailyPurchases;
    uint256 public globalDailySells;
    uint256 public lastGlobalReset;
    
    // Events
    event TokensPurchased(address indexed buyer, uint256 tokenAmount, uint256 ethAmount);
    event TokensSold(address indexed seller, uint256 tokenAmount, uint256 ethAmount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TokenPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event TokenSalesToggled(bool salesActive, bool buysActive, bool sellsActive);
    event DirectETHReceived(address indexed sender, uint256 amount);
    
    constructor(address _energyToken, address _admin, address _treasury) {
        require(_energyToken != address(0), "Invalid token address");
        require(_admin != address(0), "Invalid admin address");
        require(_treasury != address(0), "Invalid treasury address");
        
        energyToken = IERC20(_energyToken);
        treasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }
    
    // Modifiers
    modifier withinPurchaseLimit(address user, uint256 tokenAmount) {
        if (block.timestamp >= lastPurchaseReset[user] + 1 days) {
            userDailyPurchases[user] = 0;
            lastPurchaseReset[user] = block.timestamp;
        }
        
        if (block.timestamp >= lastGlobalReset + 1 days) {
            globalDailyPurchases = 0;
            lastGlobalReset = block.timestamp;
        }
        
        require(userDailyPurchases[user] + tokenAmount <= dailyPurchaseLimit, "Exceeds daily purchase limit");
        require(globalDailyPurchases + tokenAmount <= globalDailyPurchaseLimit, "Exceeds global daily limit");
        require(tokenAmount >= minPurchaseAmount, "Below minimum purchase");
        _;
    }
    
    modifier withinSellLimit(address user, uint256 tokenAmount) {
        if (block.timestamp >= lastSellReset[user] + 1 days) {
            userDailySells[user] = 0;
            lastSellReset[user] = block.timestamp;
        }
        
        require(userDailySells[user] + tokenAmount <= dailySellLimit, "Exceeds daily sell limit");
        require(globalDailySells + tokenAmount <= globalDailySellLimit, "Exceeds global daily sell limit");
        require(tokenAmount >= minSellAmount, "Below minimum sell");
        _;
    }
    
    /**
     * @dev Buy ENERGY tokens with ETH
     */
    function buyTokens() 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        withinPurchaseLimit(msg.sender, (msg.value * 10**18) / tokenPrice)
    {
        require(tokenSalesActive, "Sales paused");
        require(tokenBuysActive, "Buys paused");
        require(tokenPrice > 0, "Price not set");
        require(msg.value > 0, "Must send ETH");
        
        uint256 tokenAmount = (msg.value * 10**18) / tokenPrice;
        require(tokenAmount > 0, "Amount too small");
        
        // Check treasury has enough tokens
        require(energyToken.balanceOf(treasury) >= tokenAmount, "Insufficient treasury balance");
        
        // Transfer tokens from treasury to buyer
        energyToken.safeTransferFrom(treasury, msg.sender, tokenAmount);
        
        // Update limits
        userDailyPurchases[msg.sender] += tokenAmount;
        globalDailyPurchases += tokenAmount;
        
        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }
    
    /**
     * @dev Sell ENERGY tokens back for ETH
     */
    function sellTokens(uint256 tokenAmount) 
        external 
        nonReentrant 
        whenNotPaused 
        withinSellLimit(msg.sender, tokenAmount)
    {
        require(tokenSalesActive, "Sales paused");
        require(tokenSellsActive, "Sells paused");
        require(tokenPrice > 0, "Price not set");
        require(tokenAmount > 0, "Amount must be positive");
        
        uint256 ethAmount = (tokenAmount * tokenPrice) / 10**18;
        require(address(this).balance >= ethAmount, "Insufficient ETH");
        require(energyToken.balanceOf(msg.sender) >= tokenAmount, "Insufficient tokens");
        require(energyToken.allowance(msg.sender, address(this)) >= tokenAmount, "Insufficient allowance");
        
        // Transfer tokens from user to treasury
        energyToken.safeTransferFrom(msg.sender, treasury, tokenAmount);
        
        // Send ETH to user
        // payable(msg.sender).transfer(ethAmount);
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        // Update limits
        userDailySells[msg.sender] += tokenAmount;
        globalDailySells += tokenAmount;
        
        emit TokensSold(msg.sender, tokenAmount, ethAmount);
    }
    
    /**
     * @dev Admin functions
     */
    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    function setTokenPrice(uint256 newPrice) external onlyRole(ADMIN_ROLE) {
        require(newPrice > 0, "Price must be positive");
        uint256 oldPrice = tokenPrice;
        tokenPrice = newPrice;
        emit TokenPriceUpdated(oldPrice, newPrice);
    }
    
    function updateLimits(
        uint256 newDailyPurchase,
        uint256 newDailySell,
        uint256 newGlobalPurchase,
        uint256 newGlobalSell,
        uint256 newMinPurchase,
        uint256 newMinSell
    ) external onlyRole(ADMIN_ROLE) {
        require(newDailyPurchase > 0 && newDailySell > 0, "Limits must be positive");
        dailyPurchaseLimit = newDailyPurchase;
        dailySellLimit = newDailySell;
        globalDailyPurchaseLimit = newGlobalPurchase;
        globalDailySellLimit = newGlobalSell;
        minPurchaseAmount = newMinPurchase;
        minSellAmount = newMinSell;
    }
    
    function toggleSales(bool salesActive, bool buysActive, bool sellsActive) external onlyRole(ADMIN_ROLE) {
        tokenSalesActive = salesActive;
        tokenBuysActive = buysActive;
        tokenSellsActive = sellsActive;
        emit TokenSalesToggled(salesActive, buysActive, sellsActive);
    }
    
    function withdrawETH(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        // payable(to).transfer(amount);
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "ETH transfer failed");
    }
    
    function addTokensToTreasury(uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(amount > 0, "Amount must be positive");
        require(energyToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        energyToken.safeTransferFrom(msg.sender, treasury, amount);
    }
    
    /**
     * @dev View functions
     */
    function getContractETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function calculateTokensForETH(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * 10**18) / tokenPrice;
    }
    
    function calculateETHForTokens(uint256 tokenAmount) external view returns (uint256) {
        return (tokenAmount * tokenPrice) / 10**18;
    }
    
    function getRemainingPurchaseLimit(address user) external view returns (uint256) {
        if (block.timestamp >= lastPurchaseReset[user] + 1 days) {
            return dailyPurchaseLimit;
        }
        uint256 used = userDailyPurchases[user];
        return used >= dailyPurchaseLimit ? 0 : dailyPurchaseLimit - used;
    }
    
    function getRemainingSellLimit(address user) external view returns (uint256) {
        if (block.timestamp >= lastSellReset[user] + 1 days) {
            return dailySellLimit;
        }
        uint256 used = userDailySells[user];
        return used >= dailySellLimit ? 0 : dailySellLimit - used;
    }
    
    receive() external payable {
        // Allow contract to receive ETH
        emit DirectETHReceived(msg.sender, msg.value);
    }
}