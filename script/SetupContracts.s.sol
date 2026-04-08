// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {EnergyToken} from "src/EnergyToken.sol";
import {EnergyMarketplace} from "src/EnergyMarketplace.sol";
import {EnergyTokenSale} from "src/EnergyTokenSale.sol";

contract SetupContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("SEPOLIA_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address tokenAddr = vm.envAddress("TOKEN_ADDRESS");
        address marketplaceAddr = vm.envAddress("MARKETPLACE_ADDRESS");
        address payable tokenSaleAddr = payable(vm.envAddress("TOKENSALE_ADDRESS"));
        
        // Read from .env
        address treasury = vm.envAddress("SEPOLIA_TREASURY_ADDRESS");
        
        EnergyToken token = EnergyToken(tokenAddr);
        EnergyMarketplace marketplace = EnergyMarketplace(marketplaceAddr);
        EnergyTokenSale tokenSale = EnergyTokenSale(tokenSaleAddr);
        
        console.log("Setting up contracts...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        uint256 treasuryTokens = 5_000_000 * 10**18;
        token.transfer(treasury, treasuryTokens);
        console.log("Transferred", treasuryTokens / 10**18, "tokens to treasury");
        
        uint256 tokenPrice = vm.envOr("TOKEN_PRICE", uint256(0.001 * 10**18)); // 0.001 ETH per token
        tokenSale.setTokenPrice(tokenPrice);
        console.log("Set token price to:", tokenPrice, "wei per token");
        
        marketplace.updateFeeConfig(
            100,        // 1% fee
            10 * 10**18,  // Min fee: 10 tokens
            1000 * 10**18 // Max fee: 1000 tokens
        );
        console.log("Configured marketplace fees");
        
        vm.stopBroadcast();
        
        console.log("Setup complete!");
    }
}