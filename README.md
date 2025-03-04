# VCoin (VCN) - Solana Token-2022 Implementation

This project implements VCoin (VCN), a cryptocurrency token built on Solana's Token-2022 program. 

## Token Specifications

- **Name**: VCoin
- **Symbol**: VCN
- **Decimals**: 6
- **Total Supply**: 1,000,000,000 VCN
- **Protocol**: Token-2022 (Solana)

## Token Distribution

The token supply is allocated as follows:

- **Development & ViWoApp**: 500,000,000 VCN (50%)
- **Presale**: 100,000,000 VCN (10%)
- **Airdrop**: 50,000,000 VCN (5%)
- **Vesting**: 350,000,000 VCN (35%)

## Presale Information

- **Price**: $0.03 per VCN (fixed throughout the presale period)
- **Start Date**: March 5, 2025
- **End Date**: August 31, 2025

## Vesting Schedule

The vesting program will release 50,000,000 VCN every three months following the presale end, until all 350,000,000 vested tokens are released.

## Prerequisites

- Node.js (v14 or later)
- NPM (v6 or later)
- Solana CLI tools (optional, for interacting directly with the blockchain)

## Installation

1. Clone the repository:
```
git clone https://github.com/your-username/vcoin.git
cd vcoin
```

2. Install dependencies:
```
npm install
```

## Usage

### Token Creation

To create the VCoin token:

```
npm run create-token
```

This will:
- Create a new token with the Token-2022 program
- Mint the full supply to the authority account
- Save the token metadata to token-metadata.json

### Token Allocation

To allocate tokens to different wallets according to the distribution plan:

```
npm run allocate-token
```

This will:
- Create wallets for development, presale, airdrop, and vesting
- Transfer the appropriate amount of tokens to each wallet
- Update the token metadata with allocation information

### Presale Management

The presale functionality allows for the sale of tokens at a fixed price during the presale period.

To start the presale:
```
npm run presale start
```

To process a purchase:
```
npm run presale buy <buyer_address> <usd_amount>
```

To check presale status:
```
npm run presale status
```

To end the presale:
```
npm run presale end
```

### Vesting Management

The vesting functionality manages the release of tokens according to the vesting schedule.

To initialize the vesting schedule (after presale ends):
```
npm run vesting init
```

To execute a specific release:
```
npm run vesting execute <release_number>
```

To check vesting status:
```
npm run vesting status
```

## Token Information

To view token information and usage instructions:

```
npm start
```

## Development

The project is structured as follows:

- `src/create-token.ts`: Token creation script
- `src/allocate-token.ts`: Token allocation script
- `src/presale.ts`: Presale management script
- `src/vesting.ts`: Vesting management script
- `src/utils.ts`: Utility functions and constants
- `src/index.ts`: Main entry point with token information

## License

ISC

## Note

This implementation is for the Solana devnet by default. To use on mainnet, update the SOLANA_NETWORK and SOLANA_RPC_URL variables in the .env file. 