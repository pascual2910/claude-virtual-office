import { EventEmitter } from 'node:events';
import type {
  AgentState,
  AgentStatus,
  ChatMessage,
  FileActivity,
  Position,
  TaskState,
  ToolName,
  VirtualOfficeState,
} from '../shared/types.js';
import { friendlyName } from './friendly-names.js';

const MAX_CHAT_LOG = 500;
const MAX_RECENT_FILES = 20;

interface TaskTimestamps {
  prevStatus: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

function commonDirPrefix(paths: string[]): string | null {
  if (paths.length === 0) return null;
  const segments = paths.map(p => p.split('/'));
  const common: string[] = [];
  for (let i = 0; i < segments[0].length; i++) {
    if (segments.every(s => s[i] === segments[0][i])) {
      common.push(segments[0][i]);
    } else break;
  }
  // Need at least 3 segments to be meaningful (e.g. /Users/name/project)
  return common.length >= 3 ? common.join('/') : null;
}

// Grid layout constants
const GRID_START_X = 150;
const GRID_START_Y = 150;
const GRID_COLS = 2;
const GRID_SPACING = 200;

function seatPosition(index: number): Position {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return {
    x: GRID_START_X + col * GRID_SPACING,
    y: GRID_START_Y + row * GRID_SPACING,
  };
}

export interface StateManagerEvents {
  'state-changed': [];
  'agent-updated': [agent: AgentState];
  'tasks-updated': [tasks: TaskState[]];
  'chat-message': [message: ChatMessage];
  'team-changed': [teamName: string | null, agents: AgentState[]];
  'project-path': [path: string];
}

export class StateManager extends EventEmitter<StateManagerEvents> {
  private state: VirtualOfficeState = {
    teamName: null,
    projectPath: null,
    agents: [],
    tasks: [],
    chatLog: [],
    connected: true,
  };

  // Two task sources — merged on every update
  private _fileTasks: Map<string, TaskState[]> = new Map();
  private _todoTasks: Map<string, TaskState[]> = new Map();

  // Track task timestamps across status transitions
  private _taskTimestamps: Map<string, TaskTimestamps> = new Map();

  // All file paths seen, for project path detection
  private _allFilePaths: Set<string> = new Set();

  /**
   * Set (or replace) the active team and create AgentState entries for each member.
   */
  setTeam(
    name: string,
    members: Array<{ name: string; agentId: string; agentType: string }>
  ): void {
    this.state.teamName = name;
    this.state.agents = members.map((m, i) => ({
      id: m.agentId,
      name: m.name,
      agentType: m.agentType,
      status: 'idle' as AgentStatus,
      currentTool: null,
      currentAction: null,
      lastMessage: null,
      seatPosition: seatPosition(i),
      taskId: null,
      lastActivityTime: Date.now(),
      recentFiles: [],
    }));

    this.emit('team-changed', this.state.teamName, this.state.agents);
    this.emit('state-changed');
  }

  /**
   * Update a specific agent's status. Finds by name or id.
   * If the agent doesn't exist yet, auto-creates it (from hook events).
   */
  updateAgentStatus(
    nameOrId: string,
    status: AgentStatus,
    currentTool?: ToolName | null,
    currentAction?: string | null
  ): void {
    if (nameOrId === 'unknown') return;

    let agent = this.getAgent(nameOrId);
    if (!agent) {
      // Auto-create agent from hook event
      agent = {
        id: nameOrId,
        name: friendlyName(nameOrId),
        agentType: 'agent',
        status,
        currentTool: currentTool ?? null,
        currentAction: currentAction ?? null,
        lastMessage: null,
        seatPosition: seatPosition(this.state.agents.length),
        taskId: null,
        lastActivityTime: Date.now(),
        recentFiles: [],
      };
      this.state.agents.push(agent);
      console.log(`  [State] New agent discovered: ${agent.name} (${nameOrId})`);
      this.emit('team-changed', this.state.teamName, this.state.agents);
      this.emit('state-changed');
      return;
    }

    agent.status = status;
    if (currentTool !== undefined) agent.currentTool = currentTool;
    if (currentAction !== undefined) agent.currentAction = currentAction;
    agent.lastActivityTime = Date.now();

    this.emit('agent-updated', agent);
    this.emit('state-changed');
  }

  /**
   * Track a file read/edit/write for an agent.
   */
  addFileActivity(
    nameOrId: string,
    filePath: string,
    tool: FileActivity['tool']
  ): void {
    const agent = this.getAgent(nameOrId);
    if (!agent) return;

    // Deduplicate: remove existing entry for same file+tool
    agent.recentFiles = agent.recentFiles.filter(
      (f) => !(f.filePath === filePath && f.tool === tool)
    );

    agent.recentFiles.unshift({ filePath, tool, timestamp: Date.now() });
    if (agent.recentFiles.length > MAX_RECENT_FILES) {
      agent.recentFiles = agent.recentFiles.slice(0, MAX_RECENT_FILES);
    }

    // Detect project path from file activity
    if (filePath.startsWith('/')) {
      this._allFilePaths.add(filePath);
      const detected = commonDirPrefix([...this._allFilePaths]);
      if (detected && detected !== this.state.projectPath) {
        this.state.projectPath = detected;
        this.emit('project-path', detected);
      }
    }

    this.emit('agent-updated', agent);
  }

  /**
   * Replace tasks from a specific file source (from FileWatcher).
   */
  updateFileTasks(filePath: string, tasks: TaskState[]): void {
    this._fileTasks.set(filePath, tasks);
    this._mergeAndEmitTasks();
  }

  /**
   * Replace all TodoWrite todos for a specific agent.
   */
  updateTodoTasks(agentIdentifier: string, todos: TaskState[]): void {
    this._todoTasks.set(agentIdentifier, todos);
    this._mergeAndEmitTasks();
  }

  private _mergeAndEmitTasks(): void {
    const merged: TaskState[] = [];
    for (const tasks of this._fileTasks.values()) {
      merged.push(...tasks);
    }
    for (const tasks of this._todoTasks.values()) {
      merged.push(...tasks);
    }

    // Stamp timestamps based on status transitions
    const now = Date.now();
    for (const task of merged) {
      let ts = this._taskTimestamps.get(task.id);
      if (!ts) {
        ts = { prevStatus: task.status, createdAt: task.createdAt ?? now };
        this._taskTimestamps.set(task.id, ts);
      }

      // Detect status transitions
      if (task.status === 'in_progress' && ts.prevStatus !== 'in_progress') {
        ts.startedAt = task.startedAt ?? now;
      }
      if (task.status === 'completed' && ts.prevStatus !== 'completed') {
        ts.completedAt = task.completedAt ?? now;
        if (!ts.startedAt) ts.startedAt = ts.createdAt;
      }
      ts.prevStatus = task.status;

      // Apply timestamps to the task
      task.createdAt = ts.createdAt;
      if (ts.startedAt) task.startedAt = ts.startedAt;
      if (ts.completedAt) task.completedAt = ts.completedAt;
    }

    this.state.tasks = merged;
    this.emit('tasks-updated', this.state.tasks);
    this.emit('state-changed');
  }

  /**
   * Append a chat message, capping the log at MAX_CHAT_LOG.
   */
  addChatMessage(msg: ChatMessage): void {
    this.state.chatLog.push(msg);
    if (this.state.chatLog.length > MAX_CHAT_LOG) {
      this.state.chatLog = this.state.chatLog.slice(-MAX_CHAT_LOG);
    }
    this.emit('chat-message', msg);
    this.emit('state-changed');
  }

  /**
   * Return the full current state (immutable snapshot reference).
   */
  getState(): VirtualOfficeState {
    return this.state;
  }

  /**
   * Find an agent by name or id (case-insensitive name match).
   */
  getAgent(nameOrId: string): AgentState | undefined {
    const lower = nameOrId.toLowerCase();
    return this.state.agents.find(
      (a) => a.id === nameOrId || a.name.toLowerCase() === lower
    );
  }
}
