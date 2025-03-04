/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/tests/**/*.spec.js"  // Add support for JavaScript spec files
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/node_modules/**"
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  // Add ts-jest configuration to ignore type checking for faster runs
  globals: {
    'ts-jest': {
      isolatedModules: true, // Disables type checking
      diagnostics: false,   // Disables diagnostic messages
    }
  },
  // Add transform settings for JS files
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
    "^.+\\.jsx?$": "babel-jest"
  },
  // Setup to run before tests
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
}; 