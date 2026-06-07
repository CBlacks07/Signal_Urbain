module.exports = {
  projects: [
    '<rootDir>/apps/api/jest.config.js',
  ],
  collectCoverageFrom: [
    'apps/*/src/**/*.{js,ts}',
    '!apps/*/src/**/*.module.ts',
    '!apps/*/src/main.ts',
    '!apps/*/src/**/*.interface.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '.module.ts',
  ],
};
