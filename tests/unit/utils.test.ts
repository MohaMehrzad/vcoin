import {
  TOKEN_DECIMALS,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  tokensToRawAmount,
  rawAmountToTokens,
  getConnection,
  getOrCreateKeypair,
  loadTokenMetadata,
  saveTokenMetadata
} from '../../src/utils';
import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
  dirname: jest.fn(),
}));

describe('Utils Module Tests', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.dirname as jest.Mock).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
  });

  // Create test data
  const mockMetadata = {
    mintAddress: '11111111111111111111111111111111',
    authorityAddress: '22222222222222222222222222222222',
    authorityTokenAccount: '33333333333333333333333333333333',
    totalSupply: '1000000000',
    decimals: 9
  };

  describe('Token Amount Conversion Tests', () => {
    test('tokensToRawAmount correctly multiplies by 10^decimals', () => {
      const testTokenAmount = BigInt(100);
      const expectedRawAmount = testTokenAmount * BigInt(10 ** TOKEN_DECIMALS);
      
      expect(tokensToRawAmount(testTokenAmount)).toBe(expectedRawAmount);
    });

    test('rawAmountToTokens correctly divides by 10^decimals', () => {
      const testRawAmount = BigInt(100000000);
      const expectedTokenAmount = testRawAmount / BigInt(10 ** TOKEN_DECIMALS);
      
      expect(rawAmountToTokens(testRawAmount)).toBe(expectedTokenAmount);
    });

    test('token conversion round trip maintains original value', () => {
      const originalAmount = BigInt(1234567);
      const rawAmount = tokensToRawAmount(originalAmount);
      const roundTrippedAmount = rawAmountToTokens(rawAmount);
      
      expect(roundTrippedAmount).toBe(originalAmount);
    });
  });

  describe('Solana Connection Tests', () => {
    test('getConnection returns a Solana Connection object', () => {
      const connection = getConnection();
      
      expect(connection).toBeInstanceOf(web3.Connection);
    });
  });

  describe('Keypair Management Tests', () => {
    const mockKeypairData = new Uint8Array(64).fill(1);
    const mockKeypair = {
      publicKey: new web3.PublicKey('11111111111111111111111111111111'),
      secretKey: mockKeypairData,
    } as web3.Keypair;

    beforeEach(() => {
      // Mock path.resolve to return a test path
      (path.resolve as jest.Mock).mockReturnValue('/test/path/keypair.json');
      
      // Mock path.dirname to return the directory path
      (path.dirname as jest.Mock).mockReturnValue('/test/path');
      
      // Mock Keypair.generate to return a predictable keypair
      jest.spyOn(web3.Keypair, 'generate').mockReturnValue(mockKeypair);
      
      // Mock Keypair.fromSecretKey
      jest.spyOn(web3.Keypair, 'fromSecretKey').mockReturnValue(mockKeypair);
    });

    test('getOrCreateKeypair creates new keypair if one does not exist', () => {
      // Mock file doesn't exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = getOrCreateKeypair('test');
      
      // Check that directory was created
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/path', { recursive: true });
      
      // Check that keypair was generated
      expect(web3.Keypair.generate).toHaveBeenCalled();
      
      // Check that keypair was saved
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/test/path/keypair.json',
        JSON.stringify(Array.from(mockKeypairData)),
        expect.anything()
      );
      
      // Check that the keypair was returned
      expect(result).toBe(mockKeypair);
    });

    test('getOrCreateKeypair loads existing keypair if one exists', () => {
      // Mock file exists
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Mock readFileSync to return keypair data
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(Array.from(mockKeypairData)));
      
      const result = getOrCreateKeypair('test');
      
      // Check that directory was not created
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      
      // Check that keypair was loaded
      expect(web3.Keypair.fromSecretKey).toHaveBeenCalled();
      
      // Check that keypair was not saved
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      
      // Check that the keypair was returned
      expect(result).toBe(mockKeypair);
    });
  });

  // Add tests for Token Metadata
  describe('Token Metadata Tests', () => {
    beforeEach(() => {
      // Mock path.resolve to return a test path
      (path.resolve as jest.Mock).mockReturnValue('/test/path/token-metadata.json');
      
      // Reset fs mocks
      (fs.existsSync as jest.Mock).mockReset();
      (fs.readFileSync as jest.Mock).mockReset();
      (fs.writeFileSync as jest.Mock).mockReset();
    });

    test('saveTokenMetadata saves metadata with checksum', () => {
      // Set up mocks
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      
      // Call the function
      saveTokenMetadata(mockMetadata);
      
      // Verify writeFileSync was called
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Extract the saved data
      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);
      
      // Verify data
      expect(writtenData).toHaveProperty('checksum');
      expect(writtenData.mintAddress).toBe(mockMetadata.mintAddress);
      expect(writtenData.authorityAddress).toBe(mockMetadata.authorityAddress);
      expect(writtenData.totalSupply).toBe(mockMetadata.totalSupply);
    });
  });
}); 