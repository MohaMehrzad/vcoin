# VCoin Deployment Guide

This document provides a comprehensive guide for deploying the VCoin (VCN) token to the Solana blockchain. Follow these steps carefully to ensure a secure and successful deployment.

## Prerequisites

Before deployment, ensure you have:

1. **Environment Setup**
   - Node.js v14 or later installed
   - NPM v6 or later installed
   - Git installed
   - Solana CLI tools installed (optional but recommended)

2. **Security Preparations**
   - Secure machine with up-to-date OS and security patches
   - Hardware wallet for production deployments (recommended)
   - Backup solution for keypairs
   - Network security measures in place

3. **Account Preparation**
   - Authority wallet funded with sufficient SOL (at least 10 SOL recommended)
   - Separate wallets prepared for different allocation purposes
   - Multi-signature setup for production deployments (recommended)

## Deployment Environments

### Development Environment (Devnet)

Use Devnet for testing and development:

```
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Testing Environment (Testnet)

Use Testnet for final testing before mainnet:

```
SOLANA_NETWORK=testnet
SOLANA_RPC_URL=https://api.testnet.solana.com
```

### Production Environment (Mainnet)

Use Mainnet for the final production deployment:

```
SOLANA_NETWORK=mainnet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Deployment Steps

### 1. Environment Configuration

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/vcoin.git
   cd vcoin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the environment:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` according to your requirements
   - Verify all configuration values are correct

### 2. Token Creation

1. Create the token:
   ```bash
   npm run create-token
   ```

2. Verify the token creation:
   - Check the console output for the token address
   - Verify the token exists on the blockchain using Solana Explorer
   - Confirm the token metadata file was created

3. Record important information:
   - Token mint address
   - Authority address
   - Transaction signature

### 3. Token Metadata

1. Add on-chain metadata:
   ```bash
   npm run update-metadata
   ```

2. Verify the metadata:
   - Check the console output for the metadata address
   - Verify the token displays correctly in Solana Explorer
   - Confirm the token metadata file was updated with metadata information

### 4. Token Allocation

1. Allocate tokens:
   ```bash
   npm run allocate-token
   ```

2. Verify the allocation:
   - Check the console output for allocation details
   - Verify each wallet received the correct amount
   - Confirm the token metadata file was updated with allocation information

### 5. Presale Setup

1. Initialize the presale:
   ```bash
   npm run presale init
   ```

2. Verify the presale setup:
   - Check the console output for presale details
   - Confirm the presale wallet is properly configured
   - Verify the presale dates and price

### 6. Vesting Setup

1. Initialize the vesting schedule:
   ```bash
   npm run vesting init
   ```

2. Verify the vesting setup:
   - Check the console output for vesting details
   - Confirm the vesting wallet is properly configured
   - Verify the vesting schedule and release amounts

## Post-Deployment Verification

After deployment, perform these verification steps:

1. **Token Verification**
   - Verify the token exists on the blockchain
   - Verify the token has the correct name, symbol, and decimals
   - Verify the token has the correct total supply

2. **Allocation Verification**
   - Verify each wallet has the correct token balance
   - Verify the sum of all allocations equals the total supply
   - Verify the authority wallet has the expected permissions

3. **Metadata Verification**
   - Verify the token displays correctly in Solana Explorer
   - Verify the token displays correctly in compatible wallets
   - Verify the token metadata is correctly stored on-chain

4. **Security Verification**
   - Verify all keypairs are securely stored
   - Verify all sensitive information is protected
   - Verify access controls are properly implemented

## Rollback Procedures

In case of deployment issues, follow these rollback procedures:

1. **Token Creation Issues**
   - If the token creation fails, simply retry the creation process
   - If the token is created with incorrect parameters, create a new token with correct parameters

2. **Metadata Issues**
   - If metadata update fails, retry the update process
   - If metadata is incorrect, update it with correct information

3. **Allocation Issues**
   - If allocation fails, retry the allocation process
   - If allocation is incorrect, transfer tokens to correct the allocation

4. **Critical Issues**
   - For critical issues, freeze the token if necessary
   - Create a new token with correct parameters if needed
   - Document all issues and resolutions

## Monitoring and Maintenance

After deployment, implement these monitoring and maintenance procedures:

1. **Regular Monitoring**
   - Monitor token transactions
   - Monitor wallet balances
   - Monitor network status

2. **Security Maintenance**
   - Regularly review access controls
   - Rotate keypairs if necessary
   - Update dependencies to address security vulnerabilities

3. **Documentation Maintenance**
   - Keep deployment documentation up-to-date
   - Document all changes to the deployment process
   - Document all issues and resolutions

## Emergency Procedures

In case of emergency, follow these procedures:

1. **Security Breach**
   - Freeze the token if possible
   - Revoke compromised keypairs
   - Notify affected parties
   - Document the breach and response

2. **Network Issues**
   - Switch to alternative RPC endpoints
   - Retry failed transactions
   - Document network issues and resolutions

3. **Critical Bugs**
   - Implement temporary workarounds
   - Develop and deploy fixes
   - Document bugs and fixes

## Deployment Checklist

Use this checklist for each deployment:

- [ ] Environment is properly configured
- [ ] Authority wallet is funded with sufficient SOL
- [ ] Token parameters are correctly set
- [ ] Token is successfully created
- [ ] Metadata is successfully added
- [ ] Tokens are correctly allocated
- [ ] Presale is properly configured
- [ ] Vesting is properly configured
- [ ] All verification steps are completed
- [ ] All deployment information is documented
- [ ] Backup procedures are implemented
- [ ] Monitoring procedures are implemented

## Conclusion

Following this deployment guide will ensure a secure and successful deployment of the VCoin token. Always prioritize security and verification at each step of the process. 