// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEventChainEventManagerContract {
    struct Event {
        string name;
        string location;
        string date;
        uint256 ticketPrice;
        address organizer;
        bool isPaid;           
        uint256 totalSupply;   
        uint256 mintedTickets; 
        bool isActive;         
    }

    function createEvent(string memory name, string memory location, string memory date, uint256 ticketPrice) external;
    function getEventDetails(uint256 eventId) external view returns (Event memory);
    function mintTicket(uint256 eventId, address to, string memory uri, uint256 endDate) external payable;
    function transferEvent(uint256 eventId, address to) external;

    event EventCreated(uint256 indexed eventId, string name, string location, string date, uint256 ticketPrice, address indexed organizer);
    event EventTransferred(uint256 indexed eventId, address indexed fromOrganizer, address indexed toOrganizer);
}
