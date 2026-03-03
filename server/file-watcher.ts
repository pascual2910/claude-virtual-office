import { EventEmitter } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import { JsonlTailReader } from './jsonl-parser.js';

export interface FileWatcherEvents {
  'team-config-changed': [config: any];
  'tasks-changed': [tasks: any[]];
  'jsonl-entry': [entry: any];
  error: [err: Error];
}

export class FileWatcher extends EventEmitter<FileWatcherEvents> {
  private claudeDir: string;
  private watchers: FSWatcher[] = [];
  private jsonlReader = new JsonlTailReader();

  constructor(claudeDir?: string) {
    super();
    this.claudeDir = claudeDir ?? path.join(os.homedir(), '.claude');
  }

  /**
   * List available team names from ~/.claude/teams/
   */
  async scanForTeams(): Promise<string[]> {
    const teamsDir = path.join(this.claudeDir, 'teams');
    try {
      const entries = await readdir(teamsDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Start watching for file changes.
   * If teamName is provided, also watches JSONL files for that team's sessions.
   */
  start(teamName?: string): void {
    this.stop();

    // Watch team config files
    const teamConfigPattern = path.join(this.claudeDir, 'teams', '*', 'config.json');
    console.log(`  [FileWatcher] Watching team configs: ${teamConfigPattern}`);
    const teamWatcher = watch(teamConfigPattern, {
      ignoreInitial: false,
      persistent: true,
    });

    teamWatcher.on('add', (filePath) => {
      console.log(`  [FileWatcher] Team config found: ${filePath}`);
      this.handleTeamConfig(filePath);
    });
    teamWatcher.on('change', (filePath) => {
      console.log(`  [FileWatcher] Team config changed: ${filePath}`);
      this.handleTeamConfig(filePath);
    });
    teamWatcher.on('error', (err) => this.emit('error', err instanceof Error ? err : new Error(String(err))));
    this.watchers.push(teamWatcher);

    // Watch task files
    const taskPatterns = [
      path.join(this.claudeDir, 'tasks', '*', '*.json'),
    ];
    console.log(`  [FileWatcher] Watching task files: ${taskPatterns[0]}`);
    const taskWatcher = watch(taskPatterns, {
      ignoreInitial: false,
      persistent: true,
    });

    taskWatcher.on('add', (filePath) => this.handleTaskFile(filePath));
    taskWatcher.on('change', (filePath) => this.handleTaskFile(filePath));
    taskWatcher.on('error', (err) => this.emit('error', err instanceof Error ? err : new Error(String(err))));
    this.watchers.push(taskWatcher);

    // If a specific team is active, watch its JSONL session files
    if (teamName) {
      this.watchJsonlForTeam(teamName);
    }
  }

  /**
   * Watch JSONL files in project directories for a specific team's sessions.
   */
  private watchJsonlForTeam(teamName: string): void {
    // Watch for JSONL files that might appear in the team's task/session directories
    const jsonlPattern = path.join(this.claudeDir, 'projects', '**', '*.jsonl');
    const jsonlWatcher = watch(jsonlPattern, {
      ignoreInitial: false,
      persistent: true,
      depth: 5,
    });

    jsonlWatcher.on('add', (filePath) => this.handleJsonlFile(filePath));
    jsonlWatcher.on('change', (filePath) => this.handleJsonlFile(filePath));
    jsonlWatcher.on('error', (err) => this.emit('error', err instanceof Error ? err : new Error(String(err))));
    this.watchers.push(jsonlWatcher);
  }

  /**
   * Stop all file watchers.
   */
  async stop(): Promise<void> {
    const closePromises = this.watchers.map((w) => w.close());
    await Promise.all(closePromises);
    this.watchers = [];
    this.jsonlReader.resetAll();
  }

  private async handleTeamConfig(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const config = JSON.parse(content);
      this.emit('team-config-changed', config);
    } catch {
      // File might be partially written or invalid JSON
    }
  }

  private async handleTaskFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Task files can be either a single task or an array/object with tasks
      let tasks: any[];
      if (Array.isArray(data)) {
        tasks = data;
      } else if (data.tasks && Array.isArray(data.tasks)) {
        tasks = data.tasks;
      } else if (data.id && data.content) {
        // Single task object
        tasks = [data];
      } else {
        return;
      }

      this.emit('tasks-changed', tasks);
    } catch {
      // File might be partially written or invalid JSON
    }
  }

  private async handleJsonlFile(filePath: string): Promise<void> {
    try {
      const entries = await this.jsonlReader.readNew(filePath);
      for (const entry of entries) {
        this.emit('jsonl-entry', entry);
      }
    } catch {
      // Skip errors reading JSONL files
    }
  }
}
