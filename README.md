# env-vault (Node.js)

A CLI tool for securely encrypting and decrypting `.env` files for team collaboration.

## Features

- **Secure Encryption**: Uses AES-256-GCM authenticated encryption.
- **Easy to Use**: Simple CLI commands for initializing, encrypting, and decrypting.
- **Flexible**: Supports custom input and output file paths.
- **Zero External Dependencies** (aimed): Uses Node.js standard `crypto` module.

## Installation

You can run `env-vault` directly using `npx`:

```bash
npx env-vault <command>
```

Or install it globally:

```bash
npm install -g env-vault
```

## Usage

### 1. Initialize

Generate a new encryption key (`.env.key`). Do not commit this file to version control.

```bash
npx env-vault init
```

### 2. Encrypt

Encrypt your `.env` file to `.env.enc`. You can commit `.env.enc` to version control.

```bash
npx env-vault encrypt
```

Options:
- `-i, --input-file <path>`: Input file path (default: `.env`)
- `-o, --output-file <path>`: Output file path (default: `.env.enc`)

### 3. Decrypt

Decrypt `.env.enc` using the key in `.env.key`.

```bash
npx env-vault decrypt
```

Options:
- `-i, --input-file <path>`: Input file path (default: `.env.enc`)
- `-o, --output-file <path>`: Output file path. If omitted, prints to stdout.

Example: Decrypt to a file named `.env.production`

```bash
npx env-vault decrypt -o .env.production
```

## Security

This tool uses Node.js `crypto` module with **AES-256-GCM** algorithm.
- Key size: 256 bits (32 bytes)
- IV size: 96 bits (12 bytes), random per encryption
- Auth Tag: 128 bits (16 bytes)

## License

MIT
