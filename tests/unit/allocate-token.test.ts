// Set up mocks before importing modules
jest.mock('@solana/web3.js', () => {
  return {
    Connection: jest.fn(),
    Keypair: jest.fn(),
    PublicKey: jest.fn().mockImplementation((value: string) => ({
      toString: () => value,
      toBase58: () => value,
      equals: (other: { toString(): string }) => value === other.toString(),
      toBuffer: () => Buffer.from('mock-public-key-buffer'),  // Add toBuffer method
      toBytes: () => new Uint8Array(32).fill(1),  // Add toBytes method
      toArrayLike: () => Buffer.from('mock-public-key-buffer')  // Add toArrayLike method
    })),
    LAMPORTS_PER_SOL: 1000000000
  };
});
jest.mock('@solana/spl-token');
jest.mock('../../src/utils', () => {
  const originalModule = jest.requireActual('../../src/utils');
  return {
    ...originalModule,
    DEV_ALLOCATION: BigInt(200000000),
    PRESALE_ALLOCATION: BigInt(400000000),
    AIRDROP_ALLOCATION: BigInt(100000000),
    VESTING_ALLOCATION: BigInt(300000000),
    TOKEN_DECIMALS: 6,
    getConnection: jest.fn(),
    getOrCreateKeypair: jest.fn(),
    loadTokenMetadata: jest.fn(),
    saveTokenMetadata: jest.fn(),
    tokensToRawAmount: jest.fn(),
    logAndExit: jest.fn()
  };
});
jest.mock('fs');

// Now import the modules
import { PublicKey, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import {
  DEV_ALLOCATION,
  PRESALE_ALLOCATION,
  AIRDROP_ALLOCATION,
  VESTING_ALLOCATION,
  TOKEN_DECIMALS,
  getConnection,
  getOrCreateKeypair,
  loadTokenMetadata,
  saveTokenMetadata,
  tokensToRawAmount,
  logAndExit
} from '../../src/utils';

// Import the module under test
import { allocateTokens } from '../../src/allocate-token';

describe('Allocate Token Tests', () => {
  // Mock keys and addresses
  const authorityAddress = '4rWGcPEZdBKkFU5yCJ9fYDP6qz5o1Cpn6z6eZhpxzQmA';
  const devWalletAddress = 'AZgN9MmLQMPCZqS1SoHj8mLgXQz6uJhEi7p7iJC5dxw4';
  const presaleWalletAddress = 'Bf6WFt9H2QBJ6KFykMKznJUJx4aJRLAzG7CgTLwSZfAe';
  const airdropWalletAddress = 'E9KYyZD3DMcXEJ4VSgVcSB5g6dHnMAU3oJC3K3QssvLU';
  const vestingWalletAddress = 'D9m4KW9isjrwDEeP5qaXHVRfFSzGELhkY5gLfQV1Un5p';
  const mintAddress = '6JeNYa8AnE9HREFKUonBL46rkwCeMqKKLdEeiEZXcCLe';
  const mintAuthTokenAccount = '7UqGzAHKmvV8qPPK7uKwMJBQfNXn8yrKKF7kNwZQpnvz';
  
  // Mock exit function
  const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`Process.exit called with code: ${code}`);
  });
  
  // Spy on console methods
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup PublicKey mock
    (PublicKey as jest.Mock).mockImplementation((value) => ({
      toString: () => value,
      toBase58: () => value,
      equals: (other) => value === other.toString()
    }));
    
    // Setup Connection mock
    const mockConnection = {
      getBalance: jest.fn().mockResolvedValue(5 * LAMPORTS_PER_SOL)
    };
    (Connection as unknown as jest.Mock).mockImplementation(() => mockConnection);
    
    // Setup keypair mocks
    const mockAuthority = {
      publicKey: new PublicKey(authorityAddress),
      secretKey: new Uint8Array(64),
    };
    const mockDevWallet = {
      publicKey: new PublicKey(devWalletAddress),
      secretKey: new Uint8Array(64),
    };
    const mockPresaleWallet = {
      publicKey: new PublicKey(presaleWalletAddress),
      secretKey: new Uint8Array(64),
    };
    const mockAirdropWallet = {
      publicKey: new PublicKey(airdropWalletAddress),
      secretKey: new Uint8Array(64),
    };
    const mockVestingWallet = {
      publicKey: new PublicKey(vestingWalletAddress),
      secretKey: new Uint8Array(64),
    };
    
    // Setup utils mocks
    (getConnection as jest.Mock).mockReturnValue(mockConnection);
    (getOrCreateKeypair as jest.Mock).mockImplementation((name) => {
      switch(name) {
        case 'authority': return mockAuthority;
        case 'dev_wallet': return mockDevWallet;
        case 'presale_wallet': return mockPresaleWallet;
        case 'airdrop_wallet': return mockAirdropWallet;
        case 'vesting_wallet': return mockVestingWallet;
        default: return mockAuthority;
      }
    });
    
    const tokenMetadata = {
      mintAddress: mintAddress,
      authorityAddress: authorityAddress,
      authorityTokenAccount: mintAuthTokenAccount,
      totalSupply: '1000000000',
      decimals: TOKEN_DECIMALS,
      symbol: 'VCN'  // Add the symbol property that's used in the implementation
    };
    
    (loadTokenMetadata as jest.Mock).mockReturnValue(tokenMetadata);
    (saveTokenMetadata as jest.Mock).mockImplementation((data) => {});
    (tokensToRawAmount as jest.Mock).mockImplementation((amount) => {
      // Convert to BigInt to handle large numbers properly
      return BigInt(amount).toString() + '0'.repeat(TOKEN_DECIMALS);
    });
    (logAndExit as jest.Mock).mockImplementation((message) => {
      console.error(message);
      process.exit(1);
    });
    
    // Setup fs mocks
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      mintAddress: mintAddress,
      authorityAddress: authorityAddress,
      authorityTokenAccount: mintAuthTokenAccount,
      totalSupply: '1000000000',
      decimals: TOKEN_DECIMALS,
      symbol: 'VCN'  // Add the symbol property here too
    }));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    // Setup spl-token mocks
    (splToken.getAccount as jest.Mock).mockResolvedValue({
      amount: '1000000000000' // Very large amount
    });
    (splToken.createAssociatedTokenAccountIdempotent as jest.Mock).mockImplementation(
      async (connection, payer, mint, owner) => {
        return {
          toBase58: () => `associated-token-${owner.toString().substring(0, 5)}`,
          toString: () => `associated-token-${owner.toString().substring(0, 5)}`
        };
      }
    );
    (splToken.transfer as jest.Mock).mockResolvedValue('tx-hash-123');
    
    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  
  afterAll(() => {
    mockExit.mockRestore();
  });
  
  test('allocateTokens should distribute tokens correctly', async () => {
    // Override main function execution
    jest.spyOn(global, 'setTimeout').mockImplementation((cb) => null as any);
    
    await allocateTokens();
    
    // Check if token accounts were created
    expect(splToken.createAssociatedTokenAccountIdempotent).toHaveBeenCalledTimes(4);
    
    // Check if tokens were transferred
    expect(splToken.transfer).toHaveBeenCalledTimes(4);
    
    // Check if metadata was saved
    expect(saveTokenMetadata).toHaveBeenCalledTimes(1);
    const savedData = (saveTokenMetadata as jest.Mock).mock.calls[0][0];
    
    // Verify allocations were recorded
    expect(savedData.allocations).toBeDefined();
    expect(savedData.allocations.development).toBeDefined();
    expect(savedData.allocations.presale).toBeDefined();
    expect(savedData.allocations.airdrop).toBeDefined();
    expect(savedData.allocations.vesting).toBeDefined();
    
    // Verify amounts
    expect(savedData.allocations.development.amount).toBe(DEV_ALLOCATION.toString());
    expect(savedData.allocations.presale.amount).toBe(PRESALE_ALLOCATION.toString());
    expect(savedData.allocations.airdrop.amount).toBe(AIRDROP_ALLOCATION.toString());
    expect(savedData.allocations.vesting.amount).toBe(VESTING_ALLOCATION.toString());
  });
  
  test('allocateTokens should exit if token metadata not found', async () => {
    (loadTokenMetadata as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Metadata not found');
    });
    
    await expect(allocateTokens()).rejects.toThrow('Process.exit called with code: 1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Token metadata not found'));
  });
  
  test('allocateTokens should exit if authority keypair does not match', async () => {
    // Make the authority keypair not match
    (PublicKey.prototype.equals as jest.Mock) = jest.fn().mockReturnValue(false);
    
    await expect(allocateTokens()).rejects.toThrow('Process.exit called with code: 1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('keypair does not match'));
  });
  
  test('allocateTokens should exit if authority has insufficient token balance', async () => {
    (splToken.getAccount as jest.Mock).mockResolvedValueOnce({
      amount: '1'  // Very small amount
    });
    
    await expect(allocateTokens()).rejects.toThrow('Process.exit called with code: 1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('does not have enough tokens'));
  });
}); 