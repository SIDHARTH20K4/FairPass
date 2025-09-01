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
        platformOwner
    );
    events.push(newEvent);
    emit EventCreated(address(newEvent), name);
}

    function getAllEvents() external view returns (EventImplementation[] memory) {
        return events;
    }
}