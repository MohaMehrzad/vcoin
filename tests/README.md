# VCoin Test Suite

This directory contains comprehensive test suites for the VCoin (VCN) token implementation. Testing is a critical component of audit preparation and ensures the reliability and security of the token.

## Test Structure

The test suite is organized as follows:

- `unit/` - Unit tests for individual functions and components
- `integration/` - Tests for interactions between components
- `e2e/` - End-to-end tests simulating real-world scenarios
- `security/` - Specific tests targeting security concerns
- `fixtures/` - Test data and fixtures
- `mocks/` - Mock objects for testing

## Test Categories

### Unit Tests

- **Token Creation Tests** (`token.test.ts`)
  - Test token initialization parameters
  - Verify mint authority setup
  - Test metadata creation

- **Token Allocation Tests** (`allocation.test.ts`)
  - Verify correct distribution of tokens
  - Test allocation to various wallets
  - Verify allocation history

- **Presale Tests** (`presale.test.ts`)
  - Test presale start/end logic
  - Verify price calculations
  - Test buyer allocation logic
  - Verify presale cap enforcement

- **Vesting Tests** (`vesting.test.ts`)
  - Test vesting schedule implementation
  - Verify time-based releases
  - Test vesting authorization

- **Utility Tests** (`utils.test.ts`)
  - Test helper functions
  - Verify token conversion calculations
  - Test keypair management functions

### Integration Tests

- **Allocation Workflow Tests** (`allocation-workflow.test.ts`)
  - Test end-to-end allocation process
  - Verify cross-component interactions

- **Presale Workflow Tests** (`presale-workflow.test.ts`)
  - Test complete presale lifecycle
  - Verify interaction with token allocation

- **Vesting Workflow Tests** (`vesting-workflow.test.ts`)
  - Test complete vesting lifecycle
  - Verify interaction with token allocation

### Security Tests

- **Authentication Tests** (`auth.test.ts`)
  - Test access controls
  - Verify signature verification

- **Input Validation Tests** (`validation.test.ts`)
  - Test handling of invalid inputs
  - Verify boundary conditions

- **Error Handling Tests** (`error.test.ts`)
  - Test error recovery scenarios
  - Verify graceful failure modes

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:security

# Run specific test file
npm test -- --testPathPattern=token.test.ts
```

## Test Coverage

Code coverage reports are generated automatically when running tests and can be found in the `coverage/` directory. We maintain a minimum coverage threshold of 80% for all code.

## Writing New Tests

When adding new features or modifying existing ones, follow these guidelines for writing tests:

1. Create unit tests for all new functions
2. Update integration tests if component interactions change
3. Consider security implications and add specific tests for them
4. Ensure tests cover both happy path and error scenarios
5. Document the purpose of each test case

## Pre-Audit Test Checklist

Before submitting for audit, ensure:

- [ ] All tests pass with 100% success rate
- [ ] Code coverage meets minimum thresholds
- [ ] Edge cases and error scenarios are tested
- [ ] Security-specific tests are included
- [ ] Performance tests pass acceptable thresholds 