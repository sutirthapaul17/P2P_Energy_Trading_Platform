// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title EnergyMarketplace
 * @dev P2P Energy Trading Platform using ERC20 token
 */
contract EnergyMarketplace is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    // using Counters for Counters.Counter;


    ////////////////////////////////////////////////
    /////////// Roles and Data Structures //////////
    ////////////////////////////////////////////////

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    bytes32 public constant METER_READER_ROLE = keccak256("METER_READER_ROLE");

    // Energy types
    enum EnergyType { Solar, Biogas, Wind, Hydro, Other }
    
    // Listing status
    enum ListingStatus { Active, Fulfilled, Cancelled, Expired, Disputed }
    
    // Trade status
    enum TradeStatus { Pending, Verified, Completed, Disputed, Cancelled, UnderReview }
    
    // Dispute status
    enum DisputeStatus { Open, Resolved, Rejected, InArbitration }

    // Producer verification
    struct Producer {
        address producer;
        string name;
        string location;
        uint256 totalCapacity; // in kWh
        uint256 availableCapacity;
        EnergyType energyType;
        bool isVerified;
        uint256 verificationTimestamp;
        uint256 totalTrades;
        uint256 totalEnergySold;
        uint256 reputation; // 0-1000
    }

    // Energy listing
    struct EnergyListing {
        uint256 id;
        address producer;
        uint256 amount; // in kWh
        uint256 pricePerUnit; // in token decimals
        uint256 startTime;
        uint256 endTime;
        EnergyType energyType;
        string qualityCertificate; // IPFS hash
        ListingStatus status;
        uint256 createdAt;
        uint256 minPurchaseAmount;
        uint256 maxPurchaseAmount;
    }

    // Trade order
    struct Trade {
        uint256 id;
        uint256 listingId;
        address buyer;
        address producer;
        uint256 amount; // kWh
        uint256 totalPrice; // tokens
        uint256 tradeTimestamp;
        TradeStatus status;
        uint256 meterReadingBefore;
        uint256 meterReadingAfter;
        bool isBuyerConfirmed;
        bool isProducerConfirmed;
        uint256 disputeDeadline;
        uint256 disputeId;
    }

    // Dispute
    struct Dispute {
        uint256 id;
        uint256 tradeId;
        address initiator;
        string reason;
        string evidence; // IPFS hash
        DisputeStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
        address arbitrator;
        string resolution;
    }

    // Platform fees
    struct FeeConfig {
        uint256 platformFeePercent; // Basis points (100 = 1%)
        uint256 minFee; // Minimum fee in tokens
        uint256 maxFee; // Maximum fee in tokens
        address feeCollector;
    }


    ///////////////////////////////////////////////////
    ////////Mappings, State Variables////////
    ///////////////////////////////////////////////////

    // Mappings
    mapping(address => Producer) public producers;
    mapping(uint256 => EnergyListing) public listings;
    mapping(uint256 => Trade) public trades;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userTrades;
    mapping(uint256 => uint256[]) public listingTrades;
    
    
    uint256 private _listingIdCounter;
    uint256 private _tradeIdCounter;
    uint256 private _disputeIdCounter;
    
    // Platform configuration
    IERC20 public energyToken;
    FeeConfig public feeConfig;
    uint256 public minListingAmount = 1; // Minimum 1 kWh
    uint256 public maxListingAmount = 10000; // Maximum 10,000 kWh
    uint256 public listingDuration = 30 days;
    uint256 public confirmationPeriod = 7 days;
    uint256 public disputePeriod = 3 days;
    
    ////////////////////////////
    ///////// Events ///////////
    ////////////////////////////

    event ProducerRegistered(
        address indexed producer,
        string name,
        EnergyType energyType,
        uint256 capacity
    );
    
    event ProducerVerified(
        address indexed producer,
        address indexed verifier
    );
    
    event ListingCreated(
        uint256 indexed listingId,
        address indexed producer,
        uint256 amount,
        uint256 pricePerUnit
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed producer
    );
    
    event TradeCreated(
        uint256 indexed tradeId,
        uint256 indexed listingId,
        address indexed buyer,
        address producer,
        uint256 amount,
        uint256 totalPrice
    );
    
    event TradeConfirmed(
        uint256 indexed tradeId,
        address indexed confirmer,
        bool isBuyer
    );
    
    event TradeCompleted(
        uint256 indexed tradeId,
        uint256 platformFee,
        uint256 producerPayout
    );
    
    event DisputeRaised(
        uint256 indexed disputeId,
        uint256 indexed tradeId,
        address indexed initiator,
        string reason
    );
    
    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeStatus status,
        string resolution
    );
    
    event FeeConfigUpdated(
        uint256 platformFeePercent,
        uint256 minFee,
        uint256 maxFee
    );




    constructor(address _energyToken, address _admin) {
        require(_energyToken != address(0), "Invalid token address");
        require(_admin != address(0), "Invalid admin address");
        
        energyToken = IERC20(_energyToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);
        _grantRole(ARBITRATOR_ROLE, _admin);
        
        // Initialize fee configuration
        feeConfig = FeeConfig({
            platformFeePercent: 100, // 1%
            minFee: 10 * 10**18, // 10 tokens
            maxFee: 1000 * 10**18, // 1000 tokens
            feeCollector: _admin
        });
    }



    /**
     * @dev Register as an energy producer
     */
    function registerProducer(
        string memory name,
        string memory location,
        uint256 totalCapacity,
        EnergyType energyType
        // string memory qualityCertificate
    ) external {
        require(bytes(name).length > 0, "Name required");
        require(bytes(location).length > 0, "Location required");
        require(totalCapacity > 0, "Capacity must be positive");
        require(!producers[msg.sender].isVerified, "Already registered");
        
        producers[msg.sender] = Producer({
            producer: msg.sender,
            name: name,
            location: location,
            totalCapacity: totalCapacity,
            availableCapacity: totalCapacity,
            energyType: energyType,
            isVerified: false,
            verificationTimestamp: 0,
            totalTrades: 0,
            totalEnergySold: 0,
            reputation: 500 // Starting reputation
        });
        
        emit ProducerRegistered(msg.sender, name, energyType, totalCapacity);
    }

    /**
     * @dev Verify a producer (only verifier role)
     */
    function verifyProducer(address producer) external onlyRole(VERIFIER_ROLE) {
        require(producers[producer].producer == producer, "Producer not registered");
        require(!producers[producer].isVerified, "Already verified");
        
        producers[producer].isVerified = true;
        producers[producer].verificationTimestamp = block.timestamp;
        
        emit ProducerVerified(producer, msg.sender);
    }

    /**
     * @dev Create an energy listing
     */
    function createListing(
        uint256 amount,
        uint256 pricePerUnit,
        uint256 startTime,
        uint256 endTime,
        uint256 minPurchaseAmount,
        uint256 maxPurchaseAmount,
        string memory qualityCertificate
    ) external whenNotPaused {
        require(producers[msg.sender].isVerified, "Producer not verified");
        require(amount >= minListingAmount, "Amount below minimum");
        require(amount <= maxListingAmount, "Amount above maximum");
        require(pricePerUnit > 0, "Price must be positive");
        require(startTime >= block.timestamp, "Start time in past");
        require(endTime > startTime, "Invalid end time");
        require(endTime <= startTime + listingDuration, "Duration too long");
        require(minPurchaseAmount > 0, "Min purchase required");
        require(maxPurchaseAmount >= minPurchaseAmount, "Invalid purchase limits");
        require(amount >= minPurchaseAmount, "Amount less than min purchase");
        
        Producer storage producer = producers[msg.sender];
        require(amount <= producer.availableCapacity, "Insufficient capacity");
        
        _listingIdCounter++;
        uint256 listingId = _listingIdCounter;
        
        listings[listingId] = EnergyListing({
            id: listingId,
            producer: msg.sender,
            amount: amount,
            pricePerUnit: pricePerUnit,
            startTime: startTime,
            endTime: endTime,
            energyType: producer.energyType,
            qualityCertificate: qualityCertificate,
            status: ListingStatus.Active,
            createdAt: block.timestamp,
            minPurchaseAmount: minPurchaseAmount,
            maxPurchaseAmount: maxPurchaseAmount
        });
        
        // Update producer's available capacity
        producer.availableCapacity -= amount;
        
        userListings[msg.sender].push(listingId);
        
        emit ListingCreated(listingId, msg.sender, amount, pricePerUnit);
    }

    /**
     * @dev Cancel an active listing
     */
    function cancelListing(uint256 listingId) external whenNotPaused {
        EnergyListing storage listing = listings[listingId];
        require(listing.producer == msg.sender, "Not your listing");
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(block.timestamp < listing.startTime, "Cannot cancel after start");
        
        listing.status = ListingStatus.Cancelled;
        
        // Return capacity to producer
        producers[msg.sender].availableCapacity += listing.amount;
        
        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @dev Purchase energy from a listing
     */
    function purchaseEnergy(
        uint256 listingId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        EnergyListing storage listing = listings[listingId];
        // Trade memory existingTrade;
        
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(block.timestamp >= listing.startTime, "Listing not started");
        require(block.timestamp <= listing.endTime, "Listing expired");
        require(amount >= listing.minPurchaseAmount, "Below min purchase");
        require(amount <= listing.maxPurchaseAmount, "Above max purchase");
        require(amount <= listing.amount, "Insufficient amount");
        require(msg.sender != listing.producer, "Cannot buy your own energy");
        // require(producers[msg.sender].isVerified, "Buyer not verified");
        
        uint256 totalPrice = amount * listing.pricePerUnit;
        
        // Transfer tokens from buyer to contract
        energyToken.safeTransferFrom(msg.sender, address(this), totalPrice);
        
        // Update listing
        listing.amount -= amount;
        
        if (listing.amount == 0) {
            listing.status = ListingStatus.Fulfilled;
        }
        
        // Create trade
        _tradeIdCounter++;
        uint256 tradeId = _tradeIdCounter;
        
        trades[tradeId] = Trade({
            id: tradeId,
            listingId: listingId,
            buyer: msg.sender,
            producer: listing.producer,
            amount: amount,
            totalPrice: totalPrice,
            tradeTimestamp: block.timestamp,
            status: TradeStatus.Pending,
            meterReadingBefore: 0,
            meterReadingAfter: 0,
            isBuyerConfirmed: false,
            isProducerConfirmed: false,
            disputeDeadline: block.timestamp + confirmationPeriod,
            disputeId: 0
        });
        
        userTrades[msg.sender].push(tradeId);
        userTrades[listing.producer].push(tradeId);
        listingTrades[listingId].push(tradeId);
        
        emit TradeCreated(tradeId, listingId, msg.sender, listing.producer, amount, totalPrice);
    }

    /**
     *  @dev DEPRECATED: Previously used by the buyer to manually confirm delivery.
     *   Now replaced by automated meter-based verification (off-chain).
     * @dev Confirm energy delivery (called by buyer) 
     * note not needed, bcz I changed the control from manual buyer saler to automated meter reading
     */
    function confirmDelivery(uint256 tradeId) external whenNotPaused {
        Trade storage trade = trades[tradeId];
        require(trade.buyer == msg.sender, "Only buyer can confirm");
        require(trade.status == TradeStatus.Pending, "Trade not pending");
        require(!trade.isBuyerConfirmed, "Already confirmed");
        
        trade.isBuyerConfirmed = true;
        
        if (trade.isProducerConfirmed) {
            _completeTrade(tradeId);
        } else {
            emit TradeConfirmed(tradeId, msg.sender, true);
        }
    }

    /**
     * @dev DEPRECATED: Previously used by the seller to manually confirm payment.
     *   Now replaced by automated meter-based verification (off-chain).
     * @dev Confirm receipt of payment (called by producer)
     */
    function confirmPayment(uint256 tradeId) external whenNotPaused {
        Trade storage trade = trades[tradeId];
        require(trade.producer == msg.sender, "Only producer can confirm");
        require(trade.status == TradeStatus.Pending, "Trade not pending");
        require(!trade.isProducerConfirmed, "Already confirmed");
        
        trade.isProducerConfirmed = true;
        
        if (trade.isBuyerConfirmed) {
            _completeTrade(tradeId);
        } else {
            emit TradeConfirmed(tradeId, msg.sender, false);
        }
    }

    /**
     * @dev Complete trade and release funds
     */
    function _completeTrade(uint256 tradeId) internal {
        Trade storage trade = trades[tradeId];
        require(trade.status == TradeStatus.Pending, "Trade not pending");
        
        // Calculate fees
        uint256 totalPrice = trade.totalPrice;
        uint256 feeAmount = (totalPrice * feeConfig.platformFeePercent) / 10000;
        
        if (feeAmount < feeConfig.minFee) {
            feeAmount = feeConfig.minFee;
        } else if (feeAmount > feeConfig.maxFee) {
            feeAmount = feeConfig.maxFee;
        }
        
        uint256 producerPayout = totalPrice - feeAmount;
        
        // Transfer funds
        energyToken.safeTransfer(trade.producer, producerPayout);
        energyToken.safeTransfer(feeConfig.feeCollector, feeAmount);
        
        // Update producer stats
        Producer storage producer = producers[trade.producer];
        producer.totalTrades++;
        producer.totalEnergySold += trade.amount;
        
        // Update trade status
        trade.status = TradeStatus.Completed;
        
        emit TradeCompleted(tradeId, feeAmount, producerPayout);
    }

    /**
     * @dev Raise a dispute for a trade
     */
    function raiseDispute(
        uint256 tradeId,
        string memory reason,
        string memory evidence
    ) external whenNotPaused {
        Trade storage trade = trades[tradeId];
        require(msg.sender == trade.buyer || msg.sender == trade.producer, "Not party to trade");
        // require(trade.status == TradeStatus.Pending, "Trade not pending");
        require(
            trade.status == TradeStatus.Pending || trade.status == TradeStatus.Verified, 
            "Trade already finalized"
        );
        require(block.timestamp <= trade.disputeDeadline, "Dispute period expired");
        require(trade.disputeId == 0, "Dispute already raised");
        
        _disputeIdCounter++;
        uint256 disputeId = _disputeIdCounter;
        
        disputes[disputeId] = Dispute({
            id: disputeId,
            tradeId: tradeId,
            initiator: msg.sender,
            reason: reason,
            evidence: evidence,
            status: DisputeStatus.Open,
            createdAt: block.timestamp,
            resolvedAt: 0,
            arbitrator: address(0),
            resolution: ""
        });
        
        trade.status = TradeStatus.Disputed;
        trade.disputeId = disputeId;
        
        emit DisputeRaised(disputeId, tradeId, msg.sender, reason);
    }

    /**
     * @dev Assign arbitrator to dispute (only admin)
     */
    function assignArbitrator(
        uint256 disputeId,
        address arbitrator
    ) external onlyRole(ADMIN_ROLE) {
        require(hasRole(ARBITRATOR_ROLE, arbitrator), "Not an arbitrator");
        
        Dispute storage dispute = disputes[disputeId];
        require(dispute.status == DisputeStatus.Open, "Dispute not open");
        require(dispute.arbitrator == address(0), "Arbitrator already assigned");
        
        dispute.arbitrator = arbitrator;
        dispute.status = DisputeStatus.InArbitration;
    }

    /**
     * @dev Resolve dispute (only arbitrator)
     */
    function resolveDispute(
        uint256 disputeId,
        bool inFavorOfBuyer,
        string memory resolution
    ) external {
        Dispute storage dispute = disputes[disputeId];
        require(msg.sender == dispute.arbitrator, "Not assigned arbitrator");
        require(dispute.status == DisputeStatus.InArbitration, "Dispute not in arbitration");
        
        Trade storage trade = trades[dispute.tradeId];
        
        if (inFavorOfBuyer) {
            // Refund buyer
            energyToken.safeTransfer(trade.buyer, trade.totalPrice);
            trade.status = TradeStatus.Cancelled;
        } else {
            // Pay producer
            energyToken.safeTransfer(trade.producer, trade.totalPrice);
            trade.status = TradeStatus.Completed;
        }
        
        dispute.status = DisputeStatus.Resolved;
        dispute.resolvedAt = block.timestamp;
        dispute.resolution = resolution;
        
        emit DisputeResolved(disputeId, DisputeStatus.Resolved, resolution);
    }

    /**
     * @dev Report meter reading (only meter reader role)
     */
    function reportMeterReading(
        uint256 tradeId,
        uint256 readingBefore,
        uint256 readingAfter
    ) external onlyRole(METER_READER_ROLE) {
        Trade storage trade = trades[tradeId];
        require(trade.status == TradeStatus.Pending, "Trade not pending");
        // require(trade.status != TradeStatus.Disputed, "Trade is in dispute");
        require(readingAfter >= readingBefore, "Invalid meter data: After reading lower than before");
        
        trade.meterReadingBefore = readingBefore;
        trade.meterReadingAfter = readingAfter;
        
        uint256 actualConsumption = readingAfter - readingBefore;
        
        // Validate consumption matches purchased amount (within 5% tolerance)
        uint256 tolerance = (trade.amount * 5) / 100;
        require(
            actualConsumption >= trade.amount - tolerance &&
            actualConsumption <= trade.amount + tolerance,
            "Meter reading mismatch"
        );
        trade.status = TradeStatus.Verified;
        trade.disputeDeadline = block.timestamp + 24 hours;
    }


    /**
     * @dev option for producer to claim payment after meter verification and dispute period
     * note only can be called by the specified producer, and only if the trade is completed and not under dispute
     */
    function claimPayment(uint256 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        require(msg.sender == trade.producer, "Only producer can claim");
        require(trade.status == TradeStatus.Verified, "Trade not verified by meter");
        require(block.timestamp >= trade.disputeDeadline, "Dispute window still open");
        require(trade.disputeId == 0 && trade.status != TradeStatus.Disputed, "Trade is blocked by an active dispute");

        _completeTrade(tradeId);
    }

    /**
     * @dev Update fee configuration (only admin)
     */
    function updateFeeConfig(
        uint256 platformFeePercent,
        uint256 minFee,
        uint256 maxFee
    ) external onlyRole(ADMIN_ROLE) {
        require(platformFeePercent <= 1000, "Fee too high"); // Max 10%
        
        feeConfig.platformFeePercent = platformFeePercent;
        feeConfig.minFee = minFee;
        feeConfig.maxFee = maxFee;
        
        emit FeeConfigUpdated(platformFeePercent, minFee, maxFee);
    }

    /**
     * @dev Update fee collector (only admin)
     */
    function updateFeeCollector(address newCollector) external onlyRole(ADMIN_ROLE) {
        require(newCollector != address(0), "Invalid address");
        feeConfig.feeCollector = newCollector;
    }

    /**
     * @dev Update confirmation period (only admin)
     */
    function updateConfirmationPeriod(uint256 newPeriod) external onlyRole(ADMIN_ROLE) {
        require(newPeriod > 0, "Period must be positive");
        confirmationPeriod = newPeriod;
    }


    /**
     * @dev Refund expired trade (only admin or buyer)
    */
    function refundExpiredTrade(uint256 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        require(trade.status == TradeStatus.Pending, "Trade not in pending state");
        require(block.timestamp > trade.disputeDeadline, "Delivery window hasn't expired yet");
        require(msg.sender == trade.buyer || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");

        trade.status = TradeStatus.Cancelled;
        energyToken.safeTransfer(trade.buyer, trade.totalPrice);
    }


    /**
     * @dev Pause marketplace (only admin)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause marketplace (only admin)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Withdraw stuck tokens (only admin, emergency)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(token != address(energyToken), "Cannot withdraw platform token");
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * @dev Get all listings for a producer
     */
    function getProducerListings(address producer) external view returns (uint256[] memory) {
        return userListings[producer];
    }

    /**
     * @dev Get all trades for a user
     */
    function getUserTrades(address user) external view returns (uint256[] memory) {
        return userTrades[user];
    }

    /**
     * @dev Get listing trades
     */
    function getListingTrades(uint256 listingId) external view returns (uint256[] memory) {
        return listingTrades[listingId];
    }

    /**
     * @dev DEPRECATED
     * @dev Get active listings
     */
    function getActiveListings() external view returns (EnergyListing[] memory) {
        uint256 total = _listingIdCounter;
        uint256 activeCount = 0;
        
        // Count active listings
        for (uint256 i = 1; i <= total; i++) {
            if (listings[i].status == ListingStatus.Active) {
                activeCount++;
            }
        }
        
        EnergyListing[] memory activeListings = new EnergyListing[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= total; i++) {
            if (listings[i].status == ListingStatus.Active) {
                activeListings[index] = listings[i];
                index++;
            }
        }
        
        return activeListings;
    }

    function getListingCount() public view returns (uint256) {
        return _listingIdCounter;
    }   

    function getTradeCount() public view returns (uint256) {
        return _tradeIdCounter;
    }

    function getDisputeCount() public view returns (uint256) {
        return _disputeIdCounter;
    }


}