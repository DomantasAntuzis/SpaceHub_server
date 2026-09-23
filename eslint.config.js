const js = require('@eslint/js');
const nodePlugin = require('eslint-plugin-n');

module.exports = [
  js.configs.recommended,
  nodePlugin.configs['flat/recommended-script'],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // --- Bug-catching ---
      'no-undef': 'error',
      'no-unused-vars': 'warn',
      'no-const-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      'no-self-compare': 'error',
      'no-constant-condition': 'error',
      'valid-typeof': 'error',
      'no-unsafe-negation': 'error',

      // --- Async/Promise correctness ---
      'no-async-promise-executor': 'error',
      'require-atomic-updates': 'error',
      'require-await': 'warn',

      // --- Node-specific (from eslint-plugin-n) ---
      'n/no-missing-require': 'error',
      'n/no-extraneous-require': 'error',
      'n/no-process-exit': 'warn',
      'n/no-unpublished-require': 'off',

      // --- Consistency / footgun avoidance ---
      eqeqeq: 'error',
      indent: ['error', 2],
      camelcase: ['error', { properties: 'never' }],
      curly: 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      semi: ['error', 'always'],
    },
  },
  {
    // Don't lint generated/vendor folders
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },
];