import { Router, type Request, type Response } from 'express';
import type { AgentStatus, ChatMessage, HookEvent, ToolName } from '../shared/types.js';
import type { StateManager } from './state-manager.js';

/**
 * Map a tool name to an agent display status.
 */
function toolToStatus(toolName: string): AgentStatus {
  switch (toolName) {
    case 'Bash':
      return 'running-command';
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return 'typing';
    case 'Read':
    case 'Glob':
    case 'Grep':
      return 'reading';
    case 'WebFetch':
    case 'WebSearch':
      return 'searching';
    case 'Agent':
      return 'working';
    default:
      return 'working';
  }
}

/**
 * Extract an agent identifier from a hook event.
 * Prefers teammate_name, falls back to agent_id or session_id.
 */
function agentIdentifier(event: HookEvent): string {
  return event.teammate_name ?? event.agent_id ?? event.session_id ?? 'unknown';
}

/**
 * Create an Express Router that handles Claude Code hook events.
 *
 * Claude Code hooks don't include the event name in the payload,
 * so we pass it as a URL path parameter: POST /hooks/:eventName
 * The catch-all POST /hooks also accepts ?event= query param or
 * hook_event_name in the body as fallbacks.
 */
export function createHooksRouter(state: StateManager): Router {
  const router = Router();

  // Handle both /hooks/:eventName and /hooks?event=EventName
  router.post('/hooks/{:eventName}', (req: Request, res: Response) => {
    // Always respond immediately
    res.status(200).json({});

    const event = req.body as HookEvent;
    if (!event || typeof event !== 'object') return;

    // Resolve event name from: URL param > query param > body field
    const eventName =
      req.params.eventName ||
      (req.query.event as string) ||
      event.hook_event_name ||
      '';

    if (!eventName) {
      // Log for debugging — we received a hook but can't identify its type
      console.log('  [Hook] Received event without name:', JSON.stringify(event).slice(0, 200));
      return;
    }

    const id = agentIdentifier(event);

    switch (eventName) {
      case 'SubagentStart': {
        state.updateAgentStatus(id, 'working');
        state.addChatMessage({
          timestamp: Date.now(),
          agentName: id,
          content: `Agent started`,
          type: 'system',
        });
        break;
      }

      case 'SubagentStop': {
        state.updateAgentStatus(id, 'stopped', null, null);
        state.addChatMessage({
          timestamp: Date.now(),
          agentName: id,
          content: `Agent stopped`,
          type: 'system',
        });
        break;
      }

      case 'TeammateIdle': {
        state.updateAgentStatus(id, 'idle', null, null);
        state.addChatMessage({
          timestamp: Date.now(),
          agentName: id,
          content: `${id} went idle`,
          type: 'system',
        });
        break;
      }

      case 'TaskCompleted': {
        const taskSubject = event.task_subject ?? event.task_id ?? 'a task';
        state.addChatMessage({
          timestamp: Date.now(),
          agentName: id,
          content: `Completed: ${taskSubject}`,
          type: 'system',
        });
        break;
      }

      case 'PreToolUse': {
        const toolName = (event.tool_name ?? 'unknown') as ToolName;
        const status = toolToStatus(toolName);
        const action = describeToolAction(toolName, event.tool_input);
        state.updateAgentStatus(id, status, toolName, action);
        state.addChatMessage({
          timestamp: Date.now(),
          agentName: id,
          content: action,
          type: 'tool-use',
        });
        break;
      }

      case 'PostToolUse': {
        state.updateAgentStatus(id, 'working', null, null);
        break;
      }

      case 'Stop': {
        state.updateAgentStatus(id, 'stopped', null, null);
        state.addChatMessage({
          timestamp: Date.now(),
          agentName: id,
          content: `Session stopped`,
          type: 'system',
        });
        break;
      }

      case 'Notification': {
        if (event.message) {
          state.addChatMessage({
            timestamp: Date.now(),
            agentName: id,
            content: event.message,
            type: 'system',
          });
        }
        break;
      }

      default:
        console.log(`  [Hook] Unknown event: ${eventName}`);
        break;
    }
  });

  return router;
}

/**
 * Build a short human-readable description of what a tool is doing.
 */
function describeToolAction(toolName: string, toolInput: any): string {
  if (!toolInput) return toolName;

  switch (toolName) {
    case 'Bash':
      return toolInput.command
        ? `$ ${truncate(toolInput.command, 60)}`
        : 'Running command';
    case 'Read':
      return toolInput.file_path
        ? `Reading ${basename(toolInput.file_path)}`
        : 'Reading file';
    case 'Edit':
      return toolInput.file_path
        ? `Editing ${basename(toolInput.file_path)}`
        : 'Editing file';
    case 'Write':
      return toolInput.file_path
        ? `Writing ${basename(toolInput.file_path)}`
        : 'Writing file';
    case 'Grep':
      return toolInput.pattern
        ? `Searching for "${truncate(toolInput.pattern, 40)}"`
        : 'Searching';
    case 'Glob':
      return toolInput.pattern
        ? `Finding ${truncate(toolInput.pattern, 40)}`
        : 'Finding files';
    case 'WebFetch':
      return toolInput.url
        ? `Fetching ${truncate(toolInput.url, 50)}`
        : 'Fetching URL';
    case 'WebSearch':
      return toolInput.query
        ? `Searching "${truncate(toolInput.query, 40)}"`
        : 'Web search';
    case 'SendMessage':
      return toolInput.recipient
        ? `Messaging ${toolInput.recipient}`
        : 'Sending message';
    case 'TaskUpdate':
      return 'Updating task';
    case 'TaskCreate':
      return 'Creating task';
    default:
      return toolName;
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

function basename(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] ?? filePath;
}
