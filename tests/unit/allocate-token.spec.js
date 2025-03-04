// JavaScript test file for allocate-token.ts
// Using .spec.js extension to avoid TypeScript compilation

// Mock modules
jest.mock('@solana/web3.js', () => ({
  PublicKey: jest.fn(value => ({
    toString: () => value,
    toBase58: () => value,
    equals: jest.fn(other => value === other.toString())
  })),
  Connection: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue(5000000000)
  })),
  Keypair: {
    fromSecretKey: jest.fn(),
    generate: jest.fn()
  },
  LAMPORTS_PER_SOL: 1000000000
}));

jest.mock('@solana/spl-token', () => ({
  getAccount: jest.fn().mockResolvedValue({
    amount: '10000000000000000' // Very large amount to satisfy all allocations
  }),
  createAssociatedTokenAccountIdempotent: jest.fn().mockResolvedValue({
    toBase58: () => 'mock-token-account',
    toString: () => 'mock-token-account'
  }),
  transfer: jest.fn().mockResolvedValue('mock-tx-id')
}));

jest.mock('../../src/utils', () => ({
  DEV_ALLOCATION: 200000000,
  PRESALE_ALLOCATION: 400000000,
  AIRDROP_ALLOCATION: 100000000,
  VESTING_ALLOCATION: 300000000,
  TOKEN_DECIMALS: 6,
  getConnection: jest.fn().mockReturnValue({
    getBalance: jest.fn().mockResolvedValue(5000000000)
  }),
  getOrCreateKeypair: jest.fn().mockImplementation((name) => {
    const keypairs = {
      authority: { publicKey: new (require('@solana/web3.js')).PublicKey('4rWGcPEZdBKkFU5yCJ9fYDP6qz5o1Cpn6z6eZhpxzQmA'), secretKey: new Uint8Array(64) },
      dev_wallet: { publicKey: new (require('@solana/web3.js')).PublicKey('AZgN9MmLQMPCZqS1SoHj8mLgXQz6uJhEi7p7iJC5dxw4'), secretKey: new Uint8Array(64) },
      presale_wallet: { publicKey: new (require('@solana/web3.js')).PublicKey('Bf6WFt9H2QBJ6KFykMKznJUJx4aJRLAzG7CgTLwSZfAe'), secretKey: new Uint8Array(64) },
      airdrop_wallet: { publicKey: new (require('@solana/web3.js')).PublicKey('E9KYyZD3DMcXEJ4VSgVcSB5g6dHnMAU3oJC3K3QssvLU'), secretKey: new Uint8Array(64) },
      vesting_wallet: { publicKey: new (require('@solana/web3.js')).PublicKey('D9m4KW9isjrwDEeP5qaXHVRfFSzGELhkY5gLfQV1Un5p'), secretKey: new Uint8Array(64) }
    };
    return keypairs[name] || keypairs.authority;
  }),
  loadTokenMetadata: jest.fn().mockReturnValue({
    mintAddress: '6JeNYa8AnE9HREFKUonBL46rkwCeMqKKLdEeiEZXcCLe',
    authorityAddress: '4rWGcPEZdBKkFU5yCJ9fYDP6qz5o1Cpn6z6eZhpxzQmA',
    authorityTokenAccount: '7UqGzAHKmvV8qPPK7uKwMJBQfNXn8yrKKF7kNwZQpnvz',
    totalSupply: '1000000000',
    decimals: 6
  }),
  saveTokenMetadata: jest.fn(),
  tokensToRawAmount: jest.fn(amount => amount.toString() + '000000')
}));

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    mintAddress: '6JeNYa8AnE9HREFKUonBL46rkwCeMqKKLdEeiEZXcCLe',
    authorityAddress: '4rWGcPEZdBKkFU5yCJ9fYDP6qz5o1Cpn6z6eZhpxzQmA',
    authorityTokenAccount: '7UqGzAHKmvV8qPPK7uKwMJBQfNXn8yrKKF7kNwZQpnvz',
    totalSupply: '1000000000',
    decimals: 6
  })),
  existsSync: jest.fn().mockReturnValue(true)
}));

// Get the mocked modules
const { getConnection, getOrCreateKeypair, loadTokenMetadata, saveTokenMetadata } = require('../../src/utils');
const splToken = require('@solana/spl-token');
const fs = require('fs');

// Import the function under test
const { allocateTokens } = require('../../src/allocate-token');

describe('allocate-token.ts Unit Tests', () => {
  // Setup mocks
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('Process exit called');
  });
  
  let consoleLogSpy;
  let consoleErrorSpy;
  
  beforeEach(() => {
    jest.clearAllMocks();
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
  
  it('successfully allocates tokens to all wallets', async () => {
    await allocateTokens();
    
    // Should create token accounts for each wallet
    expect(splToken.createAssociatedTokenAccountIdempotent).toHaveBeenCalledTimes(4);
    
    // Should transfer tokens to each wallet
    expect(splToken.transfer).toHaveBeenCalledTimes(4);
    
    // Should save metadata
    expect(saveTokenMetadata).toHaveBeenCalledTimes(1);
    
    // Check allocations in saved metadata
    const savedData = saveTokenMetadata.mock.calls[0][0];
    expect(savedData.allocations).toBeDefined();
    expect(savedData.allocations.development).toBeDefined();
    expect(savedData.allocations.presale).toBeDefined();
    expect(savedData.allocations.airdrop).toBeDefined();
    expect(savedData.allocations.vesting).toBeDefined();
  });
  
  it('exits when token metadata is not found', async () => {
    loadTokenMetadata.mockImplementationOnce(() => {
      throw new Error('Metadata not found');
    });
    
    await expect(allocateTokens()).rejects.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Token metadata not found'));
  });
  
  it('exits when authority has insufficient token balance', async () => {
    splToken.getAccount.mockResolvedValueOnce({
      amount: '1' // Very small amount
    });
    
    await expect(allocateTokens()).rejects.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('does not have enough tokens'));
  });
}); 