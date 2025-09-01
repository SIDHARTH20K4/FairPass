// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract EventTicket is ERC721Burnable, ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    uint256 public nextTokenId;
    address public platformOwner;
    uint256 public resaleFeeBps = 100; // 1% default (basis points)
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant MAX_RESALES = 3;

    mapping(uint256 => uint8) public resaleCount;
    mapping(uint256 => uint256) public resalePrices;
    mapping(uint256 => bool) public listedForResale;

    // Events
    event TicketMinted(uint256 indexed tokenId, address indexed to, string metadataURI);
    event ListedForResale(uint256 indexed tokenId, uint256 price);
    event ResaleCancelled(uint256 indexed tokenId);
    event TicketResold(uint256 indexed tokenId, address from, address to, uint256 price, uint256 fee);
    event TicketBurned(uint256 indexed tokenId, address indexed burner);
    event ResaleFeeUpdated(uint256 newFeeBps);

    constructor(
        string memory name, 
        string memory symbol,
        address _eventOwner,
        address _platformOwner
    ) ERC721(name, symbol) Ownable(_eventOwner) {
        require(_platformOwner != address(0), "Invalid platform owner");
        platformOwner = _platformOwner;
    }

    function OwnerMint(address to, string memory metadataURI) external onlyOwner whenNotPaused returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(bytes(metadataURI).length > 0, "Empty metadata URI");

        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit TicketMinted(tokenId, to, metadataURI);
        return tokenId;
    }

    function mint(address to, string memory metadataURI)external whenNotPaused returns(uint256){
        require(msg.sender != address(0), "Invalid recipient");
        require(bytes(metadataURI).length > 0, "Empty metadata URI");
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit TicketMinted(tokenId, msg.sender, metadataURI);
        return tokenId;
    }

    function listForResale(uint256 tokenId, uint256 price) external whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(price > 0, "Price must be > 0");
        require(resaleCount[tokenId] < MAX_RESALES, "Max resales reached");

        resalePrices[tokenId] = price;
        listedForResale[tokenId] = true;

        emit ListedForResale(tokenId, price);
    }

    function cancelResale(uint256 tokenId) external whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(listedForResale[tokenId], "Not listed for resale");

        listedForResale[tokenId] = false;
        resalePrices[tokenId] = 0;

        emit ResaleCancelled(tokenId);
    }

    function buyResale(uint256 tokenId) external payable nonReentrant whenNotPaused {
        address from = ownerOf(tokenId);
        require(from != msg.sender, "Cannot buy own ticket");
        require(listedForResale[tokenId], "Not for sale");
        require(msg.value == resalePrices[tokenId], "Incorrect payment amount");
        require(resaleCount[tokenId] < MAX_RESALES, "Max resales reached");

        uint256 fee = (msg.value * resaleFeeBps) / DENOMINATOR;
        uint256 proceeds = msg.value - fee;

        // State changes before external calls
        listedForResale[tokenId] = false;
        resalePrices[tokenId] = 0;
        resaleCount[tokenId]++;
        
        // Transfer token
        _transfer(from, msg.sender, tokenId);

        // Transfer funds (safe)
        (bool successToSeller, ) = payable(from).call{value: proceeds}("");
        (bool successToPlatform, ) = payable(platformOwner).call{value: fee}("");
        
        require(successToSeller && successToPlatform, "Transfer failed");

        emit TicketResold(tokenId, from, msg.sender, msg.value, fee);
    }

    function burnTicket(uint256 tokenId) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender || msg.sender == owner(),
            "Not authorized to burn"
        );
        
        _burn(tokenId);
        emit TicketBurned(tokenId, msg.sender);
    }

    function setResaleFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "Fee too high"); // Max 5%
        resaleFeeBps = newFeeBps;
        emit ResaleFeeUpdated(newFeeBps);
    }

    function updatePlatformOwner(address newPlatformOwner) external onlyOwner {
        require(newPlatformOwner != address(0), "Invalid address");
        platformOwner = newPlatformOwner;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getResaleInfo(uint256 tokenId) external view returns (
        bool isListed, 
        uint256 price, 
        uint8 resalesDone, 
        uint8 resalesRemaining) {

    uint8 maxResales = uint8(MAX_RESALES);
    uint8 remaining = maxResales - resaleCount[tokenId];

    return (
        listedForResale[tokenId],
        resalePrices[tokenId],
        resaleCount[tokenId],
        remaining
    );
}

    // Override functions for ERC721URIStorage compatibility
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

    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}