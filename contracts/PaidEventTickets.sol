// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./PaymentHandler.sol";

/**
 * @title PaidEventTickets
 * @dev Handles NFT tickets for paid events - integrates with PaymentHandler
 */
contract PaidEventTickets is ERC721, ERC721URIStorage, ERC721Burnable, AccessControl {
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    
    uint256 private ticketIdCounter;
    PaymentHandler public paymentHandler;
    
    struct TicketInfo {
        uint256 eventId;
        string eventInfo;
        uint256 ticketPrice;
        uint64 eventStart;
        address[] pastOwners;
        bool usedStatus;
        uint64 attendanceScore;
        uint8 transferCount;
        uint8 maxTransfers;
        address organizer;
    }
    
    mapping(uint256 => TicketInfo) private ticketRecords;
    mapping(uint256 => bool) public checkedIn;
    mapping(uint256 => uint256) public checkInTime;
    
    event TicketMinted(uint256 indexed tokenId, address indexed to, uint256 indexed eventId, uint256 price);
    event TicketPurchased(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event AttendanceRecorded(uint256 indexed tokenId, address indexed attendee, uint256 timestamp);
    event RefundRequested(uint256 indexed tokenId, address indexed requester, uint256 amount);

    constructor(address paymentHandlerAddress) ERC721("PaidEventTickets", "PET") {
        require(paymentHandlerAddress != address(0), "Invalid payment handler");
        paymentHandler = PaymentHandler(payable(paymentHandlerAddress));
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Direct purchase function - handles payment and minting
     */
    function purchaseTicket(
        uint256 eventId,
        string memory uri,
        string memory eventInfo,
        uint256 ticketPrice,
        uint64 eventStart,
        address organizer,
        uint8 maxTransfers
    ) external payable {
        require(msg.value >= ticketPrice, "Insufficient payment");
        require(eventStart > block.timestamp, "Event already started");
        require(organizer != address(0), "Invalid organizer");
        
        // Process payment through PaymentHandler
        bool paymentSuccess = paymentHandler.processPayment{value: msg.value}(
            eventId, 
            organizer, 
            ticketPrice
        );
        require(paymentSuccess, "Payment processing failed");
        
        // Mint ticket
        uint256 newTicketId = ticketIdCounter++;
        _safeMint(msg.sender, newTicketId);
        _setTokenURI(newTicketId, uri);
        
        ticketRecords[newTicketId] = TicketInfo({
            eventId: eventId,
            eventInfo: eventInfo,
            ticketPrice: ticketPrice,
            eventStart: eventStart,
            pastOwners: new address[](0),
            usedStatus: false,
            attendanceScore: 0,
            transferCount: 0,
            maxTransfers: maxTransfers,
            organizer: organizer
        });
        
        ticketRecords[newTicketId].pastOwners.push(msg.sender);
        
        emit TicketPurchased(newTicketId, msg.sender, ticketPrice);
    }

    /**
     * @dev Organizer mints tickets (pre-sale or comp tickets)
     */
    function mintTicketForEvent(
        address to,
        uint256 eventId,
        string memory uri,
        string memory eventInfo,
        uint256 ticketPrice,
        uint64 eventStart,
        address organizer,
        uint8 maxTransfers
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(eventStart > block.timestamp, "Event already started");
        
        uint256 newTicketId = ticketIdCounter++;
        _safeMint(to, newTicketId);
        _setTokenURI(newTicketId, uri);
        
        ticketRecords[newTicketId] = TicketInfo({
            eventId: eventId,
            eventInfo: eventInfo,
            ticketPrice: ticketPrice,
            eventStart: eventStart,
            pastOwners: new address[](0),
            usedStatus: false,
            attendanceScore: 0,
            transferCount: 0,
            maxTransfers: maxTransfers,
            organizer: organizer
        });
        
        ticketRecords[newTicketId].pastOwners.push(to);
        
        emit TicketMinted(newTicketId, to, eventId, ticketPrice);
    }

    /**
     * @dev Request refund for a ticket
     */
    function requestRefund(uint256 tokenId) external {
        require(_tokenExists(tokenId), "Ticket does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(!ticketRecords[tokenId].usedStatus, "Ticket already used");
        
        TicketInfo memory ticket = ticketRecords[tokenId];
        require(block.timestamp < uint256(ticket.eventStart), "Cannot refund after event starts");
        
        // Process refund through PaymentHandler
        paymentHandler.processRefund(ticket.eventId, msg.sender, ticket.ticketPrice);
        
        emit RefundRequested(tokenId, msg.sender, ticket.ticketPrice);
        
        // Burn the ticket after refund
        _burn(tokenId);
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
        
        emit AttendanceRecorded(ticketId, msg.sender, block.timestamp);
    }

    // Helper function
    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // View functions
    function getTicketInfo(uint256 tokenId) external view returns (
        uint256 eventId,
        string memory eventInfo,
        uint256 ticketPrice,
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
            ticket.ticketPrice,
            ticket.eventStart,
            ticket.usedStatus,
            ticket.attendanceScore,
            ticket.transferCount,
            ticket.maxTransfers
        );
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
