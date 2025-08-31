// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventTicket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventImplementation is Ownable {
    string public eventName;
    enum EventType { FREE, PAID, APPROVAL }
    EventType public eventType;

    uint256 public ticketPrice;
    EventTicket public ticketNFT;

    constructor(
        string memory _name,
        EventType _eventType,
        uint256 _ticketPrice,
        address _platformOwner
    ) Ownable(msg.sender){
        eventName = _name;
        eventType = _eventType;
        ticketPrice = _ticketPrice;

        // Deploy fresh ticket NFT for this event
        ticketNFT = new EventTicket(
            string(abi.encodePacked(_name, " Ticket")),
            "EVT",
            address(this),        // event owner
            _platformOwner     // platform owner for fees
        );

        _transferOwnership(msg.sender); // set event organizer as owner
    }

    /// Mint ticket (free or paid, not approval-based)
    function buyTicket() external payable {
    if (eventType == EventType.FREE) {
        ticketNFT.mint(msg.sender);
    } else if (eventType == EventType.PAID) {
        require(msg.value >= ticketPrice, "Not enough ETH");
        ticketNFT.mint(msg.sender);
    } else {
        revert("Approval-based: organizer must mint");
    }
}


    /// Organizer mints tickets for approval-based events
    function mintForUser(address user) external onlyOwner {
        require(eventType == EventType.APPROVAL, "Not approval event");
        ticketNFT.mint(user);
    }

    /// Organizer burns ticket on check-in
    function checkIn(uint256 tokenId) external onlyOwner {
        ticketNFT.burnTicket(tokenId);
    }
}