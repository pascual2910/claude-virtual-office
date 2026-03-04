// Agent status derived from hooks + JSONL events
export type AgentStatus =
  | 'working'
  | 'idle'
  | 'typing'
  | 'reading'
  | 'running-command'
  | 'searching'
  | 'thinking'
  | 'stopped';

// Current tool being used by an agent
export type ToolName =
  | 'Bash'
  | 'Edit'
  | 'Write'
  | 'Read'
  | 'Glob'
  | 'Grep'
  | 'WebFetch'
  | 'WebSearch'
  | 'Agent'
  | 'TodoWrite'
  | 'SendMessage'
  | 'TaskCreate'
  | 'TaskUpdate'
  | string;

export interface Position {
  x: number;
  y: number;
}

export interface FileActivity {
  filePath: string;
  tool: 'Read' | 'Edit' | 'Write';
  timestamp: number;
}

export interface AgentState {
  id: string;
  name: string;
  agentType: string;
  status: AgentStatus;
  currentTool: ToolName | null;
  currentAction: string | null;
  lastMessage: string | null;
  seatPosition: Position;
  taskId: string | null;
  lastActivityTime: number;
  recentFiles: FileActivity[];
}

export interface TaskState {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner: string | null;
  activeForm?: string;
  createdAt?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ChatMessage {
  timestamp: number;
  agentName: string;
  content: string;
  type: 'agent-message' | 'tool-use' | 'system' | 'user-sent' | 'agent-to-agent';
  recipient?: string;
}

export interface VirtualOfficeState {
  teamName: string | null;
  projectPath: string | null;
  agents: AgentState[];
  tasks: TaskState[];
  chatLog: ChatMessage[];
  connected: boolean;
}

// WebSocket message types from server to client
export type WsMessage =
  | { type: 'full-state'; state: VirtualOfficeState }
  | { type: 'agent-updated'; agent: AgentState }
  | { type: 'tasks-updated'; tasks: TaskState[] }
  | { type: 'chat-message'; message: ChatMessage }
  | { type: 'team-changed'; teamName: string | null; agents: AgentState[] }
  | { type: 'project-path'; path: string | null };

// Hook event from Claude Code
export interface HookEvent {
  hook_event_name: string;
  session_id?: string;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  tool_input?: any;
  tool_response?: any;
  teammate_name?: string;
  team_name?: string;
  task_id?: string;
  task_subject?: string;
  last_assistant_message?: string;
  message?: string;
  notification_type?: string;
  [key: string]: any;
}

// Decoration to draw in the office scene
export interface SceneDecoration {
  type: 'bookshelf' | 'plant' | 'window' | 'lamp' | 'coffee-cup' | 'monitor-rack' | 'viewport' | 'partition';
  position: Position;
  width: number;
  height: number;
  color: number;
  accentColor?: number;
}

// Ambient particle configuration
export interface ParticleConfig {
  type: 'dust' | 'stars' | 'steam' | 'none';
  count: number;
  color: number;
  speed: number;
  size: number;
  alpha: number;
}

// Theme definition — each theme is a distinct visual environment
export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  emoji: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    idle: string;
  };
  office: {
    backgroundColor: number;
    deskColor: number;
    deskAccent: number;
    floorColor: number;
    wallColor: number;
    wallAccent: number;
    gridColor: number;
    gridAlpha: number;
    agentGlow: boolean;
    monitorColor: number;
    monitorGlow: number;
    decorations: SceneDecoration[];
    particles: ParticleConfig;
  };
}
