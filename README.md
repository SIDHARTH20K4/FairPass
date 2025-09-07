# 🎟️ FairPass – NFT-based Event Ticketing

> Transparent. Secure. Fair. – The future of event ticketing.

---

## 🌟 Project Overview
FairPass is a **blockchain-powered ticketing platform** that eliminates fraud, prevents duplicate usage, and ensures fair monetization for organizers.  
Tickets are NFTs with on-chain ownership, reselling controls, and automatic burn on event check-in.

---

## 🔑 Core Features
- **NFT Tickets** – On-chain ERC-721 tickets with unique ownership.
- **Resale Prevention** – Stops scalping & black-market resale.  
- **Burn on Check-in** – Prevents duplicate use (📸 screenshot fraud).  
- **Approval-based Access** – Free, paid, and invite-only events.  
- **Organizer Revenue** – Resale fees & Sonic fee-sharing (90% of gas fees back).  
- **Auditable & Transparent** – Full lifecycle tracked on-chain.  

---

## 🚨 Real-Life Problem Examples
- 🎤 *Concert Ticket Resale*: Popular concerts see tickets resold at **10x the original price** → fans suffer.  
- 🎟️ *Duplicate Usage*: Attended an event, friend scanned screenshot → got free merch & food. FairPass prevents this.  

---

## 🛠️ Tech Stack
- **Smart Contracts**: Solidity (ERC-721, burnable, pausable)  
- **Storage**: IPFS for ticket metadata  
- **Frontend**: React + Wagmi hooks  
- **Network**: Sonic (fee-sharing: 90% of gas back to organizer)  

---

## 🔗 Smart Contract
---

## 🏗️ EventImplementation.sol
Main contract for event logic.

### 🔑 Core Functionalities
- **Constructor** → Initializes event (name, type, price, organizer, platform).  
- **buyTicket(string metadataURI)** → Users buy tickets; NFT minted.  
- **mintForUser(address user, string metadataURI)** → Organizer mints tickets directly (batch/lazy minting).  
- **checkIn(uint256 tokenId)** → Burns ticket at event entry to prevent reuse.  
- **ownerOfNFT(uint256 tokenId)** → Fetches NFT owner.  
- **registerMe()** → Organizer registers themselves.  
- **Ownership Functions** → `owner()`, `transferOwnership()`, `renounceOwnership()`.  

---

## 🎟️ EventTicket.sol
ERC-721 NFT contract for ticket representation.

### 🔑 Core Functionalities
- **mint(address to, string metadataURI)** → Creates a new NFT ticket.  
- **burn(uint256 tokenId)** → Destroys NFT (used after check-in).  
- **ownerOf(uint256 tokenId)** → Returns ticket owner.  
- **tokenURI(uint256 tokenId)** → Fetches ticket metadata (IPFS link).  
- Supports **ERC-721 transfers** (`transferFrom`, `safeTransferFrom`).  

---

## 🌐 EventFactory.sol
Manages multiple events and revenue logic.

**EventFactory.sol CA:** 0x9016F1b7DA5C91d6479aAF99A8765Cb4ED0668bE  

### 🔑 Core Functionalities
- **createEvent(...)** → Deploys a new `EventImplementation` contract for each event.  
- **getAllEvents()** → Returns list of deployed event contracts.  
- **getEventDetails(eventAddress)** → Fetch event details.  

### 💰 Fee Model
- **Ticket Revenue** → Goes to organizer.  
- **Resale Fee** → Platform + organizer share.  
- **Sonic Gas Refund** → 90% of gas fees returned to smart contract owner.  

---

## 🔄 Ticket Lifecycle
1. **Mint/Buy** → User mints ticket NFT.  
2. **Resell/Transfer** → Possible via contract logic, with fees enforced.  
3. **Check-In** → At event, ticket burned to prevent screenshot fraud.  
4. **Completion** → No further use after burning.  

---

## 🧩 Example Flow
1. Organizer creates event via **PlatformManager**.  
2. Users buy tickets using **EventImplementation**.  
3. NFTs minted by **EventTicket** contract.  
4. At venue, user calls **checkIn** → NFT is burned.  
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
