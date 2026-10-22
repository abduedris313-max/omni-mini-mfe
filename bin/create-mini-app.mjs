#!/usr/bin/env node
import { main } from './omni-mini-mfe.mjs';

main(['create-mini-app', ...process.argv.slice(2)]).catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
