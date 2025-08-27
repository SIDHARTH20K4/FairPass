// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEventChainContract {
    function safeMint(address to, string memory uri, string memory eventDetails, uint256 originalPrice, uint64 eventStart) external;
    function validateTicket(uint256 ticketId) external;
    function getTicketHistory(uint256 ticketId) external view returns (address[] memory);
    function updateTicketMetadata(uint256 tokenId, string memory newEventDetails, string memory newURI) external;
    function setMaxResalePrice(uint256 tokenId, uint256 maxPrice) external;
    function burnExpiredTickets(uint256 tokenId) external;
    function transferWithHistoryUpdate(address from, address to, uint256 tokenId) external;
    function updateAttendanceScore(uint256 tokenId, uint64 score) external;
    
    function getTicketInfo(uint256 tokenId) external view returns (
        string memory eventInfo,
        uint256 basePrice,
        uint64 eventStart,
        bool usedStatus,
        uint64 attendanceScore,
        uint8 transfersUsed,
        uint8 maxTransfersAllowed
    );
    
    // Events
    event TicketMinted(uint256 indexed tokenId, address indexed to, string eventDetails, uint256 originalPrice, uint64 eventStart);
    event TicketValidated(uint256 indexed tokenId, address indexed validator);
    event TicketMetadataUpdated(uint256 indexed tokenId, string newEventDetails, string newURI);
    event TicketMaxResalePriceSet(uint256 indexed tokenId, uint256 maxPrice);
    event TicketExpired(uint256 indexed tokenId);
    event TicketTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event AttendanceRecorded(uint256 indexed tokenId, address indexed attendee, uint256 timestamp);
}
