# VCoin - Solana Token Project

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
   - [Creating a Token](#creating-a-token)
   - [Updating Metadata](#updating-metadata)
   - [Allocating Tokens](#allocating-tokens)
   - [Presale Management](#presale-management)
   - [Vesting](#vesting)
6. [Testing](#testing)
7. [Security Considerations](#security-considerations)
8. [Audit Readiness](#audit-readiness)
9. [Deployment](#deployment)

## Project Overview

VCoin is a comprehensive Solana-based token project that provides a complete ecosystem for creating and managing SPL tokens. This project implements token creation, metadata management, token allocation, presale functionality, and vesting capabilities.

The project is designed with security, maintainability, and extensibility in mind, following best practices for Solana development.

### Key Features

- **Token Creation**: Create SPL tokens with customizable supply and decimals
- **Metadata Management**: Update token metadata on-chain
- **Token Allocation**: Distribute tokens according to a defined tokenomics model
- **Presale Management**: Run token presales with configurable parameters
- **Vesting**: Implement vesting schedules for token releases

## Architecture

The project follows a modular architecture, with clear separation of concerns between different components.

### Core Components

- **Token Creation**: `create-token.ts` - Handles token creation and initial setup
- **Metadata Management**: `update-metadata.ts` - Manages on-chain metadata using Metaplex
- **Token Allocation**: `allocate-token.ts` - Distributes tokens according to tokenomics
- **Presale**: `presale.ts` - Manages token presale functionality
- **Vesting**: `vesting.ts` - Implements vesting schedules and release mechanisms
- **Utilities**: `utils.ts` - Common utilities used across the codebase

### Workflow

1. Create a token using `create-token.ts`
2. Update token metadata using `update-metadata.ts`
3. Allocate tokens to different wallets using `allocate-token.ts`
4. Run a presale using `presale.ts`
5. Set up and manage vesting schedules using `vesting.ts`

## Installation

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Solana CLI tools (optional, for interacting with the Solana network directly)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vcoin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and configure it:
   ```bash
   cp .env.example .env
   ```

## Configuration

Configure the project by editing the `.env` file. Key parameters include:

### Solana Network Configuration
```
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Token Configuration
```
TOKEN_NAME=VCoin
TOKEN_SYMBOL=VCN
TOKEN_DECIMALS=6
TOKEN_TOTAL_SUPPLY=1000000000
```

### Distribution Configuration
```
DEV_ALLOCATION=500000000
PRESALE_ALLOCATION=100000000
AIRDROP_ALLOCATION=50000000
VESTING_ALLOCATION=350000000
```

### Presale Configuration
```
PRESALE_PRICE_USD=0.03
PRESALE_START_DATE=2025-03-15
PRESALE_END_DATE=2025-08-31
```

### Vesting Configuration
```
VESTING_RELEASE_AMOUNT=50000000
VESTING_RELEASE_INTERVAL_MONTHS=3
```

## Usage

### Creating a Token

Create a new token with:

```bash
npm run create-token
```

Options:
- `--existing-keypair`: Use an existing authority keypair
- `--skip-balance-check`: Skip the SOL balance check

### Updating Metadata

Update token metadata with:

```bash
npm run update-metadata <mint-address> <metadata-path> [rpc-url] [keypair-path]
```

Example:
```bash
npm run update-metadata 7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH ./token-metadata.json
```

### Allocating Tokens

Allocate tokens according to tokenomics:

```bash
npm run allocate-tokens
```

This will distribute tokens to development, presale, airdrop, and vesting wallets based on your configuration.

### Presale Management

Manage the presale with:

```bash
# Start the presale
npm run presale start

# End the presale
npm run presale end

# Process a purchase
npm run presale buy <buyer_address> <usd_amount>

# Check presale status
npm run presale status
```

### Vesting

Manage vesting schedules:

```bash
# Initialize vesting schedule
npm run vesting init

# Execute a specific release
npm run vesting release <release_number>

# Check vesting status
npm run vesting status
```

## Testing

The project has comprehensive test coverage, including unit tests, integration tests, and E2E tests.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=tests/unit/utils.test.ts
```

### Test Coverage

The codebase maintains high test coverage:
- Statement coverage: 94.22%
- Branch coverage: 81.1%
- Function coverage: 95.55%
- Line coverage: 94.72%

## Security Considerations

### Key Security Features

1. **Input Validation**: All user inputs are validated
2. **Path Traversal Protection**: Prevents path traversal attacks in file operations
3. **Keypair Security**: Secure handling of keypairs
4. **Metadata Integrity**: Checksum verification for metadata
5. **Error Handling**: Comprehensive error handling throughout the codebase

### Security Best Practices

- Private keys are never stored in plaintext
- Authority verification for sensitive operations
- Limited scope for sensitive operations
- Principle of least privilege applied throughout

## Audit Readiness

The project is ready for audit with the following characteristics:

1. **High Test Coverage**: Exceeds 80% branch coverage target
2. **Comprehensive Testing**: Unit, integration, and E2E tests
3. **Security-Focused Tests**: Dedicated tests for security aspects
4. **Documentation**: Well-documented code and functionality
5. **Error Handling**: Robust error handling throughout

### Known Limitations

- Token transfer operations should be reviewed for edge cases
- Some deprecated configurations in Jest setup
- Some utility functions could benefit from additional test coverage

## Deployment

### Devnet Deployment

1. Configure `.env` to use Devnet
2. Ensure you have a funded Devnet wallet
3. Run the appropriate scripts in sequence

### Mainnet Deployment

For mainnet deployment:

1. Update `.env` to use mainnet configuration
2. Use a secure, air-gapped machine for keypair generation
3. Ensure sufficient SOL balance for operations
4. Double-check all configuration values
5. Run a dry-run on Devnet first
6. Follow the deployment sequence carefully

### Post-Deployment Verification

After deployment, verify:
- Token creation and metadata
- Token allocations
- Presale functionality
- Vesting schedule

## License

This project is proprietary and confidential. All rights reserved.

---

© 2023 VCoin Project 