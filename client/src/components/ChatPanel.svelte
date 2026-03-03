<script lang="ts">
  import { officeState } from '../state/store.svelte';
  import type { ChatMessage } from '../../../shared/types';

  type FilterType = 'all' | 'messages' | 'tools' | 'system';

  let activeFilter: FilterType = $state('all');
  let scrollContainer: HTMLDivElement;

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
    // Auto-scroll on new messages
    const _len = filteredMessages.length;
    if (scrollContainer) {
      // Use a microtask to ensure DOM is updated
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
          <p class="flex-1 text-xs text-gray-600 text-center">{msg.content}</p>
        {/if}
      </div>
    {:else}
      <div class="flex items-center justify-center h-full">
        <p class="text-sm text-gray-600 italic">Waiting for activity...</p>
      </div>
    {/each}
  </div>
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
</style>
