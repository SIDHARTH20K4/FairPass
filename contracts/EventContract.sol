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
        uint64 attendanceScore; // New: track attendance quality
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

    constructor(address contractOwner) ERC721("EventChainTickets", "ECT") {
        require(contractOwner != address(0), "Invalid owner address");
        _transferOwnership(contractOwner);
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

        // Initialize ticket record
        ticketRecords[newTicketId] = TicketInfo({
            eventInfo: eventDetails,
            basePrice: originalPrice,
            eventStart: eventStart,
            pastOwners: new address[](0), // Fixed syntax
            usedStatus: false,
            attendanceScore: 0
        });

        // Add initial owner to history
        ticketRecords[newTicketId].pastOwners.push(to);
        
        // Set default max transfers
        maxTransfers[newTicketId] = defaultMaxTransfers;

        emit TicketMinted(newTicketId, to, eventDetails, originalPrice, eventStart);
    }

    function validateTicket(uint256 ticketId) public override {
        require(_exists(ticketId), "Nonexistent ticket");
        require(ownerOf(ticketId) == msg.sender, "Not authorized");
        require(!ticketRecords[ticketId].usedStatus, "Ticket already used");
        
        // Allow validation from event start until 1 day after
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
        require(_exists(ticketId), "Nonexistent ticket");
        return ticketRecords[ticketId].pastOwners;
    }

    function updateTicketMetadata(
        uint256 tokenId,
        string memory newEventDetails,
        string memory newURI
    ) external override onlyOwner {
        require(_exists(tokenId), "Nonexistent ticket");
        ticketRecords[tokenId].eventInfo = newEventDetails;
        _setTokenURI(tokenId, newURI);
        emit TicketMetadataUpdated(tokenId, newEventDetails, newURI);
    }

    function setMaxResalePrice(uint256 tokenId, uint256 maxPrice) external override onlyOwner {
        require(_exists(tokenId), "Nonexistent ticket");
        resalePriceLimit[tokenId] = maxPrice;
        emit TicketMaxResalePriceSet(tokenId, maxPrice);
    }

    // Enhanced: Burn tickets that weren't used/validated
    function burnExpiredTickets(uint256 tokenId) external override onlyOwner {
        require(_exists(tokenId), "Nonexistent ticket");
        
        uint64 eventStart = ticketRecords[tokenId].eventStart;
        require(
            block.timestamp > uint256(eventStart) + 5 minutes,
            "Ticket still valid"
        );
        
        // Burn if ticket wasn't validated (no-show)
        require(!ticketRecords[tokenId].usedStatus, "Ticket was validated");
        
        _burn(tokenId);
        emit TicketExpired(tokenId);
    }

    function transferWithHistoryUpdate(
        address from,
        address to,
        uint256 tokenId
    ) external override onlyOwner {
        require(_exists(tokenId), "Nonexistent ticket");
        require(from != address(0) && to != address(0), "Invalid address");
        require(from == ownerOf(tokenId), "Not token owner");
        
        // Prevent transfers after check-in
        require(!checkedIn[tokenId], "Cannot transfer after check-in");

        _transfer(from, to, tokenId);
        emit TicketTransferred(tokenId, from, to);
    }

    // Track attendance quality (called by external attendance system)
    function updateAttendanceScore(uint256 tokenId, uint64 score) external onlyOwner {
        require(_exists(tokenId), "Nonexistent ticket");
        require(checkedIn[tokenId], "Ticket not checked in");
        ticketRecords[tokenId].attendanceScore = score;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        if (from != address(0) && to != address(0)) {
            uint8 cap = maxTransfers[tokenId];
            require(cap > 0, "Transfers disabled for this token");
            require(transferCount[tokenId] < cap, "Transfer cap reached");
            
            // Prevent transfers during or after event
            uint64 eventStart = ticketRecords[tokenId].eventStart;
            require(block.timestamp < uint256(eventStart), "Cannot transfer after event starts");
            
            transferCount[tokenId] += 1;
        }
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721) {
        super._afterTokenTransfer(from, to, tokenId, batchSize);
        
        // Only update history for actual transfers (not mints)
        if (from != address(0) && to != address(0)) {
            ticketRecords[tokenId].pastOwners.push(to);
        }
    }

    // Enhanced burn with cleanup
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        
        // Clean up all mappings
        delete ticketRecords[tokenId];
        delete resalePriceLimit[tokenId];
        delete transferCount[tokenId];
        delete maxTransfers[tokenId];
        delete checkedIn[tokenId];
        delete checkInTime[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Disable marketplace functionality
    function approve(address to, uint256 tokenId) public override(ERC721) {
        revert("Approvals disabled");
    }

    function setApprovalForAll(address operator, bool approved) public override(ERC721) {
        revert("Approvals disabled");
    }

    // View functions for attendance data
    function getTicketInfo(uint256 tokenId) external view returns (
        string memory eventInfo,
        uint256 basePrice,
        uint64 eventStart,
        bool usedStatus,
        uint64 attendanceScore,
        uint8 transfersUsed,
        uint8 maxTransfersAllowed
    ) {
        require(_exists(tokenId), "Nonexistent ticket");
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
}
