// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/token/ERC721/ERC721.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/access/Ownable.sol";
import "./IEventChainContract.sol";

contract EventContract is
    ERC721,
    ERC721URIStorage,
    ERC721Burnable,
    Ownable,
    IEventChainContract
{
    uint256 private ticketIdCounter;

    struct TicketInfo {
        uint256 eventId;
        string eventInfo;
        uint256 basePrice;
        uint64 expiryTimestamp;
        address[] pastOwners;
        bool usedStatus;
    }

    mapping(uint256 => TicketInfo) private ticketRecords;
    mapping(uint256 => uint256) public resalePriceLimit;

    constructor(address contractOwner) ERC721("EventChainTickets", "ECT") {
        require(contractOwner != address(0), "Invalid owner address");
        _transferOwnership(contractOwner);
    }

    function safeMint(
        address to,
        string memory uri,
        string memory eventDetails,
        uint256 originalPrice,
        uint256 expirationDate,
        uint256 eventId,
        bool resaleFeeEnabled
    ) external override returns (uint256) {
        uint256 newTicketId = ticketIdCounter++;
        _safeMint(to, newTicketId);
        _setTokenURI(newTicketId, uri);

        address[] memory owners = new address[](1); 
        owners[0] = to;

        ticketRecords[newTicketId] = TicketInfo({
            eventId: eventId,
            eventInfo: eventDetails,
            basePrice: originalPrice,
            expiryTimestamp: uint64(expirationDate),
            pastOwners: owners,
            usedStatus: false
        });

        ticketResaleFee[newTicketId] = resaleFeeEnabled; // map for each ticket

        emit TicketMinted(
            newTicketId,
            to,
            eventDetails,
            originalPrice,
            expirationDate
        );
        return newTicketId;
    }

    mapping(uint256 => bool) public ticketResaleFee;

    function validateTicket(uint256 ticketId) public override {
        require(ownerOf(ticketId) == msg.sender, "Not authorized");
        require(!ticketRecords[ticketId].usedStatus, "Ticket already used");
        require(
            block.timestamp <= ticketRecords[ticketId].expiryTimestamp,
            "Ticket expired"
        );

        require(!pendingTickets[ticketId], "Ticket not approved yet"); // only blocks pending tickets

        ticketRecords[ticketId].usedStatus = true;
        emit TicketValidated(ticketId, msg.sender);
    }

    function getTicketHistory(uint256 ticketId)
        public
        view
        override
        returns (address[] memory)
    {
        require(_exists(ticketId), "Nonexistent ticket");
        return ticketRecords[ticketId].pastOwners;
    }

    // Implement the missing interface functions:

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

    function setMaxResalePrice(uint256 tokenId, uint256 maxPrice)
        external
        override
        onlyOwner
    {
        require(_exists(tokenId), "Nonexistent ticket");
        resalePriceLimit[tokenId] = maxPrice;
        emit TicketMaxResalePriceSet(tokenId, maxPrice);
    }

    function burnExpiredTickets(uint256 tokenId) external override onlyOwner {
        require(_exists(tokenId), "Nonexistent ticket");
        require(
            block.timestamp > ticketRecords[tokenId].expiryTimestamp,
            "Ticket still valid"
        );
        _burn(tokenId);
        emit TicketExpired(tokenId);
    }

    uint256 constant RESALE_FEE_PERCENT = 10;

    function transferWithHistoryUpdate(
        address from,
        address to,
        uint256 tokenId,
        uint256 salePrice,
        address organizer
    ) external onlyOwner {
        require(_exists(tokenId), "Nonexistent ticket");
        require(from != address(0) && to != address(0), "Invalid address");
        require(from == ownerOf(tokenId), "Not token owner");

        TicketInfo storage ticket = ticketRecords[tokenId];
        ticket.pastOwners.push(to);

        // If resale fee applies for this event
        if (ticketResaleFee[tokenId] && salePrice > 0) {
            uint256 fee = (salePrice * RESALE_FEE_PERCENT) / 100;
            payable(organizer).transfer(fee);
            payable(from).transfer(salePrice - fee);
        } else {
            payable(from).transfer(salePrice);
        }

        _transfer(from, to, tokenId);
        emit TicketTransferred(tokenId, from, to);
    }

    // Helper functions
    function _exists(uint256 tokenId) internal view override returns (bool) {
        return ERC721._ownerOf(tokenId) != address(0);
    }

    // Required overrides
    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
        delete ticketRecords[tokenId];
        delete resalePriceLimit[tokenId];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    mapping(uint256 => bool) public pendingTickets;

    function markPending(uint256 ticketId) external override onlyOwner {
        require(_exists(ticketId), "Ticket does not exist");
        pendingTickets[ticketId] = true;
    }

    function approveTicket(uint256 ticketId) external onlyOwner {
        require(_exists(ticketId), "Ticket does not exist");
        pendingTickets[ticketId] = false; // now approved
    }

    // function setApprovalForAll(address operator, bool approved) public override(ERC721, IERC721) {
    //     revert("Approvals disabled");
    // }
}

//0x7087374beB22f3021096542F0dF409062522db0b
