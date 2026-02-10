#!/usr/bin/env node

import { program } from 'commander';
import { init, encrypt, decrypt } from '../src/index.js';
import fs from 'node:fs/promises';

const packageJson = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url)));

program
  .name('env-vault')
  .description('Securely encrypt/decrypt .env files')
  .version(packageJson.version);

program.command('init')
  .description('Generate an encryption key (.env.key)')
  .action(async () => {
    try {
      const keyPath = await init();
      console.log(`Key generated at ${keyPath}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.command('encrypt')
  .description('Encrypt .env to .env.enc')
  .option('-i, --input-file <path>', 'Input file path', '.env')
  .option('-o, --output-file <path>', 'Output file path', '.env.enc')
  .action(async (options) => {
    try {
      const outputPath = await encrypt(options.inputFile, options.outputFile);
      console.log(`Encrypted to ${outputPath}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.command('decrypt')
  .description('Decrypt .env.enc')
  .option('-i, --input-file <path>', 'Input file path', '.env.enc')
  .option('-o, --output-file <path>', 'Output file path (prints to stdout if omitted)')
  .action(async (options) => {
    try {
      const result = await decrypt(options.inputFile, options.outputFile);
      if (result.type === 'file') {
        console.log(`Decrypted to ${result.path}`);
      } else {
        process.stdout.write(result.data);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
