// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventTicket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventImplementation is Ownable {
    string public eventName;
    enum EventType { FREE, PAID, APPROVAL }
    EventType public eventType;
    //address public eventOwner;

    uint256 public ticketPrice;
    EventTicket public ticketNFT;

    constructor(
        string memory _name,
        EventType _eventType,
        uint256 _ticketPrice,
        address _eventOwner,
        address _platformOwner
    ) Ownable(_eventOwner){
        eventName = _name;
        eventType = _eventType;
        ticketPrice = _ticketPrice;
        //eventOwner = _eventOwner;

        // Deploy fresh ticket NFT for this event
        ticketNFT = new EventTicket(
            string(abi.encodePacked(_name, " Ticket")),
            "EVT",
            address(this),        // event owner
            _platformOwner     // platform owner for fees
        );
        ticketNFT.addAuthorizedEvent(address(this));
    }

    /// Mint ticket (free or paid, not approval-based)
    function buyTicket(string memory metadataURI) external payable {
    if (eventType == EventType.FREE) {
        ticketNFT.mint(msg.sender, metadataURI);
    } else if (eventType == EventType.PAID) {
        require(msg.value >= ticketPrice, "Not enough ETH");
        ticketNFT.mint(msg.sender, metadataURI);
    } else {
        revert("Approval-based: organizer must mint");
    }
}


    /// Organizer mints tickets for approval-based events
    function mintForUser(address user, string memory metadataURI) external onlyOwner {
        require(eventType == EventType.APPROVAL, "Not approval event");
        ticketNFT.OwnerMint(user, metadataURI);
    }

    /// Organizer burns ticket on check-in
    function checkIn(uint256 tokenId) external{
        address ticketOwner = ticketNFT.ownerOf(tokenId);
        require(
            msg.sender == owner() || 
            msg.sender == ticketOwner,
            "Only organizer or ticket owner can check in"
        );

        ticketNFT.burnTicket(tokenId);
    }

    function ownerOfNFT(uint256 tokenId) external view returns (address) {
        return ticketNFT.ownerOf(tokenId);
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 122)
        );
        require(_success, "FeeM registration failed");
    }
}