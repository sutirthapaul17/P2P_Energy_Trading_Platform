// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {EnergyToken} from "src/EnergyToken.sol";

contract DeployEnergyToken is Script {
    EnergyToken public token;
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("SEPOLIA_PRIVATE_KEY");  //account 9
        address deployer = vm.addr(deployerPrivateKey);
        uint256 defaultSupply = 10_000_000 * 10**18;



        // Token parameters
        string memory tokenName = vm.envOr("TOKEN_NAME", string("P2P Energy Token"));
        string memory tokenSymbol = vm.envOr("TOKEN_SYMBOL", string("ENERGY"));
        uint256 initialSupply = defaultSupply; // 10 million tokens with 18 decimals
        
        console.log("Deploying EnergyToken...");
        console.log("Deployer:", deployer);
        console.log("Token Name:", tokenName);
        console.log("Token Symbol:", tokenSymbol);
        console.log("Initial Supply:", initialSupply / 10**18, "tokens");
        
        vm.startBroadcast(deployerPrivateKey);
        
        token = new EnergyToken(
            tokenName,
            tokenSymbol,
            deployer,
            initialSupply
        );
        
        vm.stopBroadcast();
        
        console.log("EnergyToken deployed at:", address(token));
        
        // Save address to file
        string memory output = string.concat("TOKEN_ADDRESS=", vm.toString(address(token)));
        vm.writeFile(".env.deployed", output);
    }
}