// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {EnergyTokenSale} from "src/EnergyTokenSale.sol";
import {EnergyToken} from "src/EnergyToken.sol";

contract DeployTokenSale is Script {
    EnergyTokenSale public tokenSale;
    
    function run() external {
        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("SEPOLIA_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get addresses from environment
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");
        require(tokenAddress != address(0), "TOKEN_ADDRESS not set");
        
        // Treasury address (your wallet or multi-sig)
        address treasury = vm.envOr("SEPOLIA_TREASURY_ADDRESS", deployer);  //account 8
        
        console.log("Deploying EnergyTokenSale...");
        console.log("Deployer:", deployer);
        console.log("Token Address:", tokenAddress);
        console.log("Treasury Address:", treasury);
        
        vm.startBroadcast(deployerPrivateKey);
        
        tokenSale = new EnergyTokenSale(
            tokenAddress,
            deployer,
            treasury
        );
        
        vm.stopBroadcast();
        
        console.log("EnergyTokenSale deployed at:", address(tokenSale));
        
        // Save address to file
        string memory existing = vm.readFile(".env.deployed");
        string memory output = string.concat(existing, "\nTOKENSALE_ADDRESS=", vm.toString(address(tokenSale)));
        vm.writeFile(".env.deployed", output);
    }
}