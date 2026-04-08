// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {EnergyMarketplace} from "src/EnergyMarketplace.sol";
import {EnergyToken} from "src/EnergyToken.sol";

contract DeployMarketplace is Script {
    EnergyMarketplace public marketplace;
    
    function run() external {
        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("SEPOLIA_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get token address from environment
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");
        require(tokenAddress != address(0), "TOKEN_ADDRESS not set");
        
        console.log("Deploying EnergyMarketplace...");
        console.log("Deployer:", deployer);
        console.log("Token Address:", tokenAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        marketplace = new EnergyMarketplace(
            tokenAddress,
            deployer
        );
        
        vm.stopBroadcast();
        
        console.log("EnergyMarketplace deployed at:", address(marketplace));
        
        // Save address to file
        string memory existing = vm.readFile(".env.deployed");
        string memory output = string.concat(existing, "\nMARKETPLACE_ADDRESS=", vm.toString(address(marketplace)));
        vm.writeFile(".env.deployed", output);
    }
}