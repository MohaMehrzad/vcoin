# VCoin - Technical Documentation

## Table of Contents
1. [Architecture and Design](#architecture-and-design)
2. [Module Breakdown](#module-breakdown)
3. [Security Implementation](#security-implementation)
4. [Test Coverage and Strategy](#test-coverage-and-strategy)
5. [Known Edge Cases](#known-edge-cases)
6. [Audit Readiness Assessment](#audit-readiness-assessment)
7. [Improvement Opportunities](#improvement-opportunities)

## Architecture and Design

### High-Level Architecture

The VCoin project implements a complete Solana token ecosystem with several interconnected modules:

```
                  ┌────────────────┐
                  │    utils.ts    │
                  └────────────────┘
                          ▲
                          │
         ┌────────────────┼────────────────┐
         │                │                │
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ create-token.ts│ │update-metadata.ts│ │allocate-token.ts│
└────────────────┘ └────────────────┘ └────────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
                          ▼
              ┌────────────────────┐
              │     presale.ts     │
              └────────────────────┘
                          │
                          ▼
              ┌────────────────────┐
              │     vesting.ts     │
              └────────────────────┘
```

### Design Principles

1. **Modularity**: Each component has a clear responsibility
2. **Reusability**: Common utilities are centralized
3. **Testability**: Code is structured to be easily testable
4. **Error Handling**: Comprehensive error handling throughout
5. **Security-First**: Security considerations are built into the design

### Dependency Flow

- `utils.ts` provides common functionality to all modules
- `create-token.ts` is the first step in the process, creating the token
- `update-metadata.ts` extends token functionality with metadata
- `allocate-token.ts` distributes tokens according to tokenomics
- `presale.ts` manages token sales
- `vesting.ts` handles scheduled token releases

## Module Breakdown

### utils.ts

Core utility functions for:
- Token amount conversion
- Solana connection management
- Keypair management
- Token metadata handling
- Configuration validation

Key functions:
- `tokensToRawAmount(tokens)`: Converts token amount to raw amount
- `getConnection(url?)`: Gets a Solana connection
- `getOrCreateKeypair(keyName)`: Manages keypairs securely
- `loadTokenMetadata()`: Loads and validates token metadata
- `saveTokenMetadata(tokenData)`: Saves token metadata with integrity check

### create-token.ts

Handles the token creation process:
- Authority keypair management
- Token mint creation
- Initial configuration
- Metadata setup

Key functions:
- `getKeypairFromPhantom()`: Manages authority keypair
- `createVCoinToken(existingKeypair, skipBalanceCheck)`: Creates the token
- `main()`: Entry point with CLI argument handling

### update-metadata.ts

Manages on-chain token metadata:
- Uses Metaplex for metadata operations
- Validates authority
- Updates token metadata

Key functions:
- `updateTokenMetadata(mintAddress, metadataPath, rpcUrl, keypairPath)`: Updates metadata
- `main()`: CLI interface for metadata updates

### allocate-token.ts

Distributes tokens according to tokenomics:
- Development allocation
- Presale allocation
- Airdrop allocation
- Vesting allocation

Key functions:
- `allocateTokens()`: Performs token distribution
- `main()`: CLI interface for allocation

### presale.ts

Manages token presale:
- Presale activation/deactivation
- Purchase processing
- Status reporting

Key functions:
- `loadPresaleData()`: Loads presale state
- `savePresaleData(data)`: Saves presale state
- `startPresale()`: Activates the presale
- `endPresale()`: Ends the presale
- `processPurchase(buyerAddress, usdAmount)`: Handles token purchases
- `checkPresaleStatus()`: Reports on presale status

### vesting.ts

Implements token vesting functionality:
- Vesting schedule initialization
- Release execution
- Status reporting

Key functions:
- `loadVestingData()`: Loads vesting state
- `saveVestingData(data)`: Saves vesting state
- `initializeVesting()`: Sets up vesting schedule
- `executeRelease(releaseNumber)`: Releases tokens according to schedule
- `checkVestingStatus()`: Reports on vesting status

## Security Implementation

### Input Validation

- All external inputs are validated
- Parameter types are checked
- Value ranges are enforced
- String inputs are sanitized

Example from `utils.ts`:
```typescript
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
```

### Path Traversal Protection

- File paths are validated
- Directory traversal is prevented
- Absolute paths are resolved safely

### Keypair Security

- Keypairs are stored with restricted permissions
- Private keys are protected
- Authority verification for sensitive operations

Example from `allocate-token.ts`:
```typescript
// Verify the authority matches the token metadata authority
if (authorityKeypair.publicKey.toString() !== tokenMetadata.authorityAddress) {
  console.error(`Error: Authority mismatch.`);
  console.error(`Keypair public key: ${authorityKeypair.publicKey.toString()}`);
  console.error(`Expected authority from metadata: ${tokenMetadata.authorityAddress}`);
  handleError('The keypair does not match the token authority.');
}
```

### Metadata Integrity

- Checksums for metadata verification
- Tamper detection
- Required field validation

Example from `utils.ts`:
```typescript
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
```

### Error Handling

- Comprehensive try/catch blocks
- Error propagation
- Informative error messages
- Fail-safe defaults

## Test Coverage and Strategy

### Coverage Metrics

- Statement coverage: 94.22%
- Branch coverage: 81.1%
- Function coverage: 95.55%
- Line coverage: 94.72%

### Test Categories

1. **Unit Tests**: Testing individual functions
2. **Integration Tests**: Testing module interactions
3. **E2E Tests**: Testing complete workflows
4. **Security Tests**: Testing security mechanisms

### Testing Strategy

- **Mocking**: External dependencies are mocked
- **Edge Cases**: Tests include edge cases
- **Error Paths**: Error conditions are tested
- **Security Scenarios**: Security-related behavior is verified

### Key Test Suites

- `utils.test.ts`: Tests core utilities
- `create-token.spec.js`: Tests token creation
- `update-metadata.test.ts`: Tests metadata management
- `allocate-token.test.ts`: Tests token allocation
- `presale.spec.js`: Tests presale functionality
- `vesting.spec.js`: Tests vesting functionality
- `input-validation.test.ts`: Tests security validation

## Known Edge Cases

### Token Creation

- **Edge Case**: Insufficient SOL balance
- **Handling**: Balance check with clear error message
- **Test**: `should handle insufficient balance error`

### Presale Management

- **Edge Case**: Purchase during inactive presale
- **Handling**: Status check before purchase processing
- **Test**: `processPurchase should throw error when presale is not active`

### Vesting

- **Edge Case**: Release execution before initialization
- **Handling**: Initialization check before release
- **Test**: `should handle uninitialized vesting data`

### Decimal Handling

- **Edge Case**: Precision loss in token calculations
- **Handling**: BigInt usage for precise calculations
- **Test**: `token conversion round trip maintains original value`

## Audit Readiness Assessment

### Strengths

1. **High Test Coverage**: Exceeds 80% branch coverage target
2. **Comprehensive Testing**: Unit, integration, and E2E tests
3. **Security-Focused Design**: Security built into the architecture
4. **Robust Error Handling**: Graceful handling of edge cases
5. **Modularity**: Clear separation of concerns

### Areas for Review

1. **Token Transfers**: Edge cases in transfer operations
2. **Configuration Validation**: Boundary conditions for configuration values
3. **Error Recovery**: Recovery mechanisms after errors
4. **Permission Model**: Authority checking mechanisms

### Pre-Audit Checklist

- [x] All tests passing
- [x] Branch coverage above 80%
- [x] Security-specific tests implemented
- [x] No hard-coded secrets
- [x] Input validation for all user inputs
- [x] Error handling throughout the codebase
- [x] Documentation complete and accurate

## Improvement Opportunities

### Near-term Improvements

1. **Configuration Warnings**: Update deprecated configuration in Jest
2. **Documentation**: Add more inline code documentation
3. **Error Messages**: Enhance user-facing error messages

### Long-term Enhancements

1. **Monitoring**: Add monitoring for token operations
2. **Admin Interface**: Develop admin interface for token management
3. **Transaction History**: Implement transaction history tracking
4. **Analytics**: Add analytics for presale and vesting

---

*This technical documentation is intended for developers and auditors reviewing the VCoin project. For user-oriented documentation, please refer to the README.md file.* 