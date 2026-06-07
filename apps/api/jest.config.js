module.exports = {
  displayName: 'api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.spec.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.module.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
