### Backend: start the bot

copy the TELEGRAM_BOT_TOKEN to .env
`npm install`

### Then start the bot with
`npm start`

### Frontend
https://invoicingupayment-ton.vercel.app/

### Telegram miniapp
https://t.me/Invoicingupayment_bot/invoicingupayment

# Transaction Flow: Step-by-Step Guide

This document outlines the standard, three-phase process that occurs when a user initiates a transaction (e.g., a payment, smart contract interaction, or order confirmation) within a Decentralized Application (DApp) that utilizes a browser extension or mobile wallet.

---

## Start: User Initiates Transaction 🚀

The process begins with a clear **user action** on the DApp's frontend.

* **User Action:** The user clicks a button such as **"Pay"** or **"Confirm Order"** on the DApp/website.

---

## Phase 1: DApp and Wallet Interaction 🤝

This phase focuses on preparing the transaction data and securing the user's necessary approval via the connected wallet.

### 1. DApp Preparation & Request
* The DApp constructs the full **transaction payload** (e.g., recipient address, token amount, gas limit/price, smart contract data).
* The DApp utilizes the **Wallet SDK** (often conforming to the EIP-1193 standard or a specific Provider API) to initiate the request.

### 2. Wallet Popup & Review
* The DApp triggers a **Wallet popup**.
* The Extension Wallet displays a floating overlay/modal (commonly a non-intrusive modal, often appearing in the top-right corner).
* If the wallet is locked, it may first request a user unlock (e.g., password or biometric confirmation).
* The popup displays the **detailed transaction information** for the user to review.

### 3. User Confirmation
* The user reviews the details to ensure they are correct.
* The user clicks **"Confirm"** to approve the transaction.
* ***Note:*** The user remains on the DApp page throughout this entire phase.

---

## Phase 2: Transaction Processing and Broadcast 📡

Once confirmed by the user, the wallet handles the critical steps of signing and submitting the transaction to the network.

### 1. Transaction Broadcast
* The Wallet **signs the transaction** cryptographically using the user's private key (this happens securely in the background).
* The Wallet immediately **broadcasts the signed transaction** to the connected blockchain network (e.g., Ethereum, Polygon, etc.).

### 2. Wallet Popup Closes
* The Wallet popup closes **automatically** after the transaction has been successfully signed and broadcasted.

---

## Phase 3: DApp Confirmation and Final Update ✅

The DApp takes over again, tracking the transaction until it is included in a block and finalized.

### 1. DApp Receives Response
* The DApp receives the **transaction hash** from the Wallet's Provider API call.

### 2. Final Confirmation in DApp
* The DApp immediately updates its frontend status to reflect the pending state (e.g., **"Processing Payment"** or **"Awaiting Confirmation"**).
* The DApp starts monitoring the transaction hash until the transaction is fully confirmed (mined and adequately validated) on the blockchain.

### 3. End: Frontend Update
* After the transaction is successfully executed and confirmed by the network, the DApp's frontend shows the final, updated state (e.g., the upgraded user account, a confirmed order, or a new token balance).

---
