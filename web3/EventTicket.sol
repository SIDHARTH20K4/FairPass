// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract EventTicket is ERC721Burnable, ERC721URIStorage, Ownable {
    uint256 public nextTokenId;
    address public platformOwner; 
    uint256 public resaleFeeBps = 10; // 0.1% (basis points)
    uint256 public constant DENOMINATOR = 10000;

    mapping(uint256 => uint8) public resaleCount;

    constructor(
        string memory name, 
        string memory symbol,
        address _eventOwner,
        address _platformOwner
    ) ERC721(name, symbol) Ownable(_eventOwner) {
        platformOwner = _platformOwner;
    }

    function mint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    function mint(address to, string memory metadataURI) external onlyOwner {
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI); // maps tokenId → ipfs://...metadata.json
    }

    /// Resale function with fee
    function resaleTransfer(address from, address to, uint256 tokenId) external payable {
        require(ownerOf(tokenId) == from, "Not ticket owner");
        require(resaleCount[tokenId] < 3, "Max resales reached");

        // Calculate fee
        uint256 fee = (msg.value * resaleFeeBps) / DENOMINATOR;
        payable(platformOwner).transfer(fee);

        resaleCount[tokenId]++;
        _transfer(from, to, tokenId);
    }

    /// Burn on check-in
    function burnTicket(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        _burn(tokenId);
    }

    // ✅ Required overrides
    function _burn(uint256 tokenId) internal override(ERC721){
        super._burn(tokenId);
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
}