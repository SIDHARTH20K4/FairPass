// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {EventFactory} from "../EventFactory.sol";

contract DeploySonicTestnet is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts to Sonic Testnet with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy EventFactory
        EventFactory eventFactory = new EventFactory();
        console.log("EventFactory deployed to:", address(eventFactory));

        vm.stopBroadcast();

        console.log("Deployment completed on Sonic Testnet!");
        console.log("EventFactory address:", address(eventFactory));
        console.log("Add this to your .env file:");
        console.log("NEXT_PUBLIC_EVENT_FACTORY_ADDRESS=", address(eventFactory));
        console.log("View on Sonic Explorer: https://testnet.sonicscan.org/address/", address(eventFactory));
    }
}
