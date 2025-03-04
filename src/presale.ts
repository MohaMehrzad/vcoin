import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotent,
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
  tokensToRawAmount,
  PRESALE_PRICE_USD,
  PRESALE_START_DATE,
  PRESALE_END_DATE,
} from './utils';

// Presale storage file
const PRESALE_DATA_PATH = path.resolve(process.cwd(), 'presale-data.json');

// Mock function to simulate USD to SOL conversion (would use an oracle in production)
export function getUsdToSolRate(): number {
  // This would typically be fetched from an oracle or price feed
  return 50; // Assuming 1 SOL = $50 USD for this example
}

// Load presale data
export function loadPresaleData(): any {
  if (!fs.existsSync(PRESALE_DATA_PATH)) {
    return {
      participants: [],
      totalTokensSold: 0,
      totalUsdRaised: 0,
      isActive: false,
    };
  }
  return JSON.parse(fs.readFileSync(PRESALE_DATA_PATH, 'utf-8'));
}

// Save presale data
export function savePresaleData(data: any): void {
  fs.writeFileSync(PRESALE_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Check if presale is currently active
export function isPresaleActive(): boolean {
  const now = new Date();
  return now >= PRESALE_START_DATE && now <= PRESALE_END_DATE;
}

// Calculate tokens for a given USD amount
export function calculateTokensForUsd(usdAmount: number): number {
  return usdAmount / PRESALE_PRICE_USD;
}

// Start the presale
export async function startPresale() {
  const presaleData = loadPresaleData();
  
  if (presaleData.isActive) {
    console.log('Presale is already active.');
    return;
  }
  
  if (!isPresaleActive()) {
    console.log('Cannot start presale: Current date is outside the presale date range.');
    console.log(`Presale window: ${PRESALE_START_DATE.toISOString()} to ${PRESALE_END_DATE.toISOString()}`);
    return;
  }
  
  presaleData.isActive = true;
  presaleData.startTime = new Date().toISOString();
  savePresaleData(presaleData);
  
  console.log('Presale has been started successfully!');
  console.log(`Presale price: $${PRESALE_PRICE_USD} per VCN`);
  console.log(`Presale window: ${PRESALE_START_DATE.toISOString()} to ${PRESALE_END_DATE.toISOString()}`);
}

// End the presale
export async function endPresale() {
  const presaleData = loadPresaleData();
  
  if (!presaleData.isActive) {
    console.log('Presale is not active.');
    return;
  }
  
  presaleData.isActive = false;
  presaleData.endTime = new Date().toISOString();
  savePresaleData(presaleData);
  
  console.log('Presale has been ended.');
  console.log(`Total tokens sold: ${presaleData.totalTokensSold} VCN`);
  console.log(`Total USD raised: $${presaleData.totalUsdRaised}`);
}

// Process a presale purchase
export async function processPurchase(buyerAddress: string, usdAmount: number) {
  const presaleData = loadPresaleData();
  
  if (!presaleData.isActive) {
    throw new Error('Presale is not active');
  }
  
  if (!isPresaleActive()) {
    throw new Error('Presale period has ended');
  }
  
  // Calculate token amount based on USD
  const tokenAmount = calculateTokensForUsd(usdAmount);
  
  // Connect to Solana
  const connection = getConnection();
  
  // Load token metadata
  const tokenMetadata = loadTokenMetadata();
  const mintAddress = new PublicKey(tokenMetadata.mintAddress);
  
  // Get presale wallet from allocations
  if (!tokenMetadata.allocations || !tokenMetadata.allocations.presale) {
    throw new Error('Token allocations not set up correctly. Run allocation script first.');
  }
  
  const presaleWalletAddress = new PublicKey(tokenMetadata.allocations.presale.wallet);
  const presaleTokenAccount = new PublicKey(tokenMetadata.allocations.presale.tokenAccount);
  const presaleWalletKeypair = getOrCreateKeypair('presale_wallet');
  
  // Calculate SOL amount based on USD
  const usdToSolRate = getUsdToSolRate();
  const solAmount = usdAmount / usdToSolRate;
  
  // Create buyer's PublicKey
  const buyerPublicKey = new PublicKey(buyerAddress);
  
  // Create token account for buyer if it doesn't exist
  const buyerTokenAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    presaleWalletKeypair,
    mintAddress,
    buyerPublicKey,
    { commitment: 'confirmed' },
    TOKEN_2022_PROGRAM_ID
  );
  
  // Transfer tokens to buyer
  console.log(`Transferring ${tokenAmount} VCN to ${buyerAddress}...`);
  const rawTokenAmount = tokensToRawAmount(BigInt(tokenAmount));
  
  await transfer(
    connection,
    presaleWalletKeypair,
    presaleTokenAccount,
    buyerTokenAccount,
    presaleWalletKeypair.publicKey,
    BigInt(rawTokenAmount),
    [],
    { commitment: 'confirmed' },
    TOKEN_2022_PROGRAM_ID
  );
  
  // Update presale data
  presaleData.participants.push({
    address: buyerAddress,
    usdAmount,
    tokenAmount,
    timestamp: new Date().toISOString(),
  });
  
  presaleData.totalTokensSold += tokenAmount;
  presaleData.totalUsdRaised += usdAmount;
  savePresaleData(presaleData);
  
  console.log('Purchase processed successfully!');
  console.log(`${tokenAmount} VCN transferred to ${buyerAddress}`);
  console.log(`Total tokens sold: ${presaleData.totalTokensSold} VCN`);
  console.log(`Total USD raised: $${presaleData.totalUsdRaised}`);
}

// Check presale status
export function checkPresaleStatus() {
  const presaleData = loadPresaleData();
  const now = new Date();
  
  console.log('===== VCoin Presale Status =====');
  console.log(`Status: ${presaleData.isActive ? 'Active' : 'Inactive'}`);
  console.log(`Start date: ${PRESALE_START_DATE.toISOString()}`);
  console.log(`End date: ${PRESALE_END_DATE.toISOString()}`);
  console.log(`Price per token: $${PRESALE_PRICE_USD}`);
  console.log(`Total tokens sold: ${presaleData.totalTokensSold}`);
  console.log(`Total USD raised: $${presaleData.totalUsdRaised}`);
  console.log(`Number of participants: ${presaleData.participants.length}`);
  console.log('================================');
}

// Command line interface
export async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'start':
        await startPresale();
        break;
      case 'end':
        await endPresale();
        break;
      case 'buy':
        if (args.length < 3) {
          console.error('Usage: npm run presale buy <buyer_address> <usd_amount>');
          process.exit(1);
        }
        const buyerAddress = args[1];
        const usdAmount = parseFloat(args[2]);
        await processPurchase(buyerAddress, usdAmount);
        break;
      case 'status':
        checkPresaleStatus();
        break;
      default:
        console.log('Available commands:');
        console.log('  npm run presale start - Start the presale');
        console.log('  npm run presale end - End the presale');
        console.log('  npm run presale buy <buyer_address> <usd_amount> - Process a purchase');
        console.log('  npm run presale status - Check presale status');
        break;
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Only execute if this file is run directly
if (require.main === module) {
  main();
} 