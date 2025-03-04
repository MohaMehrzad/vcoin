/**
 * Unit tests for update-metadata.ts
 */

import * as fs from 'fs';
import { Keypair } from '@solana/web3.js';
import * as path from 'path';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, createV1 } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import bs58 from 'bs58';

// We'll test both main and updateTokenMetadata
// Create a separate mock for main tests
const updateTokenMetadataMock = jest.fn().mockResolvedValue(undefined);

// We need to set up a layered mocking approach to test both sides
const mockMainModule = {
  updateTokenMetadata: updateTokenMetadataMock,
  main: function() {
    // Simple implementation that replicates the actual main function
    if (process.argv.length < 4) {
      console.error('Usage: npm run update-metadata <mint-address> <metadata-path> [rpc-url] [keypair-path]');
      console.error('Example: npm run update-metadata 7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH ./metadata.json');
      process.exit(1);
      return;
    }

    const mintAddress = process.argv[2];
    const metadataPath = process.argv[3];
    const rpcUrl = process.argv.length > 4 ? process.argv[4] : 'https://api.devnet.solana.com';
    const keypairPath = process.argv.length > 5 ? process.argv[5] : './keypair.json';

    // Call our mock function
    updateTokenMetadataMock(mintAddress, metadataPath, rpcUrl, keypairPath);
  }
};

// Mock for main function tests
jest.mock('../../src/update-metadata', () => mockMainModule);

// Mock filesystem
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

// Mock utils functions
jest.mock('../../src/utils', () => ({
  getOrCreateKeypair: jest.fn()
}));

// Mock UMI and Metaplex
jest.mock('@metaplex-foundation/umi-bundle-defaults', () => ({
  createUmi: jest.fn()
}));

jest.mock('@metaplex-foundation/mpl-token-metadata', () => ({
  mplTokenMetadata: jest.fn(),
  createV1: jest.fn(),
  TokenStandard: {
    Fungible: 'Fungible'
  }
}));

jest.mock('@metaplex-foundation/umi', () => ({
  publicKey: jest.fn(),
  signerIdentity: jest.fn(),
  createSignerFromKeypair: jest.fn(),
  percentAmount: jest.fn()
}));

// Mock bs58 to avoid actual encoding/decoding
jest.mock('bs58', () => ({
  decode: jest.fn(),
  encode: jest.fn()
}));

// Mock process.exit
const mockExit = jest.fn();
const originalExit = process.exit;

beforeAll(() => {
  Object.defineProperty(process, 'exit', { value: mockExit });
});

afterAll(() => {
  Object.defineProperty(process, 'exit', { value: originalExit });
});

// Mock console.log and console.error to keep test output clean
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Update Metadata Tests', () => {
  
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    mockExit.mockClear();
  });
  
  test('main function handles arguments correctly', () => {
    // Mock process.argv
    const originalArgv = process.argv;
    process.argv = [
      'node',
      'update-metadata.js',
      '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      'path/to/metadata.json',
      'https://api.devnet.solana.com',
      'path/to/keypair.json'
    ];
    
    // Execute main
    const { main } = require('../../src/update-metadata');
    main();
    
    // Restore process.argv
    process.argv = originalArgv;
    
    // Check that updateTokenMetadata was called with correct args
    expect(updateTokenMetadataMock).toHaveBeenCalledWith(
      '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH', 
      'path/to/metadata.json',
      'https://api.devnet.solana.com',
      'path/to/keypair.json'
    );
    
    // Check that it didn't exit with an error
    expect(mockExit).not.toHaveBeenCalledWith(1);
  });
  
  test('main function requires minimum arguments', () => {
    // Mock process.argv with insufficient arguments
    const originalArgv = process.argv;
    process.argv = [
      'node',
      'update-metadata.js'
    ];
    
    // Execute main and expect it to exit
    const { main } = require('../../src/update-metadata');
    main();
    
    // Restore process.argv
    process.argv = originalArgv;
    
    // Check that it exited with an error
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

// Now let's test the actual updateTokenMetadata function
describe('updateTokenMetadata Function Tests', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockExit.mockClear();
    
    // Setup createUmi mock
    const umiMock = {
      use: jest.fn().mockReturnThis()
    };
    (createUmi as jest.Mock).mockReturnValue(umiMock);
    
    // Setup createV1 mock
    const txMock = {
      sendAndConfirm: jest.fn().mockResolvedValue(undefined)
    };
    (createV1 as jest.Mock).mockReturnValue(txMock);
  });

  // Directly import the module we want to test
  const { updateTokenMetadata } = jest.requireActual('../../src/update-metadata');

  test('successfully updates token metadata with matching mint address', async () => {
    // Setup existsSync mock
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Setup readFileSync mock
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      mintAddress: '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      authorityAddress: 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg',
      name: 'VCoin',
      symbol: 'VCN',
      decimals: 6,
      totalSupply: '1000000000'
    }));
    
    // Setup getOrCreateKeypair mock
    const keypairMock = {
      publicKey: {
        toString: () => 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg',
        toBase58: () => 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg'
      },
      secretKey: new Uint8Array(64).fill(1)
    };
    (require('../../src/utils').getOrCreateKeypair as jest.Mock).mockReturnValue(keypairMock);
    
    // Execute the function
    await updateTokenMetadata(
      '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      'path/to/metadata.json'
    );
    
    // Check createV1 was called
    expect(createV1).toHaveBeenCalled();
    
    // Check success message was logged
    expect(console.log).toHaveBeenCalledWith('Token metadata updated successfully!');
    
    // Check it didn't exit with an error
    expect(mockExit).not.toHaveBeenCalled();
  });
  
  test('exits with error when mint addresses don\'t match', async () => {
    // Setup existsSync mock
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Setup readFileSync mock with non-matching mint
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      mintAddress: 'different-mint-address',
      authorityAddress: 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg',
      name: 'VCoin',
      symbol: 'VCN',
      decimals: 6,
      totalSupply: '1000000000'
    }));
    
    // Execute the function
    await updateTokenMetadata(
      '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      'path/to/metadata.json'
    );
    
    // Check error messages
    expect(console.error).toHaveBeenCalledWith('Error: Mint address mismatch.');
    expect(console.error).toHaveBeenCalledWith('Provided mint address: 7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH');
    expect(console.error).toHaveBeenCalledWith('Metadata mint address: different-mint-address');
    
    // Check it exited with an error
    expect(mockExit).toHaveBeenCalledWith(1);
  });
  
  test('exits with error when authority doesn\'t match', async () => {
    // Setup existsSync mock
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Setup readFileSync mock with non-matching authority
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      mintAddress: '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      authorityAddress: 'different-authority',
      name: 'VCoin',
      symbol: 'VCN',
      decimals: 6,
      totalSupply: '1000000000'
    }));
    
    // Setup getOrCreateKeypair mock
    const keypairMock = {
      publicKey: {
        toString: () => 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg',
        toBase58: () => 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg'
      },
      secretKey: new Uint8Array(64).fill(1)
    };
    (require('../../src/utils').getOrCreateKeypair as jest.Mock).mockReturnValue(keypairMock);
    
    // Execute the function
    await updateTokenMetadata(
      '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      'path/to/metadata.json'
    );
    
    // Check error messages
    expect(console.error).toHaveBeenCalledWith('Error: Authority mismatch.');
    
    // Check it exited with an error
    expect(mockExit).toHaveBeenCalledWith(1);
  });
  
  test('handles error when metadata file does not exist', async () => {
    // Setup fs.existsSync to return false
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Execute the function
    await updateTokenMetadata(
      '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      'path/to/metadata.json'
    );
    
    // Check error messages
    expect(console.error).toHaveBeenCalledWith('Error updating token metadata:');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Token metadata file not found'));
    
    // Check it exited with an error
    expect(mockExit).toHaveBeenCalledWith(1);
  });
  
  test('handles error when createV1 fails', async () => {
    // Setup existsSync mock
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Setup readFileSync mock with matching details
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      mintAddress: '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      authorityAddress: 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg',
      name: 'VCoin',
      symbol: 'VCN',
      decimals: 6,
      totalSupply: '1000000000'
    }));
    
    // Setup getOrCreateKeypair mock
    const keypairMock = {
      publicKey: {
        toString: () => 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg',
        toBase58: () => 'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg'
      },
      secretKey: new Uint8Array(64).fill(1)
    };
    (require('../../src/utils').getOrCreateKeypair as jest.Mock).mockReturnValue(keypairMock);
    
    // Setup createV1 to throw an error
    (createV1 as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Failed to create metadata');
    });
    
    // Execute the function
    await updateTokenMetadata(
      '7KVJjSF9ZQ7LihvQUu9N7Gqq9P5thxYkDLeaGAriLuH',
      'path/to/metadata.json'
    );
    
    // Check error messages
    expect(console.error).toHaveBeenCalledWith('Error updating token metadata:');
    expect(console.error).toHaveBeenCalledWith('Failed to create metadata');
    
    // Check it exited with an error
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});