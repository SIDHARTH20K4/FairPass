// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {EventFactory} from "../../EventFactory.sol";
import {EventImplementation} from "../../EventImplementation.sol";
import {EventTicket} from "../../EventTicket.sol";

contract FairPassTest is Test {
    EventFactory public factory;
    EventImplementation public eventContract;
    EventTicket public ticketContract;
    
    address public platformOwner = address(0x1);
    address public eventOwner = address(0x2);
    address public user = address(0x3);
    
    uint256 public constant TICKET_PRICE = 0.1 ether;

    function setUp() public {
        vm.startPrank(platformOwner);
        factory = new EventFactory();
        vm.stopPrank();
    }

    function test_CreateFreeEvent() public {
        vm.startPrank(eventOwner);
        
        factory.createEvent(
            "Free Concert",
            EventImplementation.EventType.FREE,
            0
        );
        
        EventImplementation[] memory events = factory.getAllEvents();
        assertEq(events.length, 1);
        assertEq(events[0].eventName(), "Free Concert");
        assertEq(uint256(events[0].eventType()), uint256(EventImplementation.EventType.FREE));
        
        vm.stopPrank();
    }

    function test_CreatePaidEvent() public {
        vm.startPrank(eventOwner);
        
        factory.createEvent(
            "Paid Conference",
            EventImplementation.EventType.PAID,
            TICKET_PRICE
        );
        
        EventImplementation[] memory events = factory.getAllEvents();
        assertEq(events.length, 1);
        assertEq(events[0].ticketPrice(), TICKET_PRICE);
        
        vm.stopPrank();
    }

    function test_BuyFreeTicket() public {
        // Create free event
        vm.startPrank(eventOwner);
        factory.createEvent("Free Event", EventImplementation.EventType.FREE, 0);
        EventImplementation[] memory events = factory.getAllEvents();
        eventContract = events[0];
        vm.stopPrank();
        
        // Buy ticket
        vm.startPrank(user);
        eventContract.buyTicket{value: 0}("ipfs://metadata");
        vm.stopPrank();
        
        // Verify ticket was minted
        assertEq(eventContract.ticketNFT().balanceOf(user), 1);
    }

    function test_BuyPaidTicket() public {
        // Create paid event
        vm.startPrank(eventOwner);
        factory.createEvent("Paid Event", EventImplementation.EventType.PAID, TICKET_PRICE);
        EventImplementation[] memory events = factory.getAllEvents();
        eventContract = events[0];
        vm.stopPrank();
        
        // Buy ticket with correct payment
        vm.deal(user, TICKET_PRICE);
        vm.startPrank(user);
        eventContract.buyTicket{value: TICKET_PRICE}("ipfs://metadata");
        vm.stopPrank();
        
        // Verify ticket was minted
        assertEq(eventContract.ticketNFT().balanceOf(user), 1);
    }

    function test_BuyPaidTicketInsufficientPayment() public {
        // Create paid event
        vm.startPrank(eventOwner);
        factory.createEvent("Paid Event", EventImplementation.EventType.PAID, TICKET_PRICE);
        EventImplementation[] memory events = factory.getAllEvents();
        eventContract = events[0];
        vm.stopPrank();
        
        // Try to buy ticket with insufficient payment
        vm.deal(user, TICKET_PRICE / 2);
        vm.startPrank(user);
        vm.expectRevert("Not enough ETH");
        eventContract.buyTicket{value: TICKET_PRICE / 2}("ipfs://metadata");
        vm.stopPrank();
    }

    function test_CheckInTicket() public {
        // Create and buy ticket
        vm.startPrank(eventOwner);
        factory.createEvent("Test Event", EventImplementation.EventType.FREE, 0);
        EventImplementation[] memory events = factory.getAllEvents();
        eventContract = events[0];
        vm.stopPrank();
        
        vm.startPrank(user);
        eventContract.buyTicket{value: 0}("ipfs://metadata");
        uint256 tokenId = 0; // First token
        vm.stopPrank();
        
        // Check in ticket
        vm.startPrank(eventOwner);
        eventContract.checkIn(tokenId);
        vm.stopPrank();
        
        // Verify ticket was burned
        vm.expectRevert();
        eventContract.ticketNFT().ownerOf(tokenId);
    }
}
