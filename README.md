# 🎟️ FairPass – NFT-based Event Ticketing

> Transparent · Secure · Fair

---

## 📌 Overview
FairPass is a blockchain-based ticketing system using NFTs to ensure **fair resale, transparent ownership, and fraud prevention**.  

The system leverages **Zero-Knowledge Proofs (ZKPs)** during event check-in to validate ticket holders **without exposing sensitive wallet information**.

**Core Contracts**
1. **EventImplementation.sol** → Manages each event (buying, check-in, ZK validation)  
2. **EventTicket.sol** → ERC-721 NFT contract representing tickets  
3. **EventManager.sol** → Deploys/manages events and handles fee-sharing  

---

## 🏗️ EventImplementation.sol
Handles event-specific logic.

**Functions**
- `constructor()` → Initializes event (name, type, price, organizer, platform)  
- `buyTicket(string metadataURI)` → Users purchase tickets, NFT minted  
- `mintForUser(address user, string metadataURI)` → Organizer mints tickets (batch/lazy minting)  
- `checkIn(uint256 tokenId, ZKProof proof)` →  
  - Verifies ownership with **ZK proof**  
  - Burns ticket after check-in to prevent reuse  
- `ownerOfNFT(uint256 tokenId)` → Returns NFT owner  
- `registerMe()` → Organizer registration  
- Ownership → `owner()`, `transferOwnership()`, `renounceOwnership()`  

✅ **ZK Integration** → Prevents fraud (e.g., screenshot reuse of tickets)  

---

## 🎟️ EventTicket.sol
ERC-721 contract for tickets.

**Functions**
- `mint(address to, string metadataURI)` → Mints NFT ticket  
- `burn(uint256 tokenId)` → Burns ticket (used after check-in)  
- `ownerOf(uint256 tokenId)` → Returns ticket owner  
- `tokenURI(uint256 tokenId)` → Metadata (IPFS link)  
- ERC-721 transfers supported → `transferFrom`, `safeTransferFrom`  

✅ **ZK Context** → Tickets verified without exposing wallet  

---

## 🌐 EventManager.sol
Deploys and manages multiple events.

**Functions**
- `createEvent(...)` → Deploys new `EventImplementation` contract  
- `getAllEvents()` → Returns list of all event contracts  
- `getEventDetails(eventAddress)` → Fetch event details  

**Fee Model**
- Ticket sales → 100% to organizer  
- Resale fee → Revenue share between platform + organizer  
- Sonic gas refund → **90% of gas fees returned to contract owner**  

✅ **ZK Enforced** → All events require ZK proof at check-in  

---

## 🔄 Ticket Lifecycle
1. **Mint/Buy** → NFT ticket minted to user  
2. **Resell/Transfer** → Allowed, with enforced platform fee  
3. **Check-In (ZK proof)** → Proof generated → verified on-chain → ticket burned  
4. **Completion** → Ticket cannot be reused  

---

## 🧩 Example Flow
1. Organizer creates event via **EventManager**  
2. User buys ticket through **EventImplementation**  
3. Ticket minted in **EventTicket** contract  
4. At venue:  
   - User generates ZK proof  
   - Calls `checkIn(tokenId, proof)`  
   - Proof verified → ticket burned  
5. If resold, resale fees distributed to platform + organizer  

---

## 💰 Monetization
- Ticket sales → 100% to organizer  
- Resale fee → Platform + organizer share  
- Sonic gas refund → **90% of gas fees back to contract owner**  

---
