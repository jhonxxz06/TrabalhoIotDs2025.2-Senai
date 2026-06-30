module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/scripts/'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/helpers/setup.js'],
  clearMocks: true
};
