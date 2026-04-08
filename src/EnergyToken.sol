// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title EnergyToken
 * @dev ERC20 Token for P2P Energy Trading Platform
 * Features: Mintable, Burnable, Pausable, Permit (gasless approvals)
 */
contract EnergyToken is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    AccessControl,
    ERC20Permit
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");

    mapping(address => bool) private _blacklisted;

    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        uint256 initialSupply
    ) ERC20(name, symbol) ERC20Permit(name) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
        _grantRole(BLACKLISTER_ROLE, initialOwner);

        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }

    /**
     * @dev Mint new tokens (only minter role)
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Pause all token transfers (only pauser role)
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Add address to blacklist (only blacklister role)
     */
    function blacklist(address account) public onlyRole(BLACKLISTER_ROLE) {
        require(account != address(0), "Cannot blacklist zero address");
        require(!_blacklisted[account], "Already blacklisted");
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @dev Remove address from blacklist
     */
    function unblacklist(address account) public onlyRole(BLACKLISTER_ROLE) {
        require(_blacklisted[account], "Not blacklisted");
        _blacklisted[account] = false;
        emit Unblacklisted(account);
    }

    /**
     * @dev Check if address is blacklisted
     */
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklisted[account];
    }

    /**
     * @dev Add minter role
     */
    function addMinter(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
        emit MinterAdded(account);
    }

    /**
     * @dev Remove minter role
     */
    function removeMinter(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
        emit MinterRemoved(account);
    }

    // /**
    //  * @dev Hook to validate transfers
    //  */
    // function _beforeTokenTransfer(
    //     address from,
    //     address to,
    //     uint256 amount
    // ) internal override(ERC20, ERC20Pausable) {
    //     require(!_blacklisted[from], "Sender is blacklisted");
    //     require(!_blacklisted[to], "Recipient is blacklisted");
    //     super._beforeTokenTransfer(from, to, amount);
    // }

    /**
     * @dev Unified update function for OZ v5 (replaces _beforeTokenTransfer)
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        // Blacklist logic: allow minting (from == 0) and burning (to == 0)
        // but block transfers involving blacklisted accounts.
        if (from != address(0)) {
            require(!_blacklisted[from], "Sender is blacklisted");
        }
        if (to != address(0)) {
            require(!_blacklisted[to], "Recipient is blacklisted");
        }

        // This call handles the actual transfer and the Pausable check
        super._update(from, to, value);
    }

    /**
     * @dev Required to resolve conflict between AccessControl and ERC20
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
