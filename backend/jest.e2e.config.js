module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // E2E tests can live under __tests__/e2e or use *.e2e.ts naming.
  testMatch: ['**/__tests__/**/*.e2e.ts', '**/?(*.)+(e2e).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // No setup file for E2E by default to avoid missing file errors.
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true
      }
    }
  }
};
