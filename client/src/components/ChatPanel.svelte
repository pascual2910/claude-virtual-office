<script lang="ts">
  import { officeState, selection } from '../state/store.svelte';
  import { sendMessageToAgent, wakeAgent } from '../state/api-client';
  import type { ChatMessage } from '../../../shared/types';

  type FilterType = 'all' | 'messages' | 'tools' | 'system';

  let activeFilter: FilterType = $state('all');
  let scrollContainer: HTMLDivElement;
  let messageText = $state('');
  let targetAgent = $state('');

  // Auto-select agent when clicked in canvas
  $effect(() => {
    if (selection.agentId) {
      const agent = officeState.agents.find(a => a.id === selection.agentId);
      if (agent) targetAgent = agent.name;
    }
  });

  // Default to first agent if none selected
  $effect(() => {
    if (!targetAgent && officeState.agents.length > 0) {
      targetAgent = officeState.agents[0].name;
    }
  });

  let filteredMessages = $derived(
    officeState.chatLog.filter((msg: ChatMessage) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'messages') return msg.type === 'agent-message' || msg.type === 'user-sent';
      if (activeFilter === 'tools') return msg.type === 'tool-use';
      if (activeFilter === 'system') return msg.type === 'system';
      return true;
    })
  );

  $effect(() => {
    const _len = filteredMessages.length;
    if (scrollContainer) {
      queueMicrotask(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  });

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function getAgentColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];
    return colors[Math.abs(hash) % colors.length];
  }

  async function handleSend() {
    const text = messageText.trim();
    if (!text || !targetAgent || !officeState.teamName) return;
    messageText = '';
    try {
      await sendMessageToAgent(officeState.teamName, targetAgent, text);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  async function handleWake(agentName: string) {
    if (!officeState.teamName) return;
    try {
      await wakeAgent(officeState.teamName, agentName);
    } catch (err) {
      console.error('Failed to wake agent:', err);
    }
  }

  function extractIdleAgent(content: string): string | null {
    const match = content.match(/^(.+?) went idle$/);
    return match ? match[1] : null;
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'messages', label: 'Messages' },
    { key: 'tools', label: 'Tools' },
    { key: 'system', label: 'System' },
  ];
</script>

<div class="flex flex-col h-full">
  <!-- Filter tabs -->
  <div class="flex gap-1 mb-3 p-0.5 bg-slate-800/50 rounded-lg">
    {#each filters as filter}
      <button
        class="filter-tab"
        class:active={activeFilter === filter.key}
        onclick={() => (activeFilter = filter.key)}
      >
        {filter.label}
      </button>
    {/each}
  </div>

  <!-- Messages -->
  <div class="flex-1 overflow-y-auto space-y-1" bind:this={scrollContainer}>
    {#each filteredMessages as msg, i (i)}
      <div class="chat-message {msg.type}">
        <span class="text-[10px] text-gray-600 shrink-0 font-mono">
          {formatTime(msg.timestamp)}
        </span>

        {#if msg.type === 'agent-message' || msg.type === 'user-sent'}
          <div class="flex-1 min-w-0">
            <span
              class="text-xs font-semibold"
              style="color: {getAgentColor(msg.agentName)}"
            >
              {msg.agentName}
            </span>
            <p class="text-sm text-gray-300 break-words">{msg.content}</p>
          </div>
        {:else if msg.type === 'tool-use'}
          <p class="flex-1 text-xs text-gray-500 italic">
            <span class="text-gray-400">{msg.agentName}</span> is using
            <span class="text-gray-400 font-mono">{msg.content}</span>
          </p>
        {:else if msg.type === 'system'}
          {@const idleAgent = extractIdleAgent(msg.content)}
          <div class="flex-1 flex items-center justify-center gap-2">
            <p class="text-xs text-gray-600">{msg.content}</p>
            {#if idleAgent}
              <button
                class="wake-button"
                onclick={() => handleWake(idleAgent)}
              >
                Wake
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex items-center justify-center h-full">
        <p class="text-sm text-gray-600 italic">Waiting for activity...</p>
      </div>
    {/each}
  </div>

  <!-- Message input -->
  {#if officeState.agents.length > 0}
    <div class="chat-input-area">
      <div class="flex items-center gap-2 mb-1.5">
        <label class="text-[10px] text-gray-500 uppercase tracking-wider">To:</label>
        <select bind:value={targetAgent} class="agent-select">
          {#each officeState.agents as agent}
            <option value={agent.name}>{agent.name}</option>
          {/each}
        </select>
      </div>
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={messageText}
          placeholder="Send message to agent..."
          class="chat-input"
          onkeydown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onclick={handleSend}
          class="send-button"
          disabled={!messageText.trim()}
        >
          Send
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .filter-tab {
    flex: 1;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: #94a3b8;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-tab:hover {
    color: #e2e8f0;
    background: rgba(51, 65, 85, 0.4);
  }

  .filter-tab.active {
    color: #f1f5f9;
    background: rgba(51, 65, 85, 0.7);
  }

  .chat-message {
    display: flex;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    align-items: flex-start;
  }

  .chat-message:hover {
    background: rgba(30, 41, 59, 0.5);
  }

  .chat-message.system {
    justify-content: center;
    opacity: 0.7;
  }

  .wake-button {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.65rem;
    font-weight: 600;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .wake-button:hover {
    background: rgba(245, 158, 11, 0.2);
    border-color: rgba(245, 158, 11, 0.5);
  }

  .chat-input-area {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(51, 65, 85, 0.4);
  }

  .agent-select {
    flex: 1;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: #e2e8f0;
    outline: none;
  }

  .agent-select:focus {
    border-color: #3b82f6;
  }

  .chat-input {
    flex: 1;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.375rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    color: #e2e8f0;
    outline: none;
  }

  .chat-input:focus {
    border-color: #3b82f6;
  }

  .chat-input::placeholder {
    color: #64748b;
  }

  .send-button {
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #ffffff;
    background: #3b82f6;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .send-button:hover:not(:disabled) {
    background: #2563eb;
  }

  .send-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
