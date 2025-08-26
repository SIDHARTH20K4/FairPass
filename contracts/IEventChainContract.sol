// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Updated version to match your contracts

/**
 * @title IEventChainContract
 * @dev Interface for EventChainContract that manages ticket minting, validation, metadata updates,
 * maximum resale price settings, and burning expired tickets.
 */
interface IEventChainContract {

    /**
     * @dev Mints a new ticket and assigns it to the specified address.
     * @param to The address to which the ticket will be minted.
     * @param uri The URI for the ticket metadata.
     * @param eventDetails Details of the event associated with the ticket.
     * @param originalPrice The original price of the ticket.
     * @param eventStart The start timestamp of the event (unix seconds). // FIXED: was expirationDate
     */
    function safeMint(
        address to, 
        string memory uri, 
        string memory eventDetails, 
        uint256 originalPrice, 
        uint64 eventStart  // FIXED: Changed from uint256 expirationDate
    ) external;

    /**
     * @dev Validates a ticket, marking it as used.
     * @param ticketId The ID of the ticket to validate. // FIXED: was tokenId
     */
    function validateTicket(uint256 ticketId) external;

    /**
     * @dev Retrieves the ownership history of a ticket.
     * @param ticketId The ID of the ticket to query. // FIXED: was tokenId
     * @return An array of addresses representing the ownership history of the ticket.
     */
    function getTicketHistory(uint256 ticketId) external view returns (address[] memory);

    /**
     * @dev Updates the metadata of a ticket.
     * @param tokenId The ID of the ticket to update.
     * @param newEventDetails The updated details of the event associated with the ticket.
     * @param newURI The updated URI for the ticket metadata.
     */
    function updateTicketMetadata(uint256 tokenId, string memory newEventDetails, string memory newURI) external;

    /**
     * @dev Sets the maximum resale price for a ticket.
     * @param tokenId The ID of the ticket for which to set the maximum resale price.
     * @param maxPrice The maximum resale price to set.
     */
    function setMaxResalePrice(uint256 tokenId, uint256 maxPrice) external;

    /**
     * @dev Burns an expired ticket, removing it from circulation.
     * @param tokenId The ID of the ticket to burn.
     */
    function burnExpiredTickets(uint256 tokenId) external;

    /**
     * @dev Transfers a ticket from one address to another and updates ownership history.
     * @param from The address from which the ticket is transferred.
     * @param to The address to which the ticket is transferred.
     * @param tokenId The ID of the ticket to transfer.
     */
    function transferWithHistoryUpdate(address from, address to, uint256 tokenId) external;

    // ADDED: Missing function from your EventContract
    /**
     * @dev Updates the attendance score for a ticket after check-in.
     * @param tokenId The ID of the ticket to update.
     * @param score The attendance score to assign.
     */
    function updateAttendanceScore(uint256 tokenId, uint64 score) external;

    // ADDED: Missing view function from your EventContract  
    /**
     * @dev Retrieves comprehensive information about a ticket.
     * @param tokenId The ID of the ticket to query.
     * @return eventInfo Details of the event.
     * @return basePrice Original price of the ticket.
     * @return eventStart Start timestamp of the event.
     * @return usedStatus Whether the ticket has been validated.
     * @return attendanceScore Quality score of attendance.
     * @return transfersUsed Number of transfers made.
     * @return maxTransfersAllowed Maximum transfers allowed.
     */
    function getTicketInfo(uint256 tokenId) external view returns (
        string memory eventInfo,
        uint256 basePrice,
        uint64 eventStart,
        bool usedStatus,
        uint64 attendanceScore,
        uint8 transfersUsed,
        uint8 maxTransfersAllowed
    );

    // EVENTS - Updated to match EventContract
    /**
     * @dev Emitted when a ticket is minted.
     * @param tokenId The ID of the minted ticket.
     * @param to The address to which the ticket is minted. // FIXED: was owner
     * @param eventDetails Details of the event associated with the ticket.
     * @param originalPrice The original price of the ticket.
     * @param eventStart The start timestamp of the event. // FIXED: was expirationDate
     */
    event TicketMinted(
        uint256 indexed tokenId, 
        address indexed to,  // FIXED: was owner
        string eventDetails, 
        uint256 originalPrice, 
        uint64 eventStart    // FIXED: was expirationDate
    );

    /**
     * @dev Emitted when a ticket is transferred from one address to another.
     * @param tokenId The ID of the transferred ticket.
     * @param from The address from which the ticket is transferred.
     * @param to The address to which the ticket is transferred.
     */
    event TicketTransferred(uint256 indexed tokenId, address indexed from, address indexed to);

    /**
     * @dev Emitted when a ticket is validated.
     * @param tokenId The ID of the validated ticket.
     * @param validator The address of the entity that validates the ticket.
     */
    event TicketValidated(uint256 indexed tokenId, address indexed validator);

    /**
     * @dev Emitted when a ticket expires and is burned.
     * @param tokenId The ID of the expired ticket.
     */
    event TicketExpired(uint256 indexed tokenId);

    /**
     * @dev Emitted when the metadata of a ticket is updated.
     * @param tokenId The ID of the ticket whose metadata is updated.
     * @param newEventDetails The updated details of the event associated with the ticket.
     * @param newURI The updated URI for the ticket metadata.
     */
    event TicketMetadataUpdated(uint256 indexed tokenId, string newEventDetails, string newURI);

    /**
     * @dev Emitted when the maximum resale price of a ticket is set.
     * @param tokenId The ID of the ticket for which the maximum resale price is set.
     * @param maxPrice The maximum resale price that is set.
     */
    event TicketMaxResalePriceSet(uint256 indexed tokenId, uint256 maxPrice);

    // ADDED: New events from your EventContract
    /**
     * @dev Emitted when attendance is recorded for a ticket.
     * @param tokenId The ID of the ticket.
     * @param attendee The address of the attendee.
     * @param timestamp The timestamp when attendance was recorded.
     */
    event AttendanceRecorded(uint256 indexed tokenId, address indexed attendee, uint256 timestamp);
}
