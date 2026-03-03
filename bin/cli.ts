#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../server/index.js';
import { setupHooks, removeHooks } from '../server/setup-hooks.js';

const program = new Command();

program
  .name('claude-virtual-office')
  .description('Visual virtual office dashboard for Claude Code agent teams')
  .version('1.0.0');

program
  .command('start', { isDefault: true })
  .description('Start the virtual office dashboard')
  .option('-p, --port <number>', 'Port to run on', '3377')
  .option('-t, --team <name>', 'Team name to watch')
  .option('--no-open', 'Do not auto-open browser')
  .action(async (opts) => {
    const port = parseInt(opts.port, 10);
    console.log('\n  Claude Virtual Office\n');
    console.log(`  Starting server on port ${port}...`);

    await startServer({
      port,
      teamName: opts.team,
      openBrowser: opts.open !== false,
    });
  });

program
  .command('setup')
  .description('Add Claude Code hooks for real-time events')
  .option('-p, --port <number>', 'Port the dashboard runs on', '3377')
  .action((opts) => {
    const port = parseInt(opts.port, 10);
    console.log('\n  Claude Virtual Office — Hook Setup\n');
    setupHooks({ port });
  });

program
  .command('remove-hooks')
  .description('Remove Claude Virtual Office hooks from settings')
  .action(() => {
    console.log('\n  Claude Virtual Office — Remove Hooks\n');
    removeHooks();
  });

program.parse();
