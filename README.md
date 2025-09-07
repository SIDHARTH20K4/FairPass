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
**EventImplementation.sol ABI:** [View ABI](contracts/EventImplementation.json)  
Main Functions:  
- `buyTicket()` → Mint new ticket  
- `checkIn()` → Burn ticket after entry  
- `mintForUser()` → Organizer batch minting  
- `ownerOfNFT()` → Verify ticket ownership  

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
