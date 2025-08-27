// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FreeEventTickets
 * @dev Handles NFT tickets for free events - no payment processing
 */
contract FreeEventTickets is ERC721, ERC721URIStorage, ERC721Burnable, AccessControl {
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    
    uint256 private ticketIdCounter;
    
    struct TicketInfo {
        uint256 eventId;
        string eventInfo;
        uint64 eventStart;
        address[] pastOwners;
        bool usedStatus;
        uint64 attendanceScore;
        uint8 transferCount;
        uint8 maxTransfers;
    }
    
    mapping(uint256 => TicketInfo) private ticketRecords;
    mapping(uint256 => bool) public checkedIn;
    mapping(uint256 => uint256) public checkInTime;
    
    event TicketMinted(uint256 indexed tokenId, address indexed to, uint256 indexed eventId, string uri);
    event AttendanceRecorded(uint256 indexed tokenId, address indexed attendee, uint256 timestamp);
    event TicketValidated(uint256 indexed tokenId, address indexed validator);

    constructor() ERC721("FreeEventTickets", "FET") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a single free ticket
     */
    function mintTicket(
        address to,
        uint256 eventId,
        string memory uri,
        string memory eventInfo,
        uint64 eventStart,
        uint8 maxTransfers
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(eventStart > block.timestamp, "Event start must be in future");
        
        uint256 newTicketId = ticketIdCounter++;
        _safeMint(to, newTicketId);
        _setTokenURI(newTicketId, uri);
        
        ticketRecords[newTicketId] = TicketInfo({
            eventId: eventId,
            eventInfo: eventInfo,
            eventStart: eventStart,
            pastOwners: new address[](0),
            usedStatus: false,
            attendanceScore: 0,
            transferCount: 0,
            maxTransfers: maxTransfers
        });
        
        ticketRecords[newTicketId].pastOwners.push(to);
        
        emit TicketMinted(newTicketId, to, eventId, uri);
    }

    /**
     * @dev Batch mint free tickets for multiple recipients
     */
    function batchMint(
        address[] calldata recipients,
        uint256 eventId,
        string[] calldata uris,
        string memory eventInfo,
        uint64 eventStart,
        uint8 maxTransfers
    ) external onlyRole(MINTER_ROLE) {
        require(recipients.length == uris.length, "Arrays length mismatch");
        require(recipients.length > 0, "No recipients provided");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            mintTicket(recipients[i], eventId, uris[i], eventInfo, eventStart, maxTransfers);
        }
    }

    /**
     * @dev Validate ticket attendance
     */
    function validateTicket(uint256 ticketId) external {
        require(_tokenExists(ticketId), "Ticket does not exist");
        require(ownerOf(ticketId) == msg.sender, "Not ticket owner");
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

    /**
     * @dev Controlled transfer with history tracking
     */
    function transferWithHistory(
        address from,
        address to,
        uint256 tokenId
    ) external onlyRole(ORGANIZER_ROLE) {
        require(_tokenExists(tokenId), "Ticket does not exist");
        require(from == ownerOf(tokenId), "Not token owner");
        require(!checkedIn[tokenId], "Cannot transfer after check-in");
        
        TicketInfo storage ticket = ticketRecords[tokenId];
        require(ticket.transferCount < ticket.maxTransfers, "Transfer limit reached");
        require(block.timestamp < uint256(ticket.eventStart), "Cannot transfer after event starts");
        
        ticket.transferCount += 1;
        ticket.pastOwners.push(to);
        
        _transfer(from, to, tokenId);
    }

    /**
     * @dev Burn expired/unused tickets
     */
    function burnExpiredTicket(uint256 tokenId) external onlyRole(ORGANIZER_ROLE) {
        require(_tokenExists(tokenId), "Ticket does not exist");
        
        uint64 eventStart = ticketRecords[tokenId].eventStart;
        require(block.timestamp > uint256(eventStart) + 5 minutes, "Ticket still valid");
        require(!ticketRecords[tokenId].usedStatus, "Ticket was validated");
        
        _burn(tokenId);
    }

    /**
     * @dev Update attendance score
     */
    function updateAttendanceScore(uint256 tokenId, uint64 score) external onlyRole(ORGANIZER_ROLE) {
        require(_tokenExists(tokenId), "Ticket does not exist");
        require(checkedIn[tokenId], "Ticket not checked in");
        require(score <= 100, "Score must be 0-100");
        
        ticketRecords[tokenId].attendanceScore = score;
    }

    // Helper function
    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // View functions
    function getTicketInfo(uint256 tokenId) external view returns (
        uint256 eventId,
        string memory eventInfo,
        uint64 eventStart,
        bool usedStatus,
        uint64 attendanceScore,
        uint8 transferCount,
        uint8 maxTransfers
    ) {
        require(_tokenExists(tokenId), "Ticket does not exist");
        TicketInfo memory ticket = ticketRecords[tokenId];
        return (
            ticket.eventId,
            ticket.eventInfo,
            ticket.eventStart,
            ticket.usedStatus,
            ticket.attendanceScore,
            ticket.transferCount,
            ticket.maxTransfers
        );
    }

    function getTicketHistory(uint256 ticketId) external view returns (address[] memory) {
        require(_tokenExists(tokenId), "Ticket does not exist");
        return ticketRecords[ticketId].pastOwners;
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete ticketRecords[tokenId];
        delete checkedIn[tokenId];
        delete checkInTime[tokenId];
    }
}
