import { jest } from '@jest/globals';

// We need to mock these modules before importing the module under test
jest.mock('@solana/web3.js');
jest.mock('@solana/spl-token');
jest.mock('fs');
jest.mock('path');
jest.mock('readline');
jest.mock('bs58');
jest.mock('../../src/utils');

// Now we can import the modules
import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as bs58 from 'bs58';
import * as utils from '../../src/utils';

// Import the module we want to test
import * as createToken from '../../src/create-token';

describe('Create Token Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock web3.js
    (web3.Keypair.generate as jest.Mock).mockReturnValue({
      publicKey: { 
        toBytes: () => new Uint8Array(32),
        toBase58: () => 'mockPublicKey',
        toString: () => 'mockPublicKey' 
      },
      secretKey: new Uint8Array(64)
    });
    
    (web3.Keypair.fromSecretKey as jest.Mock).mockReturnValue({
      publicKey: { 
        toBytes: () => new Uint8Array(32),
        toBase58: () => 'mockPublicKey',
        toString: () => 'mockPublicKey' 
      },
      secretKey: new Uint8Array(64)
    });
    
    // Mock Connection
    const mockConnection = {
      getBalance: jest.fn().mockResolvedValue(5 * 1000000000), // 5 SOL
      requestAirdrop: jest.fn().mockResolvedValue('mockAirdropTxId')
    };
    (web3.Connection as jest.Mock).mockImplementation(() => mockConnection);
    
    // Mock SPL Token
    (splToken.createMint as jest.Mock).mockResolvedValue({
      toString: () => 'mockMintAddress'
    });
    
    (splToken.mintTo as jest.Mock).mockResolvedValue('mockTxId');
    
    (splToken.createAssociatedTokenAccountIdempotent as jest.Mock).mockResolvedValue({
      toString: () => 'mockTokenAccount'
    });
    
    // Mock TOKEN_2022_PROGRAM_ID
    Object.defineProperty(splToken, 'TOKEN_2022_PROGRAM_ID', {
      value: {
        toString: () => 'TokenProgram2022'
      },
      configurable: true
    });
    
    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      privateKey: Array.from(new Uint8Array(64))
    }));
    
    // Mock path
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    
    // Mock readline
    (readline.createInterface as jest.Mock).mockReturnValue({
      question: jest.fn((prompt, callback) => callback('mockInput')),
      close: jest.fn()
    });
    
    // Mock bs58
    (bs58.decode as jest.Mock).mockReturnValue(new Uint8Array(64));
    
    // Mock utils
    (utils.getConnection as jest.Mock).mockReturnValue({
      getBalance: jest.fn().mockResolvedValue(5 * 1000000000), // 5 SOL
      requestAirdrop: jest.fn().mockResolvedValue('mockAirdropTxId')
    });
    
    (utils.getOrCreateKeypair as jest.Mock).mockReturnValue({
      publicKey: { 
        toBytes: () => new Uint8Array(32),
        toBase58: () => 'mockPublicKey',
        toString: () => 'mockPublicKey' 
      },
      secretKey: new Uint8Array(64)
    });
    
    // Mock other utils properties
    Object.defineProperty(utils, 'TOKEN_NAME', { value: 'VCoin', configurable: true });
    Object.defineProperty(utils, 'TOKEN_SYMBOL', { value: 'VCN', configurable: true });
    Object.defineProperty(utils, 'TOKEN_DECIMALS', { value: 9, configurable: true });
    Object.defineProperty(utils, 'TOKEN_TOTAL_SUPPLY', { value: 1000000000, configurable: true });
    (utils.tokensToRawAmount as jest.Mock).mockReturnValue('1000000000000000000');
    (utils.saveTokenMetadata as jest.Mock).mockImplementation(() => {});
  });

  describe('Keypair Management', () => {
    test('getOrCreateKeypair is called with authority when getting keypair', async () => {
      // Setup readline to choose option 1 (use existing keypair)
      (readline.createInterface as jest.Mock).mockReturnValue({
        question: jest.fn((prompt, callback) => callback('1')),
        close: jest.fn()
      });
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      await createToken.getKeypairFromPhantom();
      
      expect(utils.getOrCreateKeypair).toHaveBeenCalledWith('authority');
    });
    
    test('writes keypair file when creating from private key', async () => {
      // Setup readline to choose option 2 (create from private key)
      const mockReadlineInterface = {
        question: jest.fn(),
        close: jest.fn()
      };
      
      mockReadlineInterface.question
        .mockImplementationOnce((prompt, callback) => callback('2'))
        .mockImplementationOnce((prompt, callback) => callback('mockPrivateKey'));
      
      (readline.createInterface as jest.Mock).mockReturnValue(mockReadlineInterface);
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      await createToken.getKeypairFromPhantom();
      
      expect(bs58.decode).toHaveBeenCalledWith('mockPrivateKey');
      expect(web3.Keypair.fromSecretKey).toHaveBeenCalled();
    });
    
    test('generates new mint keypair when file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      await createToken.getOrCreateMintKeypair();
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(web3.Keypair.generate).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    
    test('loads existing mint keypair when file exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      await createToken.getOrCreateMintKeypair();
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
    });
  });
  
  describe('Token Creation', () => {
    test('successfully creates token with sufficient SOL balance', async () => {
      // Mock getBalance to return sufficient funds
      const mockConnection = {
        getBalance: jest.fn().mockResolvedValue(2 * 1000000000), // 2 SOL
        requestAirdrop: jest.fn().mockResolvedValue('mockAirdropTxId')
      };
      (utils.getConnection as jest.Mock).mockReturnValue(mockConnection);
      
      // Setup mock keypair
      const mockKeypair = {
        publicKey: { 
          toBytes: () => new Uint8Array(32),
          toBase58: () => 'mockPublicKey',
          toString: () => 'mockPublicKey' 
        },
        secretKey: new Uint8Array(64)
      };
      
      // Mock getKeypairFromPhantom to return the mock keypair
      jest.spyOn(createToken, 'getKeypairFromPhantom').mockResolvedValue(mockKeypair as any);
      
      const result = await createToken.createVCoinToken();
      
      expect(result).toBe('mockMintAddress');
      expect(splToken.createMint).toHaveBeenCalled();
      expect(splToken.mintTo).toHaveBeenCalled();
      expect(utils.saveTokenMetadata).toHaveBeenCalled();
    });
    
    test('fails to create token with insufficient SOL balance', async () => {
      // Mock getBalance to return insufficient funds
      const mockConnection = {
        getBalance: jest.fn().mockResolvedValue(0.01 * 1000000000), // 0.01 SOL
        requestAirdrop: jest.fn().mockResolvedValue('mockAirdropTxId')
      };
      (utils.getConnection as jest.Mock).mockReturnValue(mockConnection);
      
      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(((code) => {
        throw new Error(`Process exited with code: ${code}`);
      }) as any);
      
      // Setup mock keypair
      const mockKeypair = {
        publicKey: { 
          toBytes: () => new Uint8Array(32),
          toBase58: () => 'mockPublicKey',
          toString: () => 'mockPublicKey' 
        },
        secretKey: new Uint8Array(64)
      };
      
      // Mock getKeypairFromPhantom to return the mock keypair
      jest.spyOn(createToken, 'getKeypairFromPhantom').mockResolvedValue(mockKeypair as any);
      
      await expect(createToken.createVCoinToken()).rejects.toThrow();
      
      expect(mockConnection.getBalance).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
    
    test('handles error during token creation', async () => {
      // Mock getBalance to return sufficient funds
      const mockConnection = {
        getBalance: jest.fn().mockResolvedValue(2 * 1000000000), // 2 SOL
        requestAirdrop: jest.fn().mockResolvedValue('mockAirdropTxId')
      };
      (utils.getConnection as jest.Mock).mockReturnValue(mockConnection);
      
      // Setup createMint to throw an error
      (splToken.createMint as jest.Mock).mockRejectedValue(new Error('Mock error'));
      
      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(((code) => {
        throw new Error(`Process exited with code: ${code}`);
      }) as any);
      
      // Setup mock keypair
      const mockKeypair = {
        publicKey: { 
          toBytes: () => new Uint8Array(32),
          toBase58: () => 'mockPublicKey',
          toString: () => 'mockPublicKey' 
        },
        secretKey: new Uint8Array(64)
      };
      
      // Mock getKeypairFromPhantom to return the mock keypair
      jest.spyOn(createToken, 'getKeypairFromPhantom').mockResolvedValue(mockKeypair as any);
      
      await expect(createToken.createVCoinToken()).rejects.toThrow();
      
      expect(splToken.createMint).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
  });
}); 