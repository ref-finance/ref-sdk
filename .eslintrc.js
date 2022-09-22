module.exports = {
  extends: [
    'react-app',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 0,
  },
};
