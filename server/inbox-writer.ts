import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface InboxMessage {
  from: string;
  text: string;
  summary: string;
  timestamp: string;
  color: string;
  read: boolean;
}

export class InboxWriter {
  private claudeDir: string;

  constructor(claudeDir?: string) {
    this.claudeDir = claudeDir ?? path.join(os.homedir(), '.claude');
  }

  /**
   * Send a message to an agent's inbox file.
   * Appends to the existing JSON array, creating the file/dir if needed.
   */
  async sendMessage(
    teamName: string,
    agentName: string,
    message: { text: string; summary: string }
  ): Promise<void> {
    const inboxDir = path.join(this.claudeDir, 'teams', teamName, 'inboxes');
    const inboxPath = path.join(inboxDir, `${agentName}.json`);

    if (!existsSync(inboxDir)) {
      await mkdir(inboxDir, { recursive: true });
    }

    let messages: InboxMessage[] = [];
    try {
      const content = await readFile(inboxPath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) messages = parsed;
    } catch {
      // File doesn't exist or invalid JSON — start fresh
    }

    messages.push({
      from: 'dashboard',
      text: message.text,
      summary: message.summary,
      timestamp: new Date().toISOString(),
      color: 'cyan',
      read: false,
    });

    await writeFile(inboxPath, JSON.stringify(messages, null, 2), 'utf-8');
  }
}
