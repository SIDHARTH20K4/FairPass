# 🎟️ FairPass – NFT-based Event Ticketing

Demo link : https://youtu.be/c5NRRpHysRg

> Transparent · Secure · Fair

FairPass is a **blockchain-powered ticketing platform** built on the **Sonic Blockchain** that uses **NFTs** to bring fairness, transparency, and security to event ticketing.  

- ✅ **No Fraud** → Tickets are unique NFTs  
- ✅ **Fair Resale** → Ownership is transparent on-chain  
- ✅ **Privacy at Check-in** → Uses **Zero-Knowledge Proofs (ZKPs)** so users prove ticket validity **without exposing their wallet**  
- ✅ **Sustainable Fees with Sonic FeeM** → On **Sonic Mainnet**, **90% of gas fees** are refunded back to the smart contract owner, creating a **sustainable revenue model** that rewards both the platform and organizers without overcharging users. **(FeeM is not available on testnet)** 
 
---
## 🚨 The Problem  
🎫 Web2 ticketing is broken:  
- Fake/scalped tickets → fans get cheated.  
- Organizers lose resale revenue.  
- Users expose personal info at check-in.  
---
## 💡 Our Solution  
FairPass turns every ticket into an **NFT with built-in ZK privacy**:  
- Tickets can’t be faked (NFTs are unique).  
- Resale rules are enforced on-chain.  
- At check-in, you prove ownership via **ZK proof** → without revealing wallet.  
- Sonic’s **FeeM** refunds 90% of gas → organizers earn more, users pay less.
---

## 📑 Table of Contents
1. [Tech Stack](#-tech-stack)  
2. [Core Smart Contracts](#-core-smart-contracts)  
   - [EventImplementation.sol](#1-eventimplementationsol)  
   - [EventTicket.sol](#2-eventticketsol)  
   - [EventManager.sol](#3-eventmanagersol)  
3. [Fee & Incentive Model](#-fee--incentive-model)  
4. [Ticket Lifecycle](#-ticket-lifecycle)  
5. [Example Flow](#-example-flow)  

---

## 🛠 Tech Stack
- **Blockchain**: Sonic  
- **Smart Contracts**: Solidity, Foundry  
- **Tickets (NFTs)**: ERC-721  
- **Privacy**: Zero-Knowledge Proofs (semaphore.js)  
- **Frontend**: React  
- **Backend**: Node.js, Express  
- **Wallet Integration**: Rainbow-Kit  

---

## 🔑 Core Smart Contracts  

### 1. EventImplementation.sol  
Handles event-specific logic:  
- `constructor()` → Initializes event (name, type, price, organizer, platform)  
- `buyTicket(string metadataURI)` → Users purchase tickets, NFT minted  
- `mintForUser(address user, string metadataURI)` → Organizer batch/lazy mints tickets  
- `checkIn(uint256 tokenId, ZKProof proof)` → Validates ZK proof & burns ticket after check-in  
- `ownerOfNFT(uint256 tokenId)` → Returns NFT owner  
- `registerMe()` → Organizer registration  
- Ownership management → `owner()`, `transferOwnership()`, `renounceOwnership()`  

✅ **ZK Integration** → Prevents fraud (e.g., screenshot reuse of tickets)  

---

### 2. EventTicket.sol  
ERC-721 contract for tickets:  
- `mint(address to, string metadataURI)` → Mints NFT ticket  
- `burn(uint256 tokenId)` → Burns ticket (used after check-in)  
- `ownerOf(uint256 tokenId)` → Returns ticket owner  
- `tokenURI(uint256 tokenId)` → Metadata (IPFS link)  
- Standard ERC-721 transfers → `transferFrom`, `safeTransferFrom`  

✅ **ZK Context** → Tickets verified without exposing wallet  

---

### 3. EventManager.sol  
Deploys and manages multiple events:  
- `createEvent(...)` → Deploys new `EventImplementation` contract  
- `getAllEvents()` → Returns list of deployed events  
- `getEventDetails(eventAddress)` → Fetch event details  

✅ **ZK Enforced** → All events require ZK proof at check-in  

---

## 💰 Fee & Incentive Model  

FairPass leverages the **Sonic blockchain’s fee-sharing model** and mainnet token rewards:  

| Revenue Source            | Organizer | Platform (FairPass) |
|----------------------------|-----------|----------------------|
| Ticket Sales               | 100%      | 0%                   |
| Resale Fees                | Shared    | Shared               |
| Gas Refunds (Sonic)        | Shared    | Shared (90% of fees returned) |
| Mainnet Token Rewards      | ✅ Earn tokens per transaction | ❌ |

👉 This creates a **sustainable revenue stream** while ensuring fair costs for users.  

---

## 🔄 Ticket Lifecycle
1. **Mint/Buy** → NFT ticket minted to user  
2. **Resell/Transfer** → Allowed with enforced platform fee  
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
## 🌍 Why Sonic + Hackathon Fit

1. FeeM gas refund → sustainable incentive model

2. ZK privacy → innovative check-in UX

3. NFT tickets → transparent + fair resale

---

## 📂 Project Structure

```bash
backend/   → Node.js + ZKP service  
frontend/  → React dApp (UI, wallet integration)  
web3/      → Solidity contracts (EventManager, EventImplementation, EventTicket)
```

---
## Contributors

1. Fabio Mughilan
2. Siddarth
---




