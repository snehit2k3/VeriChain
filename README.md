# 🌿 VeriChain: A Decentralized Supply Chain Solution

VeriChain is a proof-of-concept decentralized application (dApp) that brings transparency and trust to supply chains using blockchain technology. It provides a real-time, immutable ledger of a product's journey, from creation to distribution, accessible to all stakeholders.

The application features a modern, professional UI with distinct views for different user roles and a live feed of all on-chain transactions.

## ✨ Key Features

* **Role-Based Access Control:** Distinct dashboards and permissions for different roles in the supply chain (Producer, Refinery, Distributor, and Auditor).
* **Live Event Feed:** A real-time, color-coded timeline that displays all on-chain activities, such as token creation, transfer, and burning, making it easy to track a product's history.
* **Modern Web3 Integration:** Seamlessly connect with MetaMask or other Web3 providers to interact with the smart contract.
* **Immutable Tracking:** Every step of the supply chain is recorded as a transaction on the blockchain, ensuring data integrity and preventing fraud.
* **Professional & Interactive UI:** A clean, responsive user interface built with React and enhanced with a professional design system, animations, and hover effects.

## 📋 How It Works

The VeriChain workflow is designed to be simple and intuitive for all participants in the supply chain.

1.  **Connect Wallet:** A user first connects their MetaMask wallet. The application automatically checks their wallet address against the smart contract to determine their role (Producer, Refinery, Distributor, or public Auditor).
2.  **Producer Creates the Product:** A user with the "Producer" role can create a new product. This action mints a new, unique NFT (Non-Fungible Token) on the blockchain, representing the physical item. This is the first entry in the product's permanent record.
3.  **Transfer Through the Chain:** The Producer can then transfer the token to a "Refinery," who in turn can transfer it to the "Distributor." Each transfer is a secure transaction recorded on the blockchain.
4.  **Auditor View:** Anyone can connect as an "Auditor" to see the full, unfiltered history of every product on the chain. This public-facing view provides ultimate transparency, showing every creation and transfer event in a live, easy-to-read timeline.

## 🛠️ Tech Stack

This project is built with a modern Web3 technology stack:

* **Frontend:** React, Vite, Ethers.js, CSS3
* **Blockchain:** Solidity for the smart contract.
* **Development Environment:** Hardhat for local blockchain development, testing, and deployment.
* **Core Libraries:** OpenZeppelin Contracts for secure, standardized smart contract components (like `AccessControl`).

#### Professional Connection Page
*The initial connection prompt features an animated gradient background and a glowing "aurora" effect.*

#### Live Activity Feed (Auditor View)
*The Auditor dashboard provides a real-time feed of all supply chain events, with color-coded icons and keywords for instant identification of actions.*

## 🚀 Getting Started

To run this project locally, you'll need to set up both the backend (Hardhat local node) and the frontend (Vite React app).

### Prerequisites

* [Node.js](https://nodejs.org/) (v18.x or later recommended)
* [MetaMask](https://metamask.io/) browser extension

### 1. Clone the Repository

```bash
git clone [https://github.com/snehit2k3/VeriChain.git](https://github.com/snehit2k3/VeriChain.git)
cd VeriChain
