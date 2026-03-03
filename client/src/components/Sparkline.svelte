<script lang="ts">
  import type { AgentStatus } from '../../../shared/types';
  import type { StatusHistoryEntry } from '../state/store.svelte';

  interface Props {
    history: StatusHistoryEntry[];
    width?: number;
    height?: number;
  }

  let { history, width = 200, height = 24 }: Props = $props();

  const statusColorMap: Record<AgentStatus, string> = {
    working: '#3b82f6',
    typing: '#8b5cf6',
    reading: '#06b6d4',
    'running-command': '#f59e0b',
    searching: '#10b981',
    thinking: '#6366f1',
    idle: '#6b7280',
    stopped: '#374151',
  };

  let bars = $derived.by(() => {
    if (!history.length) return [];
    const barWidth = width / Math.max(history.length, 1);
    return history.map((entry, i) => ({
      x: i * barWidth,
      width: barWidth,
      color: statusColorMap[entry.status] ?? '#6b7280',
      status: entry.status,
    }));
  });
</script>

<svg viewBox="0 0 {width} {height}" class="sparkline" width="100%" height={height}>
  {#each bars as bar}
    <rect
      x={bar.x}
      y="0"
      width={bar.width}
      height={height}
      fill={bar.color}
      rx="1"
    >
      <title>{bar.status}</title>
    </rect>
  {/each}
</svg>

<style>
  .sparkline {
    display: block;
    border-radius: 4px;
    overflow: hidden;
    opacity: 0.8;
  }
</style>
