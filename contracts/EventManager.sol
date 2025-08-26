// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IEventManager.sol";
import "./IEventChainContract.sol";

/**
 * @title EventManager
 * @dev This contract allows organizers to create events, mint tickets, and transfer event ownership.
 *      The contract is managed by the owner who also controls the address of the EventChainContract.
 */
contract EventManager is Ownable, IEventChainEventManagerContract {
    uint256 private eventIdCounter;
    
    mapping(uint256 => Event) private eventRegistry;
    mapping(address => uint256[]) private organizerEvents;
    
    address private eventChainContract;

    // Additional events for better tracking
    event EventChainContractUpdated(address indexed oldContract, address indexed newContract);
    event TicketMinted(uint256 indexed eventId, address indexed to, string uri);

    /**
     * @dev Constructor to initialize the contract with an owner and the linked EventChainContract.
     * @param initialOwner The initial owner of the contract.
     * @param eventChainContractAddress The address of the EventChainContract to be used.
     */
    constructor(address initialOwner, address eventChainContractAddress) Ownable(initialOwner) {
        require(eventChainContractAddress != address(0), "Invalid EventChainContract address");
        eventChainContract = eventChainContractAddress;
    }

    /**
     * @dev Allows the contract owner to update the EventChainContract address.
     * @param newEventChainContract The new EventChainContract address to be set.
     */
    function setEventChainAddress(address newEventChainContract) external onlyOwner {
        require(newEventChainContract != address(0), "Invalid contract address");
        
        address oldContract = eventChainContract;
        eventChainContract = newEventChainContract;
        
        emit EventChainContractUpdated(oldContract, newEventChainContract);
    }

    /**
     * @dev Organizer can create a new event by providing event details.
     * @param name The name of the event.
     * @param location The venue or place of the event.
     * @param date The scheduled date of the event.
     * @param ticketPrice The cost of one ticket for the event.
     */
    function createEvent(
        string memory name, 
        string memory location, 
        string memory date, 
        uint256 ticketPrice
    ) public override {
        require(bytes(name).length > 0, "Event name cannot be empty");
        require(bytes(location).length > 0, "Event location cannot be empty");
        require(bytes(date).length > 0, "Event date cannot be empty");
        require(ticketPrice > 0, "Ticket price must be greater than 0");

        uint256 eventId = eventIdCounter;
        eventIdCounter += 1;

        eventRegistry[eventId] = Event({
            name: name,
            location: location,
            date: date,
            ticketPrice: ticketPrice,
            organizer: msg.sender
        });

        // Track events by organizer
        organizerEvents[msg.sender].push(eventId);

        emit EventCreated(eventId, name, location, date, ticketPrice, msg.sender);
    }

    /**
     * @dev Fetches the details of an existing event.
     * @param eventId The ID of the event to query.
     * @return Event struct containing all event metadata.
     */
    function getEventDetails(uint256 eventId) public view override returns (Event memory) {
        require(eventId < eventIdCounter, "Event does not exist");
        return eventRegistry[eventId];
    }

    /**
     * @dev Allows the event organizer to mint tickets for a specific event.
     * @param eventId The ID of the event to mint tickets for.
     * @param to The address receiving the minted ticket.
     * @param uri The metadata URI associated with the ticket.
     * @param endDate The end date for the ticket's validity (will be converted to eventStart).
     */
    function mintTicket(
        uint256 eventId, 
        address to, 
        string memory uri, 
        uint256 endDate  // Keep interface signature but convert internally
    ) public override {
        require(eventId < eventIdCounter, "Event does not exist");
        require(eventRegistry[eventId].organizer == msg.sender, "Only organizer can mint");
        require(eventChainContract != address(0), "EventChainContract not set");
        require(to != address(0), "Invalid recipient address");
        require(bytes(uri).length > 0, "URI cannot be empty");
        require(endDate > block.timestamp, "End date must be in the future");

        // Convert uint256 to uint64 for EventContract compatibility
        // Note: This assumes endDate fits in uint64 range (until year ~584 billion)
        require(endDate <= type(uint64).max, "Date exceeds uint64 range");
        uint64 eventStart = uint64(endDate);

        IEventChainContract chain = IEventChainContract(eventChainContract);
        
        // Call the EventContract's safeMint function
        chain.safeMint(
            to, 
            uri, 
            eventRegistry[eventId].name,  // eventDetails 
            eventRegistry[eventId].ticketPrice,  // originalPrice
            eventStart  // converted to uint64
        );

        emit TicketMinted(eventId, to, uri);
    }

    /**
     * @dev Allows the current owner of an event to transfer ownership to another address.
     * @param eventId The ID of the event to transfer.
     * @param to The new organizer's address.
     */
    function transferEvent(uint256 eventId, address to) external override {
        require(eventId < eventIdCounter, "Event does not exist");
        require(to != address(0), "Invalid recipient address");
        
        Event storage currentEvent = eventRegistry[eventId];
        require(currentEvent.organizer == msg.sender, "Only organizer can transfer");
        require(to != msg.sender, "Cannot transfer to yourself");

        address oldOrganizer = currentEvent.organizer;
        currentEvent.organizer = to;

        // Update organizer tracking
        _removeEventFromOrganizer(oldOrganizer, eventId);
        organizerEvents[to].push(eventId);

        emit EventTransferred(eventId, oldOrganizer, to);
    }

    // Additional utility functions (not in interface but useful)
    
    /**
     * @dev Get all events created by a specific organizer.
     * @param organizer The address of the organizer.
     * @return Array of event IDs created by the organizer.
     */
    function getEventsByOrganizer(address organizer) external view returns (uint256[] memory) {
        return organizerEvents[organizer];
    }

    /**
     * @dev Get the total number of events created.
     * @return The total number of events.
     */
    function getTotalEvents() external view returns (uint256) {
        return eventIdCounter;
    }

    /**
     * @dev Get the address of the current EventChainContract.
     * @return The address of the EventChainContract.
     */
    function getEventChainContract() external view returns (address) {
        return eventChainContract;
    }

    /**
     * @dev Internal function to remove an event from an organizer's list.
     * @param organizer The organizer's address.
     * @param eventId The event ID to remove.
     */
    function _removeEventFromOrganizer(address organizer, uint256 eventId) internal {
        uint256[] storage events = organizerEvents[organizer];
        for (uint256 i = 0; i < events.length; i++) {
            if (events[i] == eventId) {
                events[i] = events[events.length - 1];
                events.pop();
                break;
            }
        }
    }
}
