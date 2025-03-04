// Import actual modules for direct testing
const { describe, test, expect, jest, beforeEach, afterEach } = require('@jest/globals');

// Mock the imported modules but use requireActual for the module under test
jest.mock('@solana/web3.js', () => {
  const originalModule = jest.requireActual('@solana/web3.js');
  return {
    ...originalModule,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(1 * 1000000000), // 1 SOL
      requestAirdrop: jest.fn().mockResolvedValue('mockAirdropTxId')
    })),
    Keypair: {
      ...originalModule.Keypair,
      fromSecretKey: jest.fn().mockImplementation((secretKey) => ({
        publicKey: { toString: () => 'mocked-public-key' },
        secretKey,
      })),
      generate: jest.fn().mockReturnValue({
        publicKey: { toString: () => 'generated-public-key' },
        secretKey: new Uint8Array([1, 2, 3, 4]),
      }),
    },
    PublicKey: jest.fn().mockImplementation((key) => ({
      toString: () => key || 'mocked-public-key',
    })),
    LAMPORTS_PER_SOL: 1000000000,
  };
});

jest.mock('@solana/spl-token', () => {
  return {
    TOKEN_2022_PROGRAM_ID: {
      toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    },
    createMint: jest.fn().mockResolvedValue({
      toString: () => 'mint123456789',
    }),
    createAssociatedTokenAccountIdempotent: jest.fn().mockResolvedValue({
      toString: () => 'tokenAccount123456789',
    }),
    mintTo: jest.fn().mockResolvedValue('mintTxSignature123456'),
    ExtensionType: {
      MintCloseAuthority: 1,
      TransferFeeConfig: 2,
    },
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockImplementation((path) => {
    if (path.includes('mint.json')) {
      return JSON.stringify([1, 2, 3, 4, 5]);
    }
    if (path.includes('token-metadata.json')) {
      return JSON.stringify({
        mintAddress: 'mint123456789',
        authorityAddress: 'authority123456789',
      });
    }
    return '';
  }),
}));

jest.mock('path', () => ({
  resolve: jest.fn().mockImplementation((...args) => args.join('/')),
}));

jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn((question, callback) => callback('test-private-key')),
    close: jest.fn(),
  }),
}));

jest.mock('bs58', () => ({
  decode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5])),
}));

// Mock process.exit so it doesn't actually exit the test
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`Process.exit called with code: ${code}`);
});

// Mock console methods
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Import the actual module - this won't re-execute the mocks
const createTokenModule = require('../../src/create-token');

describe('Create Token Direct Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getKeypairFromPhantom', () => {
    test('should create keypair from private key', async () => {
      const fs = require('fs');
      const bs58 = require('bs58');
      const { Keypair } = require('@solana/web3.js');
      
      // Setup to choose option 2 (new keypair)
      const readline = require('readline');
      const mockRL = readline.createInterface;
      
      mockRL.mockReturnValueOnce({
        question: jest.fn()
          .mockImplementationOnce((_, callback) => callback('2')) // Choice 2
          .mockImplementationOnce((_, callback) => callback('test-private-key')), // Private key
        close: jest.fn(),
      });
      
      fs.existsSync.mockReturnValue(true); // Keypair exists
      
      const result = await createTokenModule.getKeypairFromPhantom();
      
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('authority.json'));
      expect(bs58.decode).toHaveBeenCalledWith('test-private-key');
      expect(Keypair.fromSecretKey).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result.publicKey.toString()).toBe('mocked-public-key');
    });
    
    test('should use existing keypair', async () => {
      const fs = require('fs');
      const readline = require('readline');
      
      // Setup to choose option 1 (use existing)
      const mockRL = readline.createInterface;
      mockRL.mockReturnValueOnce({
        question: jest.fn()
          .mockImplementationOnce((_, callback) => callback('1')),
        close: jest.fn(),
      });
      
      fs.existsSync.mockReturnValue(true); // Keypair exists
      
      const result = await createTokenModule.getKeypairFromPhantom();
      
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('authority.json'));
      expect(result).toBeDefined();
    });
    
    test('should handle error when creating keypair', async () => {
      const fs = require('fs');
      const bs58 = require('bs58');
      
      // Setup to make bs58.decode throw an error
      bs58.decode.mockImplementationOnce(() => {
        throw new Error('Invalid private key');
      });
      
      // Setup readline for option 2 (new keypair)
      const readline = require('readline');
      const mockRL = readline.createInterface;
      mockRL.mockReturnValueOnce({
        question: jest.fn()
          .mockImplementationOnce((_, callback) => callback('2'))
          .mockImplementationOnce((_, callback) => callback('invalid-key')),
        close: jest.fn(),
      });
      
      await expect(createTokenModule.getKeypairFromPhantom()).rejects.toThrow();
      
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('getOrCreateMintKeypair', () => {
    test('should generate new keypair when file does not exist', async () => {
      const fs = require('fs');
      const { Keypair } = require('@solana/web3.js');
      
      fs.existsSync.mockReturnValue(false);
      
      const result = await createTokenModule.getOrCreateMintKeypair();
      
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('mint.json'));
      expect(Keypair.generate).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result.publicKey.toString()).toBe('generated-public-key');
    });
    
    test('should load existing keypair when file exists', async () => {
      const fs = require('fs');
      const { Keypair } = require('@solana/web3.js');
      
      fs.existsSync.mockReturnValue(true);
      
      const result = await createTokenModule.getOrCreateMintKeypair();
      
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('mint.json'));
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(Keypair.fromSecretKey).toHaveBeenCalled();
      expect(result.publicKey.toString()).toBe('mocked-public-key');
    });
    
    test('should handle error when loading keypair', async () => {
      const fs = require('fs');
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementationOnce(() => {
        throw new Error('File read error');
      });
      
      await expect(createTokenModule.getOrCreateMintKeypair()).rejects.toThrow('File read error');
      
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('writeMintKeypairFile', () => {
    test('should save keypair to file', async () => {
      const fs = require('fs');
      
      const mockKeypair = {
        secretKey: new Uint8Array([1, 2, 3, 4]),
      };
      
      await createTokenModule.writeMintKeypairFile(mockKeypair);
      
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    
    test('should handle error when saving keypair', async () => {
      const fs = require('fs');
      
      fs.writeFileSync.mockImplementationOnce(() => {
        throw new Error('File write error');
      });
      
      const mockKeypair = {
        secretKey: new Uint8Array([1, 2, 3, 4]),
      };
      
      await expect(createTokenModule.writeMintKeypairFile(mockKeypair)).rejects.toThrow('File write error');
      
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('createVCoinToken', () => {
    test('should create token successfully with sufficient balance', async () => {
      const { Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
      const { createMint, TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountIdempotent, mintTo } = require('@solana/spl-token');
      
      // Mock sufficient balance
      const mockConnection = new Connection();
      mockConnection.getBalance.mockResolvedValue(0.5 * LAMPORTS_PER_SOL);
      
      // Mock to skip the user prompt
      jest.spyOn(createTokenModule, 'getKeypairFromPhantom').mockResolvedValue({
        publicKey: { toString: () => 'authority-public-key' },
        secretKey: new Uint8Array([1, 2, 3, 4]),
      });
      
      jest.spyOn(createTokenModule, 'getOrCreateMintKeypair').mockResolvedValue({
        publicKey: { toString: () => 'mint-public-key' },
        secretKey: new Uint8Array([5, 6, 7, 8]),
      });
      
      const result = await createTokenModule.createVCoinToken();
      
      expect(createMint).toHaveBeenCalled();
      expect(createAssociatedTokenAccountIdempotent).toHaveBeenCalled();
      expect(mintTo).toHaveBeenCalled();
      expect(result).toBe('mint123456789');
    });
    
    test('should fail with insufficient balance', async () => {
      const { Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
      
      // Mock insufficient balance
      const mockConnection = new Connection();
      mockConnection.getBalance.mockResolvedValue(0.01 * LAMPORTS_PER_SOL);
      
      // Mock to skip the user prompt
      jest.spyOn(createTokenModule, 'getKeypairFromPhantom').mockResolvedValue({
        publicKey: { toString: () => 'authority-public-key' },
        secretKey: new Uint8Array([1, 2, 3, 4]),
      });
      
      await expect(createTokenModule.createVCoinToken()).rejects.toThrow('Process.exit called with code: 1');
      
      expect(mockExit).toHaveBeenCalledWith(1);
    });
    
    test('should handle error during token creation', async () => {
      const { Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
      const { createMint } = require('@solana/spl-token');
      
      // Mock sufficient balance
      const mockConnection = new Connection();
      mockConnection.getBalance.mockResolvedValue(0.5 * LAMPORTS_PER_SOL);
      
      // Mock to skip the user prompt
      jest.spyOn(createTokenModule, 'getKeypairFromPhantom').mockResolvedValue({
        publicKey: { toString: () => 'authority-public-key' },
        secretKey: new Uint8Array([1, 2, 3, 4]),
      });
      
      jest.spyOn(createTokenModule, 'getOrCreateMintKeypair').mockResolvedValue({
        publicKey: { toString: () => 'mint-public-key' },
        secretKey: new Uint8Array([5, 6, 7, 8]),
      });
      
      // Make createMint throw an error
      createMint.mockRejectedValueOnce(new Error('Token creation error'));
      
      await expect(createTokenModule.createVCoinToken()).rejects.toThrow('Process.exit called with code: 1');
      
      expect(console.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
}); 