# 🎟️ FairPass – NFT-based Event Ticketing

> Transparent. Secure. Fair. – The future of event ticketing.

---

# 🎟️ FairPass – Smart Contract Documentation

## 📌 Overview
FairPass is a blockchain-based ticketing system using NFTs to ensure **fair resale, transparent ownership, and fraud prevention**.  
The system leverages **Zero-Knowledge Proofs (ZKPs)** during event check-in to validate legitimate ticket holders **without exposing sensitive wallet information**.

Core Contracts:
1. **EventImplementation.sol** → Manages each event (buying, check-in, ZK validation).  
2. **EventTicket.sol** → ERC-721 NFT contract representing tickets.  
3. **PlatformManager.sol** → Manages multiple events and fee-sharing.  

---

## 🏗️ EventImplementation.sol
Main contract for event logic.

### 🔑 Core Functionalities
- **Constructor** → Initializes event (name, type, price, organizer, platform).  
- **buyTicket(string metadataURI)** → Users buy tickets; NFT minted.  
- **mintForUser(address user, string metadataURI)** → Organizer mints tickets directly (batch/lazy minting).  
- **checkIn(uint256 tokenId, ZKProof proof)** →  
  - Verifies **Zero-Knowledge Proof** that the user owns the valid NFT.  
  - Burns the ticket to prevent reuse (screenshot fraud).  
- **ownerOfNFT(uint256 tokenId)** → Fetches NFT owner.  
- **registerMe()** → Organizer registers themselves.  
- **Ownership Functions** → `owner()`, `transferOwnership()`, `renounceOwnership()`.  

✅ **ZK Integration**: Ensures only the rightful ticket holder can check in, even if QR codes/screenshots are shared.  

---

## 🎟️ EventTicket.sol
ERC-721 NFT contract for ticket representation.

### 🔑 Core Functionalities
- **mint(address to, string metadataURI)** → Creates a new NFT ticket.  
- **burn(uint256 tokenId)** → Destroys NFT (used after successful ZK-based check-in).  
- **ownerOf(uint256 tokenId)** → Returns ticket owner.  
- **tokenURI(uint256 tokenId)** → Fetches ticket metadata (IPFS link).  
- Supports **ERC-721 transfers** (`transferFrom`, `safeTransferFrom`).  

✅ **ZK Context**: Ticket remains private; ZK ensures validation without revealing owner’s wallet.  

---

## 🌐 PlatformManager.sol
Manages multiple events and revenue logic.

### 🔑 Core Functionalities
- **createEvent(...)** → Deploys a new `EventImplementation` contract for each event.  
- **getAllEvents()** → Returns list of deployed event contracts.  
- **getEventDetails(eventAddress)** → Fetch event details.  

### 💰 Fee Model
- **Ticket Revenue** → Goes to organizer.  
- **Resale Fee** → Platform + organizer share.  
- **Sonic Gas Refund** → 90% of gas fees returned to smart contract owner.  

✅ **ZK Context**: Platform enforces that every event uses ZK validation at check-in for fraud prevention.  

---

## 🔄 Ticket Lifecycle
1. **Mint/Buy** → User mints ticket NFT.  
2. **Resell/Transfer** → Possible via contract logic, with fees enforced.  
3. **Check-In (with ZK proof)** → At event, user generates a **ZK proof** showing they own the NFT without revealing wallet details. Ticket is then burned.  
4. **Completion** → No further use after burning.  

---

## 🧩 Example Flow
1. Organizer creates event via **PlatformManager**.  
2. Users buy tickets using **EventImplementation**.  
3. NFTs minted by **EventTicket** contract.  
4. At venue:  
   - User generates ZK proof on frontend.  
   - Calls **checkIn(tokenId, proof)**.  
   - Contract verifies ZK proof and burns NFT.  
5. Resale generates fees shared by platform & organizer.  

---


## 💰 Monetization
- Ticket sales → 100% to organizer  
- Resale fee → % revenue for platform  
- Sonic gas refund → **90% of gas fees back to contract owner**  

---

## 📊 Ticket Lifecycle
```mermaid
flowchart LR
    A[Mint Ticket] --> B[Buy Ticket]
    B --> C[Resell/Transfer]
    C --> D[Event Check-in]
    D --> E[Burn Ticket]
