#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const cliPath = path.join(__dirname, '../src/cli.ts');
const tsxBin = path.join(__dirname, '../node_modules/.bin/tsx');

// Determine execution command: use local tsx if present, otherwise npx tsx
const cmd = require('fs').existsSync(tsxBin) ? tsxBin : 'npx';
const args = cmd === 'npx' ? ['tsx', cliPath, ...process.argv.slice(2)] : [cliPath, ...process.argv.slice(2)];

const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  env: process.env
});

process.exit(result.status ?? 0);
