<script lang="ts">
  import { officeState, selection, selectAgent, statusHistory } from '../state/store.svelte';
  import { sendMessageToAgent, wakeAgent } from '../state/api-client';
  import type { AgentState } from '../../../shared/types';
  import Sparkline from './Sparkline.svelte';

  let selectedAgent: AgentState | null = $derived(
    selection.agentId
      ? officeState.agents.find(a => a.id === selection.agentId) ?? null
      : null
  );

  let agentHistory = $derived(
    selectedAgent ? (statusHistory.get(selectedAgent.id) ?? []) : []
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

  function basename(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] ?? filePath;
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
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
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
            <h3 class="text-sm font-bold" style="color: var(--vo-text)">{selectedAgent.name}</h3>
            <span class="text-[10px] uppercase tracking-wider" style="color: var(--vo-text-muted)">{selectedAgent.agentType}</span>
          </div>
        </div>
        <button class="close-btn" onclick={() => selectAgent(null)} aria-label="Close">
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
          <span class="text-[10px] ml-auto" style="color: var(--vo-text-muted)">
            {timeSince(selectedAgent.lastActivityTime)}
          </span>
        </div>
        {#if selectedAgent.currentAction}
          <p class="text-xs mt-1.5 pl-4" style="color: var(--vo-text-secondary)">{selectedAgent.currentAction}</p>
        {/if}
        {#if selectedAgent.currentTool}
          <p class="text-[10px] mt-1 pl-4 font-mono" style="color: var(--vo-text-muted)">
            Tool: {selectedAgent.currentTool}
          </p>
        {/if}
      </div>

      <!-- Activity Sparkline -->
      {#if agentHistory.length > 1}
        <div class="card-section">
          <h4 class="section-label">Activity</h4>
          <Sparkline history={agentHistory} />
        </div>
      {/if}

      <!-- File Activity -->
      {#if selectedAgent.recentFiles?.length}
        <div class="card-section">
          <h4 class="section-label">Recent Files</h4>
          <div class="file-list">
            {#each selectedAgent.recentFiles.slice(0, 8) as file}
              <div class="file-entry">
                <span class="file-tool-icon">
                  {file.tool === 'Read' ? '\u{1F4D6}' : file.tool === 'Edit' ? '\u{270F}\u{FE0F}' : '\u{1F4DD}'}
                </span>
                <span class="file-name" title={file.filePath}>
                  {basename(file.filePath)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

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
    background: color-mix(in srgb, var(--vo-background) 95%, transparent);
    border: 1px solid color-mix(in srgb, var(--vo-border) 60%, transparent);
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
    border-bottom: 1px solid color-mix(in srgb, var(--vo-border) 40%, transparent);
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
    color: var(--vo-text-muted);
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
    color: var(--vo-text);
  }

  .card-section {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, var(--vo-border) 30%, transparent);
  }

  .card-section:last-child {
    border-bottom: none;
  }

  .section-label {
    font-size: 0.625rem;
    color: var(--vo-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.375rem;
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
    color: var(--vo-warning);
    background: color-mix(in srgb, var(--vo-warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--vo-warning) 30%, transparent);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .wake-btn:hover {
    background: color-mix(in srgb, var(--vo-warning) 20%, transparent);
    border-color: color-mix(in srgb, var(--vo-warning) 50%, transparent);
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .file-entry {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
  }

  .file-tool-icon {
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .file-name {
    color: var(--vo-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, monospace;
  }

  .quick-input {
    flex: 1;
    background: color-mix(in srgb, var(--vo-surface) 70%, transparent);
    border: 1px solid color-mix(in srgb, var(--vo-border) 50%, transparent);
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    color: var(--vo-text);
    outline: none;
  }

  .quick-input:focus {
    border-color: var(--vo-primary);
  }

  .quick-input::placeholder {
    color: var(--vo-text-muted);
  }

  .quick-send {
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #ffffff;
    background: var(--vo-primary);
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-send:hover:not(:disabled) {
    background: var(--vo-primary-hover);
  }

  .quick-send:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
