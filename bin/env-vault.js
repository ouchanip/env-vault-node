#!/usr/bin/env node

import { program } from 'commander';
import { init, encrypt, decrypt, OverwriteError } from '../src/index.js';
import fs from 'node:fs/promises';

const packageJson = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url)));

const EXIT = { OK: 0, ERROR: 1, OVERWRITE: 2 };
let runtime = { json: false, quiet: false, color: true };

function configureRuntime(options = {}) {
  const parent = program.opts();
  const colorDisabled = options.color === false || parent.color === false;
  runtime = {
    json: Boolean(options.json || parent.json),
    quiet: Boolean(options.quiet || parent.quiet),
    color: Boolean(process.stdout.isTTY && !process.env.NO_COLOR && !process.env.CI && !colorDisabled),
  };
}

const color = {
  green: (s) => runtime.color ? `\x1b[32m${s}\x1b[0m` : s,
  red: (s) => runtime.color ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: (s) => runtime.color ? `\x1b[33m${s}\x1b[0m` : s,
};

function emit(type, data) {
  if (runtime.json) {
    const payload = { ok: type === 'success', type, ...data };
    process.stdout.write(JSON.stringify(payload) + '\n');
    return;
  }

  if (runtime.quiet && type === 'success') return;

  if (type === 'success') {
    console.log(`${color.green('✓')} ${data.message}`);
  } else if (type === 'warn') {
    console.error(`${color.yellow('⚠')} ${data.message}`);
  } else {
    console.error(`${color.red('✗')} ${data.message}`);
  }
}

function addAgentOptions(command) {
  return command
    .option('--json', 'Output a structured JSON object (for scripts and agents)')
    .option('-q, --quiet', 'Suppress successful human-readable output')
    .option('--no-color', 'Disable ANSI color output');
}

program
  .name('env-vault')
  .description('Securely encrypt/decrypt .env files')
  .version(packageJson.version)
  .option('--json', 'Output a structured JSON object (for scripts and agents)')
  .option('-q, --quiet', 'Suppress successful human-readable output')
  .option('--no-color', 'Disable ANSI color output');

addAgentOptions(program.command('init'))
  .description('Generate a new .env.key encryption key')
  .action(async (options) => {
    configureRuntime(options);
    try {
      const keyPath = await init();
      emit('success', { command: 'init', keyPath, message: `Key generated at ${keyPath}` });
      process.exit(EXIT.OK);
    } catch (error) {
      emit('error', { command: 'init', message: error.message });
      process.exit(EXIT.ERROR);
    }
  });

addAgentOptions(program.command('encrypt'))
  .description('Encrypt .env → .env.enc')
  .option('-i, --input-file <path>', 'Input file path', '.env')
  .option('-o, --output-file <path>', 'Output file path', '.env.enc')
  .action(async (options) => {
    configureRuntime(options);
    try {
      const outputPath = await encrypt(options.inputFile, options.outputFile);
      emit('success', {
        command: 'encrypt',
        input: options.inputFile,
        output: outputPath,
        message: `Encrypted ${options.inputFile} → ${outputPath}`,
      });
      process.exit(EXIT.OK);
    } catch (error) {
      emit('error', { command: 'encrypt', message: error.message });
      process.exit(EXIT.ERROR);
    }
  });

addAgentOptions(program.command('decrypt'))
  .description('Decrypt .env.enc → stdout or file')
  .option('-i, --input-file <path>', 'Input file path', '.env.enc')
  .option('-o, --output-file <path>', 'Output file path (prints to stdout if omitted)')
  .option('-f, --force', 'Overwrite existing output file without prompting')
  .action(async (options) => {
    configureRuntime(options);
    try {
      const result = await decrypt(options.inputFile, options.outputFile, { force: options.force || false });

      if (result.type === 'file') {
        emit('success', {
          command: 'decrypt',
          input: options.inputFile,
          output: result.path,
          message: `Decrypted ${options.inputFile} → ${result.path}`,
        });
      } else if (runtime.json) {
        emit('success', { command: 'decrypt', input: options.inputFile, data: result.data });
      } else {
        process.stdout.write(result.data);
      }
      process.exit(EXIT.OK);
    } catch (error) {
      if (error instanceof OverwriteError) {
        emit('warn', { command: 'decrypt', message: error.message, output: error.filepath });
        process.exit(EXIT.OVERWRITE);
      }
      emit('error', { command: 'decrypt', message: error.message });
      process.exit(EXIT.ERROR);
    }
  });

program.parse();
