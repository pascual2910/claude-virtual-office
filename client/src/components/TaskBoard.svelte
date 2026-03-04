<script lang="ts">
  import { onMount } from 'svelte';
  import { officeState } from '../state/store.svelte';
  import type { TaskState } from '../../../shared/types';

  let currentTime = $state(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    timer = setInterval(() => { currentTime = Date.now(); }, 1000);
    return () => { if (timer) clearInterval(timer); };
  });

  let pendingTasks = $derived(
    officeState.tasks.filter((t: TaskState) => t.status === 'pending')
  );
  let inProgressTasks = $derived(
    officeState.tasks.filter((t: TaskState) => t.status === 'in_progress')
  );
  let completedTasks = $derived(
    officeState.tasks.filter((t: TaskState) => t.status === 'completed')
  );

  function getOwnerColor(owner: string | null): string {
    if (!owner) return '#6b7280';
    let hash = 0;
    for (let i = 0; i < owner.length; i++) {
      hash = owner.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
    return colors[Math.abs(hash) % colors.length];
  }

  function timeSince(timestamp: number | undefined): string {
    if (!timestamp) return '';
    const seconds = Math.floor((currentTime - timestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  }

  function elapsed(timestamp: number | undefined): string {
    if (!timestamp) return '';
    const seconds = Math.floor((currentTime - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  function duration(start: number | undefined, end: number | undefined): string {
    if (!start || !end) return '';
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
</script>

<div class="flex flex-col h-full gap-3">
  <!-- Pending Column -->
  <div class="flex-1 min-h-0 flex flex-col">
    <div class="flex items-center gap-2 mb-2 px-1">
      <span class="column-dot" style="background: var(--vo-idle)"></span>
      <h3 class="column-title">Pending</h3>
      <span class="column-count">{pendingTasks.length}</span>
    </div>
    <div class="flex-1 overflow-y-auto space-y-2">
      {#each pendingTasks as task (task.id)}
        <div class="task-card">
          <p class="task-text">{task.content}</p>
          <div class="flex items-center gap-1.5 mt-2">
            {#if task.owner}
              <span
                class="w-2 h-2 rounded-full"
                style="background-color: {getOwnerColor(task.owner)}"
              ></span>
              <span class="task-owner">{task.owner}</span>
            {/if}
            {#if task.createdAt}
              <span class="task-time">{timeSince(task.createdAt)}</span>
            {/if}
          </div>
        </div>
      {:else}
        <p class="task-empty">No pending tasks</p>
      {/each}
    </div>
  </div>

  <!-- In Progress Column -->
  <div class="flex-1 min-h-0 flex flex-col">
    <div class="flex items-center gap-2 mb-2 px-1">
      <span class="column-dot" style="background: var(--vo-primary)"></span>
      <h3 class="column-title">In Progress</h3>
      <span class="column-count">{inProgressTasks.length}</span>
    </div>
    <div class="flex-1 overflow-y-auto space-y-2">
      {#each inProgressTasks as task (task.id)}
        <div class="task-card task-card-active">
          <p class="task-text task-text-active">
            {task.activeForm || task.content}
          </p>
          <div class="flex items-center gap-1.5 mt-2">
            {#if task.owner}
              <span
                class="w-2 h-2 rounded-full"
                style="background-color: {getOwnerColor(task.owner)}"
              ></span>
              <span class="task-owner-active">{task.owner}</span>
            {/if}
            {#if task.startedAt}
              <span class="task-time task-time-active">{elapsed(task.startedAt)}</span>
            {/if}
          </div>
        </div>
      {:else}
        <p class="task-empty">No active tasks</p>
      {/each}
    </div>
  </div>

  <!-- Completed Column -->
  <div class="flex-1 min-h-0 flex flex-col">
    <div class="flex items-center gap-2 mb-2 px-1">
      <span class="column-dot" style="background: var(--vo-success)"></span>
      <h3 class="column-title">Completed</h3>
      <span class="column-count">{completedTasks.length}</span>
    </div>
    <div class="flex-1 overflow-y-auto space-y-2">
      {#each completedTasks as task (task.id)}
        <div class="task-card task-card-completed">
          <p class="task-text-completed">
            {task.content}
          </p>
          <div class="flex items-center gap-1.5 mt-2">
            {#if task.owner}
              <span
                class="w-2 h-2 rounded-full opacity-50"
                style="background-color: {getOwnerColor(task.owner)}"
              ></span>
              <span class="task-owner-completed">{task.owner}</span>
            {/if}
            {#if task.startedAt && task.completedAt}
              <span class="task-time">{duration(task.startedAt, task.completedAt)}</span>
            {/if}
          </div>
        </div>
      {:else}
        <p class="task-empty">No completed tasks</p>
      {/each}
    </div>
  </div>
</div>

<style>
  .column-dot {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
  }

  .column-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--vo-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .column-count {
    font-size: 0.75rem;
    color: var(--vo-text-muted);
    margin-left: auto;
  }

  .task-text {
    font-size: 0.875rem;
    color: var(--vo-text);
    line-height: 1.4;
  }

  .task-text-active {
    color: var(--vo-text);
  }

  .task-text-completed {
    font-size: 0.875rem;
    color: var(--vo-text-muted);
    line-height: 1.4;
    text-decoration: line-through;
  }

  .task-owner {
    font-size: 0.75rem;
    color: var(--vo-text-muted);
  }

  .task-owner-active {
    font-size: 0.75rem;
    color: var(--vo-text-secondary);
  }

  .task-owner-completed {
    font-size: 0.75rem;
    color: var(--vo-text-muted);
  }

  .task-empty {
    font-size: 0.75rem;
    color: var(--vo-text-muted);
    text-align: center;
    padding: 1rem 0;
    font-style: italic;
  }

  .task-card {
    background: color-mix(in srgb, var(--vo-surface) 70%, transparent);
    border: 1px solid color-mix(in srgb, var(--vo-border) 50%, transparent);
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    backdrop-filter: blur(4px);
    transition: border-color 0.2s ease;
  }

  .task-card:hover {
    border-color: color-mix(in srgb, var(--vo-border) 80%, transparent);
  }

  .task-card-active {
    border-left: 2px solid var(--vo-primary);
  }

  .task-card-completed {
    opacity: 0.6;
  }

  .task-time {
    font-size: 0.625rem;
    font-family: ui-monospace, monospace;
    color: var(--vo-text-muted);
    margin-left: auto;
  }

  .task-time-active {
    color: var(--vo-primary);
  }
</style>
