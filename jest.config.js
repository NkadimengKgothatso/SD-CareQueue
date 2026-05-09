export default {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^https://www\\.gstatic\\.com/firebasejs/.+$": "<rootDir>/__mocks__/firebaseMock.js"
  }
};