<script lang="ts">
  import { onMount } from 'svelte';
  import VirtualOffice from './components/VirtualOffice.svelte';
  import TaskBoard from './components/TaskBoard.svelte';
  import ChatPanel from './components/ChatPanel.svelte';
  import ThemeSwitcher from './components/ThemeSwitcher.svelte';
  import { officeState, themeState, applyThemeCssVars } from './state/store.svelte';
  import { connectWebSocket } from './state/websocket-client';

  let sessionStartTime = $state(Date.now());
  let currentTime = $state(Date.now());
  let cleanupWs: (() => void) | null = null;

  let agentCount = $derived(officeState.agents.length);
  let totalTasks = $derived(officeState.tasks.length);
  let completedTasks = $derived(
    officeState.tasks.filter((t) => t.status === 'completed').length
  );
  let taskProgress = $derived(
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  );

  let sessionTime = $derived(() => {
    const elapsed = currentTime - sessionStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  });

  onMount(() => {
    applyThemeCssVars(themeState.current);
    cleanupWs = connectWebSocket();

    const timer = setInterval(() => {
      currentTime = Date.now();
    }, 1000);

    return () => {
      cleanupWs?.();
      clearInterval(timer);
    };
  });
</script>

<div class="app-layout">
  <!-- Header -->
  <header class="app-header">
    <div class="flex items-center gap-3">
      <h1 class="text-lg font-bold text-gray-100 tracking-tight">
        Claude Virtual Office
      </h1>
      {#if officeState.teamName}
        <span class="text-sm text-gray-400 border-l border-gray-700 pl-3">
          {officeState.teamName}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-4">
      <ThemeSwitcher />
      <div class="flex items-center gap-2">
        <span
          class="w-2.5 h-2.5 rounded-full {officeState.connected
            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
            : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}"
        ></span>
        <span class="text-xs text-gray-400">
          {officeState.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="app-main">
    <!-- Left: Virtual Office Canvas -->
    <section class="panel panel-office">
      <div class="panel-header">
        <h2 class="panel-title">Virtual Office</h2>
      </div>
      <div class="panel-content">
        <VirtualOffice />
      </div>
    </section>

    <!-- Center: Task Board -->
    <section class="panel panel-tasks">
      <div class="panel-header">
        <h2 class="panel-title">Task Board</h2>
        {#if totalTasks > 0}
          <span class="text-xs text-gray-500">
            {completedTasks}/{totalTasks}
          </span>
        {/if}
      </div>
      <div class="panel-content">
        <TaskBoard />
      </div>
    </section>

    <!-- Right: Chat Panel -->
    <section class="panel panel-chat">
      <div class="panel-header">
        <h2 class="panel-title">Activity</h2>
        <span class="text-xs text-gray-500">
          {officeState.chatLog.length} events
        </span>
      </div>
      <div class="panel-content">
        <ChatPanel />
      </div>
    </section>
  </main>

  <!-- Status bar -->
  <footer class="app-status">
    <div class="flex items-center gap-4 text-xs text-gray-500">
      <span>Agents: <span class="text-gray-400">{agentCount}</span></span>
      <span class="text-gray-700">|</span>
      <span>
        Tasks: <span class="text-gray-400">{completedTasks}/{totalTasks}</span>
        {#if totalTasks > 0}
          <span class="text-gray-600">({taskProgress}%)</span>
        {/if}
      </span>
      <span class="text-gray-700">|</span>
      <span>Session: <span class="text-gray-400">{sessionTime()}</span></span>
    </div>
  </footer>
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 1rem;
    background: rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    backdrop-filter: blur(12px);
    z-index: 10;
  }

  .app-main {
    display: flex;
    flex: 1;
    gap: 0;
    min-height: 0;
    overflow: hidden;
  }

  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid rgba(51, 65, 85, 0.4);
  }

  .panel:last-child {
    border-right: none;
  }

  .panel-office {
    flex: 0 0 45%;
    max-width: 45%;
  }

  .panel-tasks {
    flex: 0 0 25%;
    max-width: 25%;
  }

  .panel-chat {
    flex: 1;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgba(51, 65, 85, 0.3);
    background: rgba(30, 41, 59, 0.3);
    backdrop-filter: blur(8px);
  }

  .panel-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .panel-content {
    flex: 1;
    min-height: 0;
    padding: 0.5rem;
    overflow: hidden;
  }

  .app-status {
    padding: 0.375rem 1rem;
    background: rgba(15, 23, 42, 0.95);
    border-top: 1px solid rgba(51, 65, 85, 0.5);
    backdrop-filter: blur(12px);
  }
</style>
