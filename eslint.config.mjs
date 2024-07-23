import prettier from 'eslint-plugin-prettier'
import etc from 'eslint-plugin-etc'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
})

export default [
	...compat.extends('airbnb-base', 'airbnb-typescript/base', 'prettier'),
	{
		plugins: {
			prettier,
			etc,
			'@typescript-eslint': typescriptEslint,
		},

		languageOptions: {
			globals: {
				...globals.node,
			},

			parser: tsParser,
			ecmaVersion: 12,
			sourceType: 'module',

			parserOptions: {
				project: './tsconfig.json',

				ecmaFeatures: {
					jsx: true,
				},
			},
		},

		settings: {
			'import/parsers': {
				'@typescript-eslint/parser': ['.ts', '.tsx'],
			},

			'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
		},

		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-shadow': 'off',
			'@typescript-eslint/no-throw-literal': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-use-before-define': 'warn',
			'arrow-body-style': 'off',
			'consistent-return': 'off',
			eqeqeq: 'off',
			'etc/no-commented-out-code': 'warn',
			'implicit-arrow-linebreak': 'off',

			'import/extensions': [
				'warn',
				'ignorePackages',
				{
					js: 'never',
					jsx: 'never',
					ts: 'never',
					tsx: 'never',
				},
			],

			'import/no-cycle': 'off',
			'import/no-extraneous-dependencies': 'off',
			'import/no-import-module-exports': 'off',
			'import/prefer-default-export': 'off',

			'no-console': [
				'error',
				{
					allow: ['warn', 'error', 'info'],
				},
			],

			'no-mixed-spaces-and-tabs': 'off',
			'no-tabs': 0,
			'no-throw-literal': 'off',
			'no-underscore-dangle': 'off',
			'no-unused-expressions': 'off',
			'no-unused-vars': 'off',
			'operator-linebreak': 'off',
			'prefer-const': 'warn',
			'prefer-destructuring': 'warn',
			semi: ['warn', 'never'],
		},
	},
]
