<script lang="ts">
  import { officeState, selection, selectAgent } from '../state/store.svelte';
  import { sendMessageToAgent, wakeAgent } from '../state/api-client';
  import type { AgentState } from '../../../shared/types';

  let selectedAgent: AgentState | null = $derived(
    selection.agentId
      ? officeState.agents.find(a => a.id === selection.agentId) ?? null
      : null
  );

  let quickMessage = $state('');
  let sending = $state(false);

  const statusLabels: Record<string, string> = {
    working: 'Working',
    typing: 'Typing',
    reading: 'Reading',
    'running-command': 'Running command',
    searching: 'Searching',
    thinking: 'Thinking',
    idle: 'Idle',
    stopped: 'Stopped',
  };

  const statusColors: Record<string, string> = {
    working: '#3b82f6',
    typing: '#8b5cf6',
    reading: '#06b6d4',
    'running-command': '#f59e0b',
    searching: '#10b981',
    thinking: '#6366f1',
    idle: '#6b7280',
    stopped: '#374151',
  };

  function timeSince(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  }

  async function handleSendQuick() {
    const text = quickMessage.trim();
    if (!text || !selectedAgent || !officeState.teamName) return;
    sending = true;
    quickMessage = '';
    try {
      await sendMessageToAgent(officeState.teamName, selectedAgent.name, text);
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      sending = false;
    }
  }

  async function handleWake() {
    if (!selectedAgent || !officeState.teamName) return;
    try {
      await wakeAgent(officeState.teamName, selectedAgent.name);
    } catch (err) {
      console.error('Failed to wake:', err);
    }
  }
</script>

{#if selectedAgent}
  <div class="agent-detail-overlay" onclick={(e) => { if (e.target === e.currentTarget) selectAgent(null); }}>
    <div class="agent-detail-card">
      <!-- Header -->
      <div class="card-header">
        <div class="flex items-center gap-2.5">
          <div
            class="agent-avatar"
            style="background-color: {statusColors[selectedAgent.status] ?? '#6b7280'}"
          >
            {selectedAgent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 class="text-sm font-bold text-gray-100">{selectedAgent.name}</h3>
            <span class="text-[10px] text-gray-500 uppercase tracking-wider">{selectedAgent.agentType}</span>
          </div>
        </div>
        <button class="close-btn" onclick={() => selectAgent(null)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Status -->
      <div class="card-section">
        <div class="flex items-center gap-2">
          <span
            class="status-dot"
            style="background-color: {statusColors[selectedAgent.status] ?? '#6b7280'};
                   box-shadow: 0 0 6px {statusColors[selectedAgent.status] ?? '#6b7280'}60"
          ></span>
          <span class="text-xs font-medium" style="color: {statusColors[selectedAgent.status] ?? '#6b7280'}">
            {statusLabels[selectedAgent.status] ?? selectedAgent.status}
          </span>
          <span class="text-[10px] text-gray-600 ml-auto">
            {timeSince(selectedAgent.lastActivityTime)}
          </span>
        </div>
        {#if selectedAgent.currentAction}
          <p class="text-xs text-gray-400 mt-1.5 pl-4">{selectedAgent.currentAction}</p>
        {/if}
        {#if selectedAgent.currentTool}
          <p class="text-[10px] text-gray-500 mt-1 pl-4 font-mono">
            Tool: {selectedAgent.currentTool}
          </p>
        {/if}
      </div>

      <!-- Wake button for idle agents -->
      {#if selectedAgent.status === 'idle'}
        <button class="wake-btn" onclick={handleWake}>
          Wake Up
        </button>
      {/if}

      <!-- Quick message -->
      <div class="card-section">
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={quickMessage}
            placeholder="Message {selectedAgent.name}..."
            class="quick-input"
            onkeydown={(e) => e.key === 'Enter' && handleSendQuick()}
            disabled={sending}
          />
          <button
            class="quick-send"
            onclick={handleSendQuick}
            disabled={!quickMessage.trim() || sending}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .agent-detail-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 2rem;
    z-index: 20;
    pointer-events: auto;
  }

  .agent-detail-card {
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(51, 65, 85, 0.6);
    border-radius: 0.75rem;
    width: 280px;
    backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-bottom: 1px solid rgba(51, 65, 85, 0.4);
  }

  .agent-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: white;
  }

  .close-btn {
    color: #64748b;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }

  .close-btn:hover {
    color: #e2e8f0;
  }

  .card-section {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid rgba(51, 65, 85, 0.3);
  }

  .card-section:last-child {
    border-bottom: none;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .wake-btn {
    display: block;
    width: calc(100% - 1.5rem);
    margin: 0.5rem 0.75rem;
    padding: 0.375rem 0;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .wake-btn:hover {
    background: rgba(245, 158, 11, 0.2);
    border-color: rgba(245, 158, 11, 0.5);
  }

  .quick-input {
    flex: 1;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    color: #e2e8f0;
    outline: none;
  }

  .quick-input:focus {
    border-color: #3b82f6;
  }

  .quick-input::placeholder {
    color: #64748b;
  }

  .quick-send {
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #ffffff;
    background: #3b82f6;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-send:hover:not(:disabled) {
    background: #2563eb;
  }

  .quick-send:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
