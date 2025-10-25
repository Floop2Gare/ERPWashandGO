#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../frontend/dist');
const target = path.resolve(__dirname, '../dist');

if (!fs.existsSync(source)) {
  console.error(`Expected build output at ${source}, but it was not found.`);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(source, target, { recursive: true });

console.log(`Copied frontend build from ${source} to ${target}.`);
