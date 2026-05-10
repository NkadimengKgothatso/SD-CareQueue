export default {
  testEnvironment: "jsdom",

  moduleNameMapper: {
    "^https://www\\.gstatic\\.com/firebasejs/.+$": "<rootDir>/__mocks__/firebaseMock.js"
  },

  testPathIgnorePatterns: [
    "/node_modules/",
    "Logic\\.test\\.js$",
    "logic\\.test\\.js$"
  ],

  coveragePathIgnorePatterns: [
    "/node_modules/",
    "Logic\\.js$",
    "logic\\.js$"
  ]
};