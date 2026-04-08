// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import {EnergyToken} from "../src/EnergyToken.sol";
import {EnergyTokenSale} from "../src/EnergyTokenSale.sol";

contract ApproveTokenSale is Script {
    function run() external {
        uint256 treasuryPrivateKey = vm.envUint("SEPOLIA_TREASURY_PRIVATE_KEY");
        address treasury = vm.addr(treasuryPrivateKey);
        
        address tokenAddr = vm.envAddress("TOKEN_ADDRESS");
        address payable tokenSaleAddr = payable(vm.envAddress("TOKENSALE_ADDRESS"));


        EnergyToken token = EnergyToken(tokenAddr);
        
        console.log("Approving TokenSale from treasury:", treasury);
        
        vm.startBroadcast(treasuryPrivateKey);
        
        // Approve TokenSale to pull up to 5 million tokens
        uint256 approveAmount = 5_000_000 * 10**18;
        token.approve(tokenSaleAddr, approveAmount);
        
        console.log("Approved TokenSale to pull", approveAmount / 10**18, "tokens");
        
        vm.stopBroadcast();
    }
}