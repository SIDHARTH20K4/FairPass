// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IEventChainContract.sol";
import "./IEventManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventManager is Ownable, IEventManager {
    uint256 private eventIdCounter;
    mapping(uint256 => Event) private eventRegistry;
    address private eventChainContract;

    constructor(address initialOwner, address eventChainContractAddress)
        Ownable(initialOwner)
    {
        eventChainContract = eventChainContractAddress;
    }

    function setEventChainAddress(address newEventChainContract)
        external
        onlyOwner
    {
        eventChainContract = newEventChainContract;
    }

    /// @notice Create Event (Free or Paid)
    function createEvent(
        string memory name,
        string memory location,
        uint256 date,
        uint256 ticketPrice,
        bool isFree,
        bool approvalRequired,
        bool resaleFeeEnabled
    ) public override {
        require(isFree || ticketPrice > 0, "Paid event must have price");

        uint256 eventId = eventIdCounter;
        eventIdCounter += 1;

        eventRegistry[eventId] = Event({
            name: name,
            location: location,
            date: date,
            ticketPrice: ticketPrice,
            isFree: isFree,
            organizer: msg.sender,
            fundsCollected: 0,
            approvalRequired: approvalRequired,
            resaleFeeEnabled: resaleFeeEnabled
        });

        emit EventCreated(
            eventId,
            name,
            location,
            date,
            ticketPrice,
            isFree,
            msg.sender
        );
    }

    function getEventDetails(uint256 eventId)
        public
        view
        override
        returns (Event memory)
    {
        require(eventId < eventIdCounter, "Event does not exist");
        return eventRegistry[eventId];
    }

    /// @notice Mint Ticket (Free = no payment, Paid = requires ETH)
    function mintTicket(
        uint256 eventId,
        address to,
        string memory uri,
        uint256 endDate
    ) public payable override {
        require(eventId < eventIdCounter, "Event does not exist");
        Event storage ev = eventRegistry[eventId];
        require(block.timestamp < ev.date, "Event already passed");
        require(
            ev.organizer == msg.sender || ev.isFree == false,
            "Only organizer mints free tickets"
        );

        if (ev.isFree) {
            require(ev.ticketPrice == 0, "Free event must be 0 price");
        } else {
            require(msg.value == ev.ticketPrice, "Incorrect ETH sent");
            ev.fundsCollected += msg.value;
        }

        require(eventChainContract != address(0), "EventChainContract not set");

        IEventChainContract chain = IEventChainContract(eventChainContract);
        uint256 newTicketId = chain.safeMint(
            to,
            uri,
            ev.name,
            ev.ticketPrice,
            endDate,
            eventId,
            ev.resaleFeeEnabled
        );
        if (ev.approvalRequired) {
            chain.markPending(newTicketId); // ticket needs approval
        } else {
            chain.approveTicket(newTicketId); // automatically approved
        }
    }

    /// @notice Organizer withdraws collected funds for their event
    function withdrawFunds(uint256 eventId) external {
        Event storage ev = eventRegistry[eventId];
        require(ev.organizer == msg.sender, "Only organizer can withdraw");
        uint256 amount = ev.fundsCollected;
        require(amount > 0, "No funds");

        ev.fundsCollected = 0;
        payable(msg.sender).transfer(amount);
    }

    function transferEvent(uint256 eventId, address to) external {
        Event storage currentEvent = eventRegistry[eventId];
        require(
            currentEvent.organizer == msg.sender,
            "Only organizer can transfer"
        );

        currentEvent.organizer = to;
        emit EventTransferred(eventId, msg.sender, to);
    }
}
