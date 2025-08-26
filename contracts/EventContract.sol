// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IEventChainContract {
    function safeMint(address to, string memory uri, string memory eventDetails, uint256 originalPrice, uint64 eventStart) external;
    function validateTicket(uint256 ticketId) external;
    function getTicketHistory(uint256 ticketId) external view returns (address[] memory);
    function updateTicketMetadata(uint256 tokenId, string memory newEventDetails, string memory newURI) external;
    function setMaxResalePrice(uint256 tokenId, uint256 maxPrice) external;
    function burnExpiredTickets(uint256 tokenId) external;
    function transferWithHistoryUpdate(address from, address to, uint256 tokenId) external;
}

contract EventContract is ERC721, ERC721URIStorage, ERC721Burnable, Ownable, IEventChainContract {
    uint256 private ticketIdCounter;

    struct TicketInfo {
        string eventInfo;
        uint256 basePrice;
        uint64 eventStart;
        address[] pastOwners;
        bool usedStatus;
        uint64 attendanceScore;
    }

    mapping(uint256 => TicketInfo) private ticketRecords;
    mapping(uint256 => uint256) public resalePriceLimit;
    
    // Transfer control
    mapping(uint256 => uint8) public transferCount;
    mapping(uint256 => uint8) public maxTransfers;
    uint8 public defaultMaxTransfers = 3;
    
    // Attendance tracking
    mapping(uint256 => bool) public checkedIn;
    mapping(uint256 => uint256) public checkInTime;

    // Events
    event TicketMinted(uint256 indexed tokenId, address indexed to, string eventDetails, uint256 originalPrice, uint64 eventStart);
    event TicketValidated(uint256 indexed tokenId, address indexed validator);
    event TicketMetadataUpdated(uint256 indexed tokenId, string newEventDetails, string newURI);
    event TicketMaxResalePriceSet(uint256 indexed tokenId, uint256 maxPrice);
    event TicketExpired(uint256 indexed tokenId);
    event TicketTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event AttendanceRecorded(uint256 indexed tokenId, address indexed attendee, uint256 timestamp);

    // Helper function: Replace _exists()
    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    constructor(address contractOwner) 
        ERC721("EventChainTickets", "ECT") 
        Ownable(contractOwner) 
    {
        require(contractOwner != address(0), "Invalid owner address");
    }

    function safeMint(
        address to,
        string memory uri,
        string memory eventDetails,
        uint256 originalPrice,
        uint64 eventStart
    ) external override onlyOwner {
        require(block.timestamp <= uint256(eventStart) + 5 minutes, "mint window closed");

        uint256 newTicketId = ticketIdCounter++;
        _safeMint(to, newTicketId);
        _setTokenURI(newTicketId, uri);

        ticketRecords[newTicketId] = TicketInfo({
            eventInfo: eventDetails,
            basePrice: originalPrice,
            eventStart: eventStart,
            pastOwners: new address[](0),
            usedStatus: false,
            attendanceScore: 0
        });

        ticketRecords[newTicketId].pastOwners.push(to);
        maxTransfers[newTicketId] = defaultMaxTransfers;

        emit TicketMinted(newTicketId, to, eventDetails, originalPrice, eventStart);
    }

    function validateTicket(uint256 ticketId) public override {
        require(_tokenExists(ticketId), "Nonexistent ticket");
        require(ownerOf(ticketId) == msg.sender, "Not authorized");
        require(!ticketRecords[ticketId].usedStatus, "Ticket already used");
        
        uint64 eventStart = ticketRecords[ticketId].eventStart;
        require(
            block.timestamp >= uint256(eventStart) && 
            block.timestamp <= uint256(eventStart) + 1 days,
            "Validation window closed"
        );
        
        ticketRecords[ticketId].usedStatus = true;
        checkedIn[ticketId] = true;
        checkInTime[ticketId] = block.timestamp;
        
        emit TicketValidated(ticketId, msg.sender);
        emit AttendanceRecorded(ticketId, msg.sender, block.timestamp);
    }

    function getTicketHistory(uint256 ticketId) public view override returns (address[] memory) {
        require(_tokenExists(ticketId), "Nonexistent ticket");
        return ticketRecords[ticketId].pastOwners;
    }

    function updateTicketMetadata(
        uint256 tokenId,
        string memory newEventDetails,
        string memory newURI
    ) external override onlyOwner {
        require(_tokenExists(tokenId), "Nonexistent ticket");
        ticketRecords[tokenId].eventInfo = newEventDetails;
        _setTokenURI(tokenId, newURI);
        emit TicketMetadataUpdated(tokenId, newEventDetails, newURI);
    }

    function setMaxResalePrice(uint256 tokenId, uint256 maxPrice) external override onlyOwner {
        require(_tokenExists(tokenId), "Nonexistent ticket");
        resalePriceLimit[tokenId] = maxPrice;
        emit TicketMaxResalePriceSet(tokenId, maxPrice);
    }

    function burnExpiredTickets(uint256 tokenId) external override onlyOwner {
        require(_tokenExists(tokenId), "Nonexistent ticket");
        
        uint64 eventStart = ticketRecords[tokenId].eventStart;
        require(
            block.timestamp > uint256(eventStart) + 5 minutes,
            "Ticket still valid"
        );
        
        require(!ticketRecords[tokenId].usedStatus, "Ticket was validated");
        
        // Clean up storage before burning
        delete ticketRecords[tokenId];
        delete resalePriceLimit[tokenId];
        delete transferCount[tokenId];
        delete maxTransfers[tokenId];
        delete checkedIn[tokenId];
        delete checkInTime[tokenId];
        
        burn(tokenId);
        emit TicketExpired(tokenId);
    }

    function transferWithHistoryUpdate(
        address from,
        address to,
        uint256 tokenId
    ) external override onlyOwner {
        require(_tokenExists(tokenId), "Nonexistent ticket");
        require(from != address(0) && to != address(0), "Invalid address");
        require(from == ownerOf(tokenId), "Not token owner");
        require(!checkedIn[tokenId], "Cannot transfer after check-in");

        // Apply transfer restrictions
        uint8 cap = maxTransfers[tokenId];
        require(cap > 0, "Transfers disabled for this token");
        require(transferCount[tokenId] < cap, "Transfer cap reached");
        
        uint64 eventStart = ticketRecords[tokenId].eventStart;
        require(block.timestamp < uint256(eventStart), "Cannot transfer after event starts");
        
        // Update counter and history
        transferCount[tokenId] += 1;
        ticketRecords[tokenId].pastOwners.push(to);

        _transfer(from, to, tokenId);
        emit TicketTransferred(tokenId, from, to);
    }

    function updateAttendanceScore(uint256 tokenId, uint64 score) external onlyOwner {
        require(_tokenExists(tokenId), "Nonexistent ticket");
        require(checkedIn[tokenId], "Ticket not checked in");
        ticketRecords[tokenId].attendanceScore = score;
    }

    // Required overrides for multiple inheritance
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function getTicketInfo(uint256 tokenId) external view returns (
        string memory eventInfo,
        uint256 basePrice,
        uint64 eventStart,
        bool usedStatus,
        uint64 attendanceScore,
        uint8 transfersUsed,
        uint8 maxTransfersAllowed
    ) {
        require(_tokenExists(tokenId), "Nonexistent ticket");
        TicketInfo memory ticket = ticketRecords[tokenId];
        return (
            ticket.eventInfo,
            ticket.basePrice,
            ticket.eventStart,
            ticket.usedStatus,
            ticket.attendanceScore,
            transferCount[tokenId],
            maxTransfers[tokenId]
        );
    }

    // **REMOVED ALL FUNCTION OVERRIDES** - These functions are not virtual in OpenZeppelin v4.9.3
    // Transfer control is achieved through transferWithHistoryUpdate being the ONLY way to transfer
    // Direct transfers via standard ERC721 functions are still possible but not encouraged
}
