import * as web3 from '@solana/web3.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// Load environment variables
dotenv.config();

/**
 * Solana network configuration settings
 * @constant {string} SOLANA_NETWORK - The Solana network to use (mainnet, testnet, devnet)
 * @constant {string} SOLANA_RPC_URL - The RPC URL for connecting to the Solana network
 */
export const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Validate network config
if (!['mainnet', 'testnet', 'devnet'].includes(SOLANA_NETWORK)) {
  throw new Error(`Invalid Solana network: ${SOLANA_NETWORK}. Must be one of: mainnet, testnet, devnet`);
}

if (!SOLANA_RPC_URL.startsWith('http')) {
  throw new Error(`Invalid Solana RPC URL: ${SOLANA_RPC_URL}. Must be a valid URL.`);
}

/**
 * Token configuration settings
 * @constant {string} TOKEN_NAME - The name of the token
 * @constant {string} TOKEN_SYMBOL - The symbol of the token
 * @constant {number} TOKEN_DECIMALS - The decimal places for the token
 * @constant {bigint} TOKEN_TOTAL_SUPPLY - The total supply of the token
 */
export const TOKEN_NAME = process.env.TOKEN_NAME || 'VCoin';
export const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL || 'VCN';
export const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS || '6');
export const TOKEN_TOTAL_SUPPLY = BigInt(process.env.TOKEN_TOTAL_SUPPLY || '1000000000');

// Validate token config
if (!TOKEN_NAME || TOKEN_NAME.length > 32) {
  throw new Error(`Invalid token name: ${TOKEN_NAME}. Must be non-empty and <= 32 characters`);
}

if (!TOKEN_SYMBOL || TOKEN_SYMBOL.length > 10) {
  throw new Error(`Invalid token symbol: ${TOKEN_SYMBOL}. Must be non-empty and <= 10 characters`);
}

if (TOKEN_DECIMALS < 0 || TOKEN_DECIMALS > 9) {
  throw new Error(`Invalid token decimals: ${TOKEN_DECIMALS}. Must be between 0 and 9`);
}

if (TOKEN_TOTAL_SUPPLY <= BigInt(0)) {
  throw new Error(`Invalid token supply: ${TOKEN_TOTAL_SUPPLY}. Must be greater than 0`);
}

/**
 * Distribution configuration settings
 * @constant {bigint} DEV_ALLOCATION - The allocation for development
 * @constant {bigint} PRESALE_ALLOCATION - The allocation for presale
 * @constant {bigint} AIRDROP_ALLOCATION - The allocation for airdrops
 * @constant {bigint} VESTING_ALLOCATION - The allocation for vesting
 */
export const DEV_ALLOCATION = BigInt(process.env.DEV_ALLOCATION || '500000000');
export const PRESALE_ALLOCATION = BigInt(process.env.PRESALE_ALLOCATION || '100000000');
export const AIRDROP_ALLOCATION = BigInt(process.env.AIRDROP_ALLOCATION || '50000000');
export const VESTING_ALLOCATION = BigInt(process.env.VESTING_ALLOCATION || '350000000');

// Validate distribution config
const totalAllocation = DEV_ALLOCATION + PRESALE_ALLOCATION + AIRDROP_ALLOCATION + VESTING_ALLOCATION;
if (totalAllocation !== TOKEN_TOTAL_SUPPLY) {
  throw new Error(`Total allocation (${totalAllocation}) does not match total supply (${TOKEN_TOTAL_SUPPLY})`);
}

/**
 * Presale configuration settings
 * @constant {number} PRESALE_PRICE_USD - The price of the token in USD
 * @constant {Date} PRESALE_START_DATE - The start date of the presale
 * @constant {Date} PRESALE_END_DATE - The end date of the presale
 */
export const PRESALE_PRICE_USD = parseFloat(process.env.PRESALE_PRICE_USD || '0.03');
export const PRESALE_START_DATE = new Date(process.env.PRESALE_START_DATE || '2025-03-05');
export const PRESALE_END_DATE = new Date(process.env.PRESALE_END_DATE || '2025-08-31');

// Validate presale config
if (PRESALE_PRICE_USD <= 0) {
  throw new Error(`Invalid presale price: ${PRESALE_PRICE_USD}. Must be greater than 0`);
}

if (isNaN(PRESALE_START_DATE.getTime())) {
  throw new Error(`Invalid presale start date: ${process.env.PRESALE_START_DATE}`);
}

if (isNaN(PRESALE_END_DATE.getTime())) {
  throw new Error(`Invalid presale end date: ${process.env.PRESALE_END_DATE}`);
}

if (PRESALE_END_DATE <= PRESALE_START_DATE) {
  throw new Error(`Presale end date must be after start date`);
}

/**
 * Vesting configuration settings
 * @constant {bigint} VESTING_RELEASE_AMOUNT - The amount of tokens released per interval
 * @constant {number} VESTING_RELEASE_INTERVAL_MONTHS - The interval in months between releases
 */
export const VESTING_RELEASE_AMOUNT = BigInt(process.env.VESTING_RELEASE_AMOUNT || '50000000');
export const VESTING_RELEASE_INTERVAL_MONTHS = parseInt(process.env.VESTING_RELEASE_INTERVAL_MONTHS || '3');

// Validate vesting config
if (VESTING_RELEASE_AMOUNT <= BigInt(0)) {
  throw new Error(`Invalid vesting release amount: ${VESTING_RELEASE_AMOUNT}. Must be greater than 0`);
}

if (VESTING_RELEASE_INTERVAL_MONTHS <= 0) {
  throw new Error(`Invalid vesting interval: ${VESTING_RELEASE_INTERVAL_MONTHS}. Must be greater than 0`);
}

if (VESTING_ALLOCATION % VESTING_RELEASE_AMOUNT !== BigInt(0)) {
  throw new Error(`Vesting allocation (${VESTING_ALLOCATION}) must be divisible by release amount (${VESTING_RELEASE_AMOUNT})`);
}

/**
 * Converts tokens to raw amount with decimals
 * @param {bigint} tokens - The amount of tokens to convert
 * @returns {bigint} The raw amount with decimals
 * @throws {Error} If tokens is negative
 */
export function tokensToRawAmount(tokens: bigint): bigint {
  if (tokens < BigInt(0)) {
    throw new Error(`Token amount must be non-negative: ${tokens}`);
  }
  return tokens * BigInt(10 ** TOKEN_DECIMALS);
}

/**
 * Converts raw amount to tokens
 * @param {bigint} rawAmount - The raw amount with decimals
 * @returns {bigint} The amount of tokens
 * @throws {Error} If rawAmount is negative
 */
export function rawAmountToTokens(rawAmount: bigint): bigint {
  if (rawAmount < BigInt(0)) {
    throw new Error(`Raw amount must be non-negative: ${rawAmount}`);
  }
  return rawAmount / BigInt(10 ** TOKEN_DECIMALS);
}

/**
 * Creates and returns a connection to the Solana network
 * @returns {web3.Connection} A connection to the Solana network
 */
export function getConnection(): web3.Connection {
  return new web3.Connection(SOLANA_RPC_URL, 'confirmed');
}

/**
 * Validates a keypair name for security
 * @param {string} keyName - The name to validate
 * @throws {Error} If the name contains invalid characters or path traversal attempts
 */
function validateKeypairName(keyName: string): void {
  if (!keyName || typeof keyName !== 'string') {
    throw new Error('Keypair name must be a non-empty string');
  }
  
  // Validate keypair name for security
  const validNameRegex = /^[a-zA-Z0-9-_]+$/;
  if (!validNameRegex.test(keyName)) {
    throw new Error(`Invalid keypair name: ${keyName}. Only alphanumeric characters, hyphens, and underscores are allowed.`);
  }
  
  // Check for path traversal attempts
  if (keyName.includes('..') || keyName.includes('/') || keyName.includes('\\')) {
    throw new Error(`Security violation: Path traversal attempt detected in keypair name: ${keyName}`);
  }
}

/**
 * Gets an existing keypair or creates a new one if it doesn't exist
 * @param {string} keyName - The name of the keypair
 * @returns {web3.Keypair} The keypair
 * @throws {Error} If the keypair name is invalid or if there's an error loading/creating the keypair
 */
export function getOrCreateKeypair(keyName: string): web3.Keypair {
  try {
    // Validate the keypair name
    validateKeypairName(keyName);
    
    const KEYPAIR_PATH = path.resolve(process.cwd(), 'keypairs', `${keyName}.json`);
    
    // Create keypairs directory if it doesn't exist
    const keypairsDir = path.dirname(KEYPAIR_PATH);
    if (!fs.existsSync(keypairsDir)) {
      fs.mkdirSync(keypairsDir, { recursive: true });
    }
    
    let keypair: web3.Keypair;
    
    if (fs.existsSync(KEYPAIR_PATH)) {
      try {
        // Load existing keypair
        const keypairJson = fs.readFileSync(KEYPAIR_PATH, 'utf-8');
        const keypairData = JSON.parse(keypairJson);
        
        // Validate keypair data
        if (!Array.isArray(keypairData) || keypairData.length !== 64) {
          throw new Error(`Invalid keypair data format for ${keyName}`);
        }
        
        keypair = web3.Keypair.fromSecretKey(new Uint8Array(keypairData));
      } catch (error: any) {
        throw new Error(`Failed to load keypair ${keyName}: ${error.message}`);
      }
    } else {
      // Create new keypair
      keypair = web3.Keypair.generate();
      
      try {
        // Save keypair with secure permissions
        fs.writeFileSync(
          KEYPAIR_PATH,
          JSON.stringify(Array.from(keypair.secretKey)),
          { encoding: 'utf-8', mode: 0o600 } // Read/write for owner only
        );
      } catch (error: any) {
        throw new Error(`Failed to save keypair ${keyName}: ${error.message}`);
      }
    }
    
    return keypair;
  } catch (error: any) {
    // Rethrow errors with additional context
    if (error.message.includes('Security violation')) {
      console.error(`SECURITY ALERT: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Token metadata interface
 * @interface TokenMetadata
 */
export interface TokenMetadata {
  mintAddress: string;
  authorityAddress: string;
  authorityTokenAccount: string;
  totalSupply: string;
  decimals: number;
  name?: string;
  symbol?: string;
  programId?: string;
  network?: string;
  allocations?: {
    development: {
      amount: string;
      wallet: string;
      tokenAccount: string;
      txId: string;
    };
    presale: {
      amount: string;
      wallet: string;
      tokenAccount: string;
      txId: string;
    };
    airdrop: {
      amount: string;
      wallet: string;
      tokenAccount: string;
      txId: string;
    };
    vesting: {
      amount: string;
      wallet: string;
      tokenAccount: string;
      txId: string;
    };
  };
  metadataAddress?: string;
  metadataTx?: string;
  [key: string]: any;
}

/**
 * Validates token metadata structure
 * @param {any} data - The data to validate
 * @returns {TokenMetadata} The validated token metadata
 * @throws {Error} If the data is invalid
 */
function validateTokenMetadata(data: any): TokenMetadata {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid token metadata: must be an object');
  }
  
  // Required fields
  if (!data.mintAddress) throw new Error('Token metadata missing mintAddress');
  if (!data.authorityAddress) throw new Error('Token metadata missing authorityAddress');
  if (!data.totalSupply) throw new Error('Token metadata missing totalSupply');
  
  // Validate addresses
  try {
    new web3.PublicKey(data.mintAddress);
    new web3.PublicKey(data.authorityAddress);
  } catch (error: any) {
    throw new Error(`Invalid public key in token metadata: ${error.message}`);
  }
  
  // Validate supply
  try {
    BigInt(data.totalSupply);
  } catch (error: any) {
    throw new Error(`Invalid totalSupply in token metadata: ${error.message}`);
  }
  
  return data as TokenMetadata;
}

/**
 * Saves token metadata to a file
 * @param {TokenMetadata} tokenData - The token metadata to save
 * @throws {Error} If there's an error saving the metadata
 */
export function saveTokenMetadata(tokenData: TokenMetadata): void {
  try {
    const TOKEN_METADATA_PATH = path.resolve(process.cwd(), 'token-metadata.json');
    
    // Add a checksum to detect tampering
    const metadataWithoutChecksum = { ...tokenData };
    delete metadataWithoutChecksum.checksum;
    
    const metadataString = JSON.stringify(metadataWithoutChecksum, null, 2);
    const checksum = createHash('sha256').update(metadataString).digest('hex');
    
    const metadataWithChecksum = {
      ...metadataWithoutChecksum,
      checksum
    };
    
    fs.writeFileSync(
      TOKEN_METADATA_PATH, 
      JSON.stringify(metadataWithChecksum, null, 2), 
      { encoding: 'utf-8', mode: 0o640 } // Read/write for owner, read for group
    );
  } catch (error: any) {
    throw new Error(`Failed to save token metadata: ${error.message}`);
  }
}

/**
 * Loads token metadata from a file
 * @returns {TokenMetadata} The token metadata
 * @throws {Error} If there's an error loading the metadata or if the metadata is invalid
 */
export function loadTokenMetadata(): TokenMetadata {
  try {
    const TOKEN_METADATA_PATH = path.resolve(process.cwd(), 'token-metadata.json');
    
    if (!fs.existsSync(TOKEN_METADATA_PATH)) {
      throw new Error('Token metadata file not found. Create a token first using "npm run create-token"');
    }
    
    const metadataString = fs.readFileSync(TOKEN_METADATA_PATH, 'utf-8');
    const metadata = JSON.parse(metadataString);
    
    // Verify checksum to detect tampering
    if (metadata.checksum) {
      const metadataWithoutChecksum = { ...metadata };
      const savedChecksum = metadataWithoutChecksum.checksum;
      delete metadataWithoutChecksum.checksum;
      
      const calculatedChecksum = createHash('sha256')
        .update(JSON.stringify(metadataWithoutChecksum, null, 2))
        .digest('hex');
        
      if (calculatedChecksum !== savedChecksum) {
        throw new Error('Token metadata integrity check failed. File may have been tampered with.');
      }
    }
    
    return validateTokenMetadata(metadata);
  } catch (error: any) {
    throw new Error(`Failed to load token metadata: ${error.message}`);
  }
} 