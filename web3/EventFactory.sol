// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventImplementation.sol";

contract EventFactory {
    address public platformOwner;
    EventImplementation[] public events;

    event EventCreated(address indexed eventAddress, string name);

    constructor() {
        platformOwner = msg.sender;
    }

    function createEvent(string memory name, EventImplementation.EventType EventType, uint256 ticketPrice) external {

        EventImplementation newEvent = new EventImplementation(
            name,
            EventType,
            ticketPrice,
            msg.sender, 
            platformOwner
        );
        events.push(newEvent);
        emit EventCreated(address(newEvent), name);
    }

    function getAllEvents() external view returns (EventImplementation[] memory) {
        return events;
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 122)
        );
        require(_success, "FeeM registration failed");
    }
}

//0x9016F1b7DA5C91d6479aAF99A8765Cb4ED0668bE