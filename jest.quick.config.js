/**
 * Jest configuration for quick testing without TypeScript checks
 */
module.exports = {
  // Use a lighter preset that doesn't do TypeScript validation
  preset: 'jest-preset-typescript-easy',
  transform: {
    // Use babel to transform both JS and TS files without strict type checking
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest"
  },
  // Ignore TypeScript errors
  globals: {
    'ts-jest': {
      isolatedModules: true, // Disables type checking
      diagnostics: false, // Disables diagnostic messages
    }
  },
  // Test environment
  testEnvironment: 'node',
  // Test match patterns
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}; 