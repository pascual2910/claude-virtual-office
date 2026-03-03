import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface SetupHooksOptions {
  port: number;
  claudeDir?: string;
}

// Hook event types that the virtual office needs to receive
const HOOK_EVENTS = [
  'SubagentStart',
  'SubagentStop',
  'PreToolUse',
  'PostToolUse',
  'TeammateIdle',
  'TaskCompleted',
  'Stop',
  'Notification',
] as const;

const HOOK_MARKER = 'claude-virtual-office';

/**
 * Read, backup, and deep-merge Claude Code hook entries into ~/.claude/settings.json.
 *
 * Each hook event gets its own curl command with the event name in the URL path,
 * since Claude Code doesn't include the event type in the hook payload.
 */
export function setupHooks(options: SetupHooksOptions): void {
  const { port } = options;
  const claudeDir = options.claudeDir ?? path.join(os.homedir(), '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  // Ensure the claude directory exists
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
    console.log(`  Created ${claudeDir}`);
  }

  // Read existing settings or start from empty object
  let settings: any = {};
  if (existsSync(settingsPath)) {
    try {
      const content = readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    } catch {
      console.error(`  Warning: Could not parse ${settingsPath}, starting fresh.`);
      settings = {};
    }

    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(claudeDir, `settings.json.backup-${timestamp}`);
    try {
      copyFileSync(settingsPath, backupPath);
      console.log(`  Backup: ${backupPath}`);
    } catch (err) {
      console.error(`  Warning: Could not create backup: ${(err as Error).message}`);
    }
  }

  // Ensure hooks object exists
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // First, remove any existing virtual-office hooks (to update URLs)
  for (const eventName of HOOK_EVENTS) {
    if (Array.isArray(settings.hooks[eventName])) {
      settings.hooks[eventName] = settings.hooks[eventName].filter(
        (group: any) => {
          if (!group.hooks || !Array.isArray(group.hooks)) return true;
          return !group.hooks.some(
            (h: any) => h.command && h.command.includes(HOOK_MARKER)
          );
        }
      );
    }
  }

  const added: string[] = [];

  for (const eventName of HOOK_EVENTS) {
    if (!Array.isArray(settings.hooks[eventName])) {
      settings.hooks[eventName] = [];
    }

    // Each event gets its own URL with the event name in the path
    const curlCommand = buildCurlCommand(port, eventName);

    settings.hooks[eventName].push({
      hooks: [
        {
          type: 'command',
          command: curlCommand,
        },
      ],
    });
    added.push(eventName);
  }

  // Write updated settings
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

  console.log(`\n  Configured hooks for: ${added.join(', ')}`);
  console.log(`\n  Restart Claude Code for hooks to take effect.`);
}

/**
 * Build the curl command for a specific hook event.
 * The event name is included in the URL path so the server knows what type it is.
 */
function buildCurlCommand(port: number, eventName: string): string {
  return `cat /dev/stdin | curl -s -X POST http://localhost:${port}/hooks/${eventName} -H 'Content-Type: application/json' -d @- 2>/dev/null || true # ${HOOK_MARKER}`;
}

/**
 * Remove virtual office hooks from settings.json.
 */
export function removeHooks(options?: Partial<SetupHooksOptions>): void {
  const claudeDir = options?.claudeDir ?? path.join(os.homedir(), '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  if (!existsSync(settingsPath)) {
    console.log('  No settings.json found. Nothing to remove.');
    return;
  }

  let settings: any;
  try {
    const content = readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  } catch {
    console.error(`  Could not parse ${settingsPath}`);
    return;
  }

  if (!settings.hooks) {
    console.log('  No hooks configured. Nothing to remove.');
    return;
  }

  let removed = 0;
  for (const eventName of HOOK_EVENTS) {
    if (Array.isArray(settings.hooks[eventName])) {
      const before = settings.hooks[eventName].length;
      settings.hooks[eventName] = settings.hooks[eventName].filter(
        (group: any) => {
          if (!group.hooks || !Array.isArray(group.hooks)) return true;
          return !group.hooks.some(
            (h: any) => h.command && h.command.includes(HOOK_MARKER)
          );
        }
      );
      removed += before - settings.hooks[eventName].length;

      if (settings.hooks[eventName].length === 0) {
        delete settings.hooks[eventName];
      }
    }
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  console.log(`  Removed ${removed} hook entries from ${settingsPath}`);
}
