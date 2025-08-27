// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PaymentHandler.sol";
import "./FreeEventTickets.sol";
import "./PaidEventTickets.sol";

/**
 * @title EventManagerV2
 * @dev Orchestrates between payment handler and ticket contracts
 */
contract EventManagerV2 is Ownable, ReentrancyGuard {
    
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
        uint64 eventStart;
    }
    
    uint256 private eventIdCounter;
    mapping(uint256 => Event) private eventRegistry;
    mapping(address => uint256[]) private organizerEvents;
    
    PaymentHandler public paymentHandler;
    FreeEventTickets public freeTicketContract;
    PaidEventTickets public paidTicketContract;
    
    event EventCreated(uint256 indexed eventId, string name, bool isPaid, address indexed organizer);
    event TicketMinted(uint256 indexed eventId, address indexed recipient, bool isPaid);
    event ContractsUpdated(address paymentHandler, address freeTickets, address paidTickets);

    constructor(
        address initialOwner,
        address paymentHandlerAddress,
        address freeTicketAddress,
        address paidTicketAddress
    ) Ownable(initialOwner) {
        paymentHandler = PaymentHandler(payable(paymentHandlerAddress));
        freeTicketContract = FreeEventTickets(freeTicketAddress);
        paidTicketContract = PaidEventTickets(paidTicketAddress);
    }

    /**
     * @dev Create a new event
     */
    function createEvent(
        string memory name,
        string memory location,
        string memory date,
        uint256 ticketPrice,
        uint256 totalSupply,
        uint64 eventStart
    ) external {
        require(bytes(name).length > 0, "Event name required");
        require(eventStart > block.timestamp, "Event start must be in future");
        
        bool isPaid = ticketPrice > 0;
        
        uint256 eventId = eventIdCounter++;
        
        eventRegistry[eventId] = Event({
            name: name,
            location: location,
            date: date,
            ticketPrice: ticketPrice,
            organizer: msg.sender,
            isPaid: isPaid,
            totalSupply: totalSupply,
            mintedTickets: 0,
            isActive: true,
            eventStart: eventStart
        });
        
        organizerEvents[msg.sender].push(eventId);
        
        emit EventCreated(eventId, name, isPaid, msg.sender);
    }

    /**
     * @dev Purchase ticket for paid event
     */
    function purchaseTicket(
        uint256 eventId,
        string memory uri
    ) external payable nonReentrant {
        Event storage eventData = eventRegistry[eventId];
        require(eventData.isActive, "Event not active");
        require(eventData.isPaid, "Use mintFreeTicket for free events");
        require(msg.value >= eventData.ticketPrice, "Insufficient payment");
        
        if (eventData.totalSupply > 0) {
            require(eventData.mintedTickets < eventData.totalSupply, "Event sold out");
        }
        
        // Purchase through PaidEventTickets contract
        paidTicketContract.purchaseTicket{value: msg.value}(
            eventId,
            uri,
            eventData.name,
            eventData.ticketPrice,
            eventData.eventStart,
            eventData.organizer,
            3 // maxTransfers
        );
        
        eventData.mintedTickets++;
        emit TicketMinted(eventId, msg.sender, true);
    }

    /**
     * @dev Mint free ticket (organizer only)
     */
    function mintFreeTicket(
        uint256 eventId,
        address recipient,
        string memory uri
    ) external {
        Event storage eventData = eventRegistry[eventId];
        require(eventData.organizer == msg.sender, "Only organizer can mint");
        require(!eventData.isPaid, "Use purchaseTicket for paid events");
        require(eventData.isActive, "Event not active");
        
        if (eventData.totalSupply > 0) {
            require(eventData.mintedTickets < eventData.totalSupply, "Event sold out");
        }
        
        // Mint through FreeEventTickets contract
        freeTicketContract.mintTicket(
            recipient,
            eventId,
            uri,
            eventData.name,
            eventData.eventStart,
            3 // maxTransfers
        );
        
        eventData.mintedTickets++;
        emit TicketMinted(eventId, recipient, false);
    }

    /**
     * @dev Batch mint free tickets
     */
    function batchMintFreeTickets(
        uint256 eventId,
        address[] calldata recipients,
        string[] calldata uris
    ) external {
        Event storage eventData = eventRegistry[eventId];
        require(eventData.organizer == msg.sender, "Only organizer can mint");
        require(!eventData.isPaid, "Use purchaseTicket for paid events");
        require(recipients.length == uris.length, "Arrays length mismatch");
        
        if (eventData.totalSupply > 0) {
            require(
                eventData.mintedTickets + recipients.length <= eventData.totalSupply,
                "Would exceed capacity"
            );
        }
        
        // Batch mint through FreeEventTickets contract
        freeTicketContract.batchMint(
            recipients,
            eventId,
            uris,
            eventData.name,
            eventData.eventStart,
            3 // maxTransfers
        );
        
        eventData.mintedTickets += recipients.length;
        
        for (uint i = 0; i < recipients.length; i++) {
            emit TicketMinted(eventId, recipients[i], false);
        }
    }

    /**
     * @dev Update contract addresses (owner only)
     */
    function updateContracts(
        address newPaymentHandler,
        address newFreeTickets,
        address newPaidTickets
    ) external onlyOwner {
        paymentHandler = PaymentHandler(payable(newPaymentHandler));
        freeTicketContract = FreeEventTickets(newFreeTickets);
        paidTicketContract = PaidEventTickets(newPaidTickets);
        
        emit ContractsUpdated(newPaymentHandler, newFreeTickets, newPaidTickets);
    }

    // View functions
    function getEventDetails(uint256 eventId) external view returns (Event memory) {
        require(eventId < eventIdCounter, "Event does not exist");
        return eventRegistry[eventId];
    }

    function getEventsByOrganizer(address organizer) external view returns (uint256[] memory) {
        return organizerEvents[organizer];
    }

    function getTotalEvents() external view returns (uint256) {
        return eventIdCounter;
    }
}
