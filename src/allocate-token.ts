import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotent,
  getAccount,
  transfer,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  getConnection,
  getOrCreateKeypair,
  loadTokenMetadata,
  DEV_ALLOCATION,
  PRESALE_ALLOCATION,
  AIRDROP_ALLOCATION,
  VESTING_ALLOCATION,
  tokensToRawAmount,
  saveTokenMetadata,
} from './utils';

/**
 * Handle errors based on the environment
 * @param error - The error to handle
 */
export function handleError(error?: Error | string): never {
  // In test environment, throw the error for the test to catch
  if (process.env.NODE_ENV === 'test') {
    throw error instanceof Error ? error : new Error(error || 'Unknown error');
  }
  
  // In production, log and exit
  console.error('Error:', error);
  process.exit(1);
}

/**
 * Allocate tokens to different wallets according to tokenomics
 */
export async function allocateTokens() {
  console.log('Starting token allocation...');
  
  // Get connection to Solana network
  const connection = getConnection();
  
  // Load token metadata
  let tokenMetadata;
  try {
    tokenMetadata = loadTokenMetadata();
  } catch (error) {
    handleError('Token metadata not found. Create a token first using "npm run create-token"');
  }
  
  const mintAddress = new PublicKey(tokenMetadata.mintAddress);
  const authorityAddress = new PublicKey(tokenMetadata.authorityAddress);
  const authorityTokenAccount = new PublicKey(tokenMetadata.authorityTokenAccount);
  
  // Get or create authority keypair
  const authorityKeypair = getOrCreateKeypair('authority');
  console.log(`Authority: ${authorityKeypair.publicKey.toString()}`);
  
  // Verify the loaded authority matches the token metadata
  if (!authorityKeypair.publicKey.equals(authorityAddress)) {
    handleError('The loaded authority keypair does not match the token authority.\n' +
      `Expected: ${authorityAddress.toString()}\n` +
      `Loaded: ${authorityKeypair.publicKey.toString()}\n` +
      'Please ensure you are using the same wallet that created the token.');
  }
  
  // Check authority balance
  const solBalance = await connection.getBalance(authorityKeypair.publicKey);
  console.log(`Authority SOL balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);
  
  if (solBalance < 0.1 * LAMPORTS_PER_SOL) {
    handleError('Authority account does not have enough SOL.\n' +
      'Please fund your wallet with at least 0.1 SOL on devnet before continuing.');
  }
  
  // Check token balance
  try {
    const balance = await getAccount(connection, authorityTokenAccount, undefined, TOKEN_2022_PROGRAM_ID);
    console.log(`Current authority token balance: ${balance.amount}`);
    
    const requiredAmount = tokensToRawAmount(
      DEV_ALLOCATION + PRESALE_ALLOCATION + AIRDROP_ALLOCATION + VESTING_ALLOCATION
    );
    
    if (BigInt(balance.amount) < BigInt(requiredAmount)) {
      handleError('Authority does not have enough tokens for allocation.\n' +
        `Required: ${requiredAmount}\n` +
        `Available: ${balance.amount}`);
    }
  } catch (error) {
    handleError(`Error checking token balance: ${error}`);
  }
  
  console.log('\nCreating allocation wallets...');
  
  try {
    // Development wallet
    const devWalletKeypair = getOrCreateKeypair('dev_wallet');
    console.log(`Development wallet: ${devWalletKeypair.publicKey.toString()}`);
    
    // Presale wallet
    const presaleWalletKeypair = getOrCreateKeypair('presale_wallet');
    console.log(`Presale wallet: ${presaleWalletKeypair.publicKey.toString()}`);
    
    // Airdrop wallet
    const airdropWalletKeypair = getOrCreateKeypair('airdrop_wallet');
    console.log(`Airdrop wallet: ${airdropWalletKeypair.publicKey.toString()}`);
    
    // Vesting wallet
    const vestingWalletKeypair = getOrCreateKeypair('vesting_wallet');
    console.log(`Vesting wallet: ${vestingWalletKeypair.publicKey.toString()}`);
    
    // Fund the wallets with SOL if needed
    const walletKeypairs = [devWalletKeypair, presaleWalletKeypair, airdropWalletKeypair, vestingWalletKeypair];
    
    for (const walletKeypair of walletKeypairs) {
      const walletBalance = await connection.getBalance(walletKeypair.publicKey);
      if (walletBalance < 0.01 * LAMPORTS_PER_SOL) {
        console.log(`Wallet ${walletKeypair.publicKey.toString()} needs SOL`);
        console.log(`Current balance: ${walletBalance / LAMPORTS_PER_SOL} SOL`);
        console.log(`You'll need to manually transfer a small amount of SOL (~0.01) to this wallet.`);
      }
    }
    
    // Create token accounts for each wallet
    console.log('\nCreating token accounts for allocation wallets...');
    
    const devTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      authorityKeypair,
      mintAddress,
      devWalletKeypair.publicKey,
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Development token account created: ${devTokenAccount.toString()}`);
    
    const presaleTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      authorityKeypair,
      mintAddress,
      presaleWalletKeypair.publicKey,
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Presale token account created: ${presaleTokenAccount.toString()}`);
    
    const airdropTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      authorityKeypair,
      mintAddress,
      airdropWalletKeypair.publicKey,
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Airdrop token account created: ${airdropTokenAccount.toString()}`);
    
    const vestingTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      authorityKeypair,
      mintAddress,
      vestingWalletKeypair.publicKey,
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Vesting token account created: ${vestingTokenAccount.toString()}`);
    
    // Transfer tokens to allocation wallets
    console.log('\nTransferring tokens to allocation wallets...');
    
    // Send DEV_ALLOCATION tokens to dev wallet
    const devAmount = tokensToRawAmount(DEV_ALLOCATION);
    console.log(`Transferring ${DEV_ALLOCATION} tokens to development wallet...`);
    
    const devTxId = await transfer(
      connection,
      authorityKeypair,
      authorityTokenAccount,
      devTokenAccount,
      authorityKeypair.publicKey,
      BigInt(devAmount),
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Transfer completed. Transaction ID: ${devTxId}`);
    
    // Send PRESALE_ALLOCATION tokens to presale wallet
    const presaleAmount = tokensToRawAmount(PRESALE_ALLOCATION);
    console.log(`Transferring ${PRESALE_ALLOCATION} tokens to presale wallet...`);
    
    const presaleTxId = await transfer(
      connection,
      authorityKeypair,
      authorityTokenAccount,
      presaleTokenAccount,
      authorityKeypair.publicKey,
      BigInt(presaleAmount),
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Transfer completed. Transaction ID: ${presaleTxId}`);
    
    // Send AIRDROP_ALLOCATION tokens to airdrop wallet
    const airdropAmount = tokensToRawAmount(AIRDROP_ALLOCATION);
    console.log(`Transferring ${AIRDROP_ALLOCATION} tokens to airdrop wallet...`);
    
    const airdropTxId = await transfer(
      connection,
      authorityKeypair,
      authorityTokenAccount,
      airdropTokenAccount,
      authorityKeypair.publicKey,
      BigInt(airdropAmount),
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Transfer completed. Transaction ID: ${airdropTxId}`);
    
    // Send VESTING_ALLOCATION tokens to vesting wallet
    const vestingAmount = tokensToRawAmount(VESTING_ALLOCATION);
    console.log(`Transferring ${VESTING_ALLOCATION} tokens to vesting wallet...`);
    
    const vestingTxId = await transfer(
      connection,
      authorityKeypair,
      authorityTokenAccount,
      vestingTokenAccount,
      authorityKeypair.publicKey,
      BigInt(vestingAmount),
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`Transfer completed. Transaction ID: ${vestingTxId}`);
    
    // Update token metadata with allocation information
    tokenMetadata.allocations = {
      development: {
        amount: DEV_ALLOCATION.toString(),
        wallet: devWalletKeypair.publicKey.toString(),
        tokenAccount: devTokenAccount.toString(),
        txId: devTxId,
      },
      presale: {
        amount: PRESALE_ALLOCATION.toString(),
        wallet: presaleWalletKeypair.publicKey.toString(),
        tokenAccount: presaleTokenAccount.toString(),
        txId: presaleTxId,
      },
      airdrop: {
        amount: AIRDROP_ALLOCATION.toString(),
        wallet: airdropWalletKeypair.publicKey.toString(),
        tokenAccount: airdropTokenAccount.toString(),
        txId: airdropTxId,
      },
      vesting: {
        amount: VESTING_ALLOCATION.toString(),
        wallet: vestingWalletKeypair.publicKey.toString(),
        tokenAccount: vestingTokenAccount.toString(),
        txId: vestingTxId,
      },
    };
    
    // Save updated token metadata
    saveTokenMetadata(tokenMetadata);
    
    console.log('\n=========================================');
    console.log('Token allocation completed successfully!');
    console.log('=========================================');
    console.log('Updated token metadata saved to token-metadata.json');
    console.log(`Development: ${DEV_ALLOCATION} ${tokenMetadata.symbol}`);
    console.log(`Presale: ${PRESALE_ALLOCATION} ${tokenMetadata.symbol}`);
    console.log(`Airdrop: ${AIRDROP_ALLOCATION} ${tokenMetadata.symbol}`);
    console.log(`Vesting: ${VESTING_ALLOCATION} ${tokenMetadata.symbol}`);
    console.log('=========================================');
    
    return tokenMetadata;
  } catch (error) {
    handleError(`Error allocating tokens: ${error}`);
  }
}

/**
 * Main execution function that runs when this file is executed directly
 */
export function main() {
  allocateTokens().catch(err => {
    console.error('Error allocating tokens:', err);
    process.exit(1);
  });
}

// Execute the function only when this file is run directly
if (require.main === module) {
  main();
} 