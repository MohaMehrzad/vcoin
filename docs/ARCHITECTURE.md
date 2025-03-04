# VCoin (VCN) Technical Architecture

This document outlines the technical architecture of the VCoin (VCN) token implementation on Solana using the Token-2022 program.

## System Overview

VCoin is implemented as a fungible token on the Solana blockchain utilizing the Token-2022 program, which provides enhanced features over the original SPL Token program. The system consists of multiple components for token creation, allocation, metadata management, presale, and vesting.

## Component Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Token Creation ├────►│  Token Metadata ├────►│  Token          │
│  (create-token) │     │  (update-meta)  │     │  Allocation     │
│                 │     │                 │     │  (allocate)     │
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         │                                               │
         │                                               ▼
┌────────▼────────┐                           ┌─────────────────┐
│                 │                           │                 │
│  Configuration  │◄──────────────────────────┤  Presale        │
│  (.env, utils)  │                           │  Management     │
│                 │                           │                 │
└────────┬────────┘                           └────────┬────────┘
         │                                             │
         │                                             │
         ▼                                             ▼
┌─────────────────┐                           ┌─────────────────┐
│                 │                           │                 │
│  Keypair        │                           │  Vesting        │
│  Management     │                           │  Management     │
│                 │                           │                 │
└─────────────────┘                           └─────────────────┘
```

## Core Components

### 1. Token Creation (`src/create-token.ts`)

Responsible for:
- Creating a new token mint using the Token-2022 program
- Setting up the mint authority
- Minting the initial token supply
- Storing token metadata locally

**Key Functions:**
- `createToken()`: Initializes the token mint and mints full supply
- `initializeMint()`: Creates the mint account and configures decimals

**Dependencies:**
- Solana Web3.js
- SPL Token-2022 Program
- Local keypair management

### 2. Token Metadata (`src/update-metadata.ts`)

Responsible for:
- Adding on-chain metadata to the token mint
- Setting token name, symbol, and other properties
- Ensuring the token displays correctly in wallets and explorers

**Key Functions:**
- `updateTokenMetadata()`: Adds metadata to the token using Metaplex standards
- `findMetadataAddress()`: Derives the PDA for token metadata

**Dependencies:**
- Metaplex Token Metadata Program
- Umi Framework
- SPL Token-2022 Program

### 3. Token Allocation (`src/allocate-token.ts`)

Responsible for:
- Distributing tokens according to tokenomics
- Creating wallets for different allocation purposes
- Managing token transfers

**Key Functions:**
- `allocateTokens()`: Distributes tokens to designated wallets
- `createTokenAccounts()`: Creates token accounts for recipients
- `transferTokens()`: Safely transfers tokens between accounts

**Dependencies:**
- Solana Web3.js
- SPL Token-2022 Program
- Token Configuration

### 4. Presale Management (`src/presale.ts`)

Responsible for:
- Managing token presale process
- Handling purchases and distributions
- Tracking presale statistics

**Key Functions:**
- `startPresale()`: Initializes the presale period
- `processPurchase()`: Handles token purchases
- `getPresaleStatus()`: Reports on current presale metrics
- `endPresale()`: Finalizes the presale period

**Dependencies:**
- Token Allocation System
- Configuration Management
- Token Metadata

### 5. Vesting Management (`src/vesting.ts`)

Responsible for:
- Implementing token vesting schedule
- Executing periodic token releases
- Tracking vesting progress

**Key Functions:**
- `initializeVesting()`: Sets up vesting schedule
- `executeRelease()`: Releases tokens according to schedule
- `getVestingStatus()`: Reports on vesting progress

**Dependencies:**
- Token Allocation System
- Configuration Management

### 6. Utility Functions (`src/utils.ts`)

Provides shared functionality:
- Network configuration
- Token conversion utilities
- Keypair management
- Metadata handling

**Key Functions:**
- `getConnection()`: Establishes connection to Solana network
- `getOrCreateKeypair()`: Manages keypair storage and retrieval
- `tokensToRawAmount()`/`rawAmountToTokens()`: Conversion utilities

## Security Architecture

### Authentication and Authorization

- **Keypair-based Authentication**: All operations require appropriate keypair signatures
- **Authority Verification**: Critical operations verify that the signer has appropriate authority

### Data Validation

- **Input Validation**: All user inputs and configuration values are validated
- **Transaction Simulation**: Transactions are simulated before submission to detect errors

### Key Management

- **Local Keypair Storage**: Keypairs are stored locally with appropriate file permissions
- **Authority Separation**: Different authorities for different functions (mint, freeze, etc.)

## Error Handling

- **Graceful Failures**: All operations handle errors gracefully with informative messages
- **Transaction Retry Logic**: Critical operations implement retry logic for transient failures
- **Validation Before Action**: Preconditions are checked before attempting operations

## Testing Strategy

- **Unit Tests**: Testing individual components and functions
- **Integration Tests**: Testing interactions between components
- **Security Tests**: Specific tests for security properties
- **Simulation Tests**: Testing on Solana TestNet/DevNet before production

## Deployment Workflow

1. Create and configure environment
2. Create token with full supply
3. Add token metadata
4. Allocate tokens to designated wallets
5. Initialize presale and vesting mechanisms
6. Monitor and execute vesting releases

## Future Enhancements

- **Multi-signature Support**: Add multi-sig for critical operations
- **Enhanced Monitoring**: Add monitoring and alerting systems
- **UI Integration**: Create web interface for management functions
- **Advanced Vesting**: Add cliff vesting and other complex vesting models