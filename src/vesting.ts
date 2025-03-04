import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotent,
  transfer,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  getConnection,
  getOrCreateKeypair,
  loadTokenMetadata,
  tokensToRawAmount,
  VESTING_RELEASE_AMOUNT,
  VESTING_RELEASE_INTERVAL_MONTHS,
} from './utils';

// Define interfaces for our data structures
export interface VestingRelease {
  releaseNumber: number;
  scheduledDate: string;
  amount: string;
  executed: boolean;
  executionDate: string | null;
  transactionId: string | null;
}

export interface VestingData {
  releases: VestingRelease[];
  totalReleased: number;
  nextReleaseDate: string | null;
  initialized: boolean;
  initializedAt?: string;
  presaleEndDate?: string;
}

// Vesting storage file
export const VESTING_DATA_PATH = path.resolve(process.cwd(), 'vesting-data.json');

// Load vesting data
export function loadVestingData(): VestingData {
  if (!fs.existsSync(VESTING_DATA_PATH)) {
    // Initial vesting schedule
    return {
      releases: [],
      totalReleased: 0,
      nextReleaseDate: null,
      initialized: false,
    };
  }
  return JSON.parse(fs.readFileSync(VESTING_DATA_PATH, 'utf-8'));
}

// Save vesting data
export function saveVestingData(data: VestingData): void {
  fs.writeFileSync(VESTING_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Initialize vesting schedule based on presale end date
export async function initializeVesting(): Promise<VestingData> {
  // Check if presale data exists
  const PRESALE_DATA_PATH = path.resolve(process.cwd(), 'presale-data.json');
  if (!fs.existsSync(PRESALE_DATA_PATH)) {
    throw new Error('Presale data not found. Run presale first.');
  }
  
  const presaleData = JSON.parse(fs.readFileSync(PRESALE_DATA_PATH, 'utf-8'));
  
  if (!presaleData.endTime) {
    throw new Error('Presale has not ended yet. End presale first.');
  }
  
  const presaleEndDate = new Date(presaleData.endTime);
  let vestingData = loadVestingData();
  
  if (vestingData.initialized) {
    console.log('Vesting schedule already initialized.');
    return vestingData;
  }
  
  // Create vesting schedule
  const firstReleaseDate = new Date(presaleEndDate);
  
  // Schedule releases every VESTING_RELEASE_INTERVAL_MONTHS months
  const totalReleases = Number(VESTING_RELEASE_AMOUNT) === 0 ? 0 : Number(VESTING_RELEASE_AMOUNT) * 7; // 7 releases of 50M each
  const schedule: VestingRelease[] = [];
  
  for (let i = 0; i < 7; i++) {
    const releaseDate = new Date(firstReleaseDate);
    releaseDate.setMonth(releaseDate.getMonth() + i * VESTING_RELEASE_INTERVAL_MONTHS);
    
    schedule.push({
      releaseNumber: i + 1,
      scheduledDate: releaseDate.toISOString(),
      amount: VESTING_RELEASE_AMOUNT.toString(),
      executed: false,
      executionDate: null,
      transactionId: null,
    });
  }
  
  vestingData = {
    releases: schedule,
    totalReleased: 0,
    nextReleaseDate: schedule[0].scheduledDate,
    initialized: true,
    initializedAt: new Date().toISOString(),
    presaleEndDate: presaleEndDate.toISOString(),
  };
  
  saveVestingData(vestingData);
  console.log('Vesting schedule initialized successfully.');
  return vestingData;
}

// Execute a vesting release
export async function executeRelease(releaseNumber: number): Promise<void> {
  let vestingData = loadVestingData();
  
  if (!vestingData.initialized) {
    vestingData = await initializeVesting();
  }
  
  if (releaseNumber < 1 || releaseNumber > vestingData.releases.length) {
    throw new Error(`Invalid release number. Valid range: 1-${vestingData.releases.length}`);
  }
  
  const releaseIndex = releaseNumber - 1;
  const release = vestingData.releases[releaseIndex];
  
  if (release.executed) {
    console.log(`Release #${releaseNumber} has already been executed on ${release.executionDate}`);
    return;
  }
  
  const scheduledDate = new Date(release.scheduledDate);
  const now = new Date();
  
  if (now < scheduledDate) {
    console.log(`Release #${releaseNumber} is scheduled for ${scheduledDate.toISOString()}`);
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Time remaining: ${Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`);
    return;
  }
  
  // Get connection to Solana
  const connection = getConnection();
  
  // Load token metadata
  const tokenMetadata = loadTokenMetadata();
  const mintAddress = new PublicKey(tokenMetadata.mintAddress);
  
  // Verify vesting wallet allocation exists
  if (!tokenMetadata.allocations || !tokenMetadata.allocations.vesting) {
    throw new Error('Token allocations not set up correctly. Run allocation script first.');
  }
  
  // Get vesting wallet
  const vestingWalletAddress = new PublicKey(tokenMetadata.allocations.vesting.wallet);
  const vestingTokenAccount = new PublicKey(tokenMetadata.allocations.vesting.tokenAccount);
  const vestingWalletKeypair = getOrCreateKeypair('vesting_wallet');
  
  // Target wallet for release (we'll use the main authority for simplicity)
  const targetWalletKeypair = getOrCreateKeypair('authority');
  
  // Create or get target token account
  const targetTokenAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    vestingWalletKeypair,
    mintAddress,
    targetWalletKeypair.publicKey,
    { commitment: 'confirmed' },
    TOKEN_2022_PROGRAM_ID
  );
  
  // Convert release amount to raw tokens
  const releaseAmount = BigInt(release.amount);
  const rawAmount = tokensToRawAmount(releaseAmount);
  
  console.log(`Executing release #${releaseNumber}: ${releaseAmount} VCN to ${targetWalletKeypair.publicKey.toString()}`);
  
  // Transfer tokens
  const signature = await transfer(
    connection,
    vestingWalletKeypair,
    vestingTokenAccount,
    targetTokenAccount,
    vestingWalletKeypair.publicKey,
    BigInt(rawAmount),
    [],
    { commitment: 'confirmed' },
    TOKEN_2022_PROGRAM_ID
  );
  
  // Update vesting data
  release.executed = true;
  release.executionDate = now.toISOString();
  release.transactionId = signature;
  
  vestingData.totalReleased += Number(releaseAmount);
  
  // Update next release date
  const nextReleaseIndex = vestingData.releases.findIndex((r: VestingRelease) => !r.executed);
  if (nextReleaseIndex !== -1) {
    vestingData.nextReleaseDate = vestingData.releases[nextReleaseIndex].scheduledDate;
  } else {
    vestingData.nextReleaseDate = null;
  }
  
  saveVestingData(vestingData);
  
  console.log(`Release #${releaseNumber} executed successfully!`);
  console.log(`Transaction ID: ${signature}`);
  console.log(`Total released: ${vestingData.totalReleased} VCN`);
  
  if (vestingData.nextReleaseDate) {
    console.log(`Next release scheduled for: ${new Date(vestingData.nextReleaseDate).toISOString()}`);
  } else {
    console.log('All releases have been executed.');
  }
}

// Check vesting status
export function checkVestingStatus(): void {
  try {
    const vestingData = loadVestingData();
    
    if (!vestingData.initialized) {
      console.log('Vesting schedule has not been initialized yet.');
      return;
    }
    
    console.log('===== VCoin Vesting Status =====');
    console.log(`Initialized: ${vestingData.initialized}`);
    console.log(`Initialized at: ${vestingData.initializedAt}`);
    console.log(`Presale end date: ${vestingData.presaleEndDate}`);
    console.log(`Total released: ${vestingData.totalReleased} VCN`);
    console.log(`Next release date: ${vestingData.nextReleaseDate || 'All releases completed'}`);
    console.log('\nRelease Schedule:');
    
    vestingData.releases.forEach((release: VestingRelease, index: number) => {
      console.log(`[${index + 1}] ${new Date(release.scheduledDate).toISOString()} - ${release.amount} VCN - ${release.executed ? 'Executed' : 'Pending'}`);
    });
    
    console.log('================================');
  } catch (error) {
    console.error('Error checking vesting status:', error);
  }
}

// Command line interface
export async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'init':
        await initializeVesting();
        break;
      case 'release':
        if (args.length < 2) {
          console.error('Usage: npm run vesting release <release_index>');
          process.exit(1);
          return;
        }
        const releaseNumber = parseInt(args[1]);
        await executeRelease(releaseNumber);
        break;
      case 'status':
        checkVestingStatus();
        break;
      default:
        console.log('Available commands:');
        console.log('  npm run vesting init - Initialize vesting schedule');
        console.log('  npm run vesting release <release_index> - Execute a vesting release');
        console.log('  npm run vesting status - Check vesting status');
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