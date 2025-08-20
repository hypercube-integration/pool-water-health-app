// .eslintrc.cjs
module.exports = {
  root: true,
  ignorePatterns: ["dist/**", "node_modules/**"],
  overrides: [
    // Frontend (browser)
    {
      files: ["src/**/*.{js,jsx,ts,tsx}"],
      env: { browser: true, es2021: true },
    },
    // Azure Functions (Node)
    {
      files: ["api/**/*.js"],
      env: { node: true, es2021: true },
      parserOptions: { sourceType: "script" }, // CommonJS (require/module)
      globals: { Buffer: "readonly" },
    },
  ],
};
