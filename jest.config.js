export default {
  testEnvironment: "jsdom",

  moduleNameMapper: {
    "^https://www\\.gstatic\\.com/firebasejs/.+$": "<rootDir>/__mocks__/firebaseMock.js",
    "^/Admin_WebPages/(.*)$": "<rootDir>/Admin_WebPages/$1",
    "^/Patients_WebPages/(.*)$": "<rootDir>/Patients_WebPages/$1",
    "^/Staff_Webpages/(.*)$": "<rootDir>/Staff_Webpages/$1"
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
