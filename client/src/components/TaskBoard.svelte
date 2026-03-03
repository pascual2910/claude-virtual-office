<script lang="ts">
  import { officeState } from '../state/store.svelte';
  import type { TaskState } from '../../../shared/types';

  const statusColors: Record<string, string> = {
    pending: '#6b7280',
    in_progress: '#3b82f6',
    completed: '#10b981',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  };

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
    // Generate a consistent color from the owner name
    let hash = 0;
    for (let i = 0; i < owner.length; i++) {
      hash = owner.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
    return colors[Math.abs(hash) % colors.length];
  }
</script>

<div class="flex flex-col h-full gap-3">
  <!-- Pending Column -->
  <div class="flex-1 min-h-0 flex flex-col">
    <div class="flex items-center gap-2 mb-2 px-1">
      <span class="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Pending
      </h3>
      <span class="text-xs text-gray-500 ml-auto">{pendingTasks.length}</span>
    </div>
    <div class="flex-1 overflow-y-auto space-y-2">
      {#each pendingTasks as task (task.id)}
        <div class="task-card">
          <p class="text-sm text-gray-300 leading-snug">{task.content}</p>
          {#if task.owner}
            <div class="flex items-center gap-1.5 mt-2">
              <span
                class="w-2 h-2 rounded-full"
                style="background-color: {getOwnerColor(task.owner)}"
              ></span>
              <span class="text-xs text-gray-500">{task.owner}</span>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-xs text-gray-600 text-center py-4 italic">No pending tasks</p>
      {/each}
    </div>
  </div>

  <!-- In Progress Column -->
  <div class="flex-1 min-h-0 flex flex-col">
    <div class="flex items-center gap-2 mb-2 px-1">
      <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        In Progress
      </h3>
      <span class="text-xs text-gray-500 ml-auto">{inProgressTasks.length}</span>
    </div>
    <div class="flex-1 overflow-y-auto space-y-2">
      {#each inProgressTasks as task (task.id)}
        <div class="task-card task-card-active">
          <p class="text-sm text-gray-200 leading-snug">
            {task.activeForm || task.content}
          </p>
          {#if task.owner}
            <div class="flex items-center gap-1.5 mt-2">
              <span
                class="w-2 h-2 rounded-full"
                style="background-color: {getOwnerColor(task.owner)}"
              ></span>
              <span class="text-xs text-gray-400">{task.owner}</span>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-xs text-gray-600 text-center py-4 italic">No active tasks</p>
      {/each}
    </div>
  </div>

  <!-- Completed Column -->
  <div class="flex-1 min-h-0 flex flex-col">
    <div class="flex items-center gap-2 mb-2 px-1">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Completed
      </h3>
      <span class="text-xs text-gray-500 ml-auto">{completedTasks.length}</span>
    </div>
    <div class="flex-1 overflow-y-auto space-y-2">
      {#each completedTasks as task (task.id)}
        <div class="task-card task-card-completed">
          <p class="text-sm text-gray-500 leading-snug line-through">
            {task.content}
          </p>
          {#if task.owner}
            <div class="flex items-center gap-1.5 mt-2">
              <span
                class="w-2 h-2 rounded-full opacity-50"
                style="background-color: {getOwnerColor(task.owner)}"
              ></span>
              <span class="text-xs text-gray-600">{task.owner}</span>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-xs text-gray-600 text-center py-4 italic">No completed tasks</p>
      {/each}
    </div>
  </div>
</div>

<style>
  .task-card {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    backdrop-filter: blur(4px);
    transition: border-color 0.2s ease;
  }

  .task-card:hover {
    border-color: rgba(71, 85, 105, 0.8);
  }

  .task-card-active {
    border-left: 2px solid #3b82f6;
  }

  .task-card-completed {
    opacity: 0.6;
  }
</style>
