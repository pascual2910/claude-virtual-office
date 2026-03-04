<script lang="ts">
  import { onMount } from 'svelte';
  import VirtualOffice from './components/VirtualOffice.svelte';
  import TaskBoard from './components/TaskBoard.svelte';
  import ChatPanel from './components/ChatPanel.svelte';
  import ThemeSwitcher from './components/ThemeSwitcher.svelte';
  import { officeState, themeState, applyThemeCssVars, soundState, toggleMute } from './state/store.svelte';
  import { connectWebSocket } from './state/websocket-client';

  let sessionStartTime = $state(Date.now());
  let currentTime = $state(Date.now());
  let cleanupWs: (() => void) | null = null;

  let agentCount = $derived(officeState.agents.length);

  // Derive a display-friendly project name from the path
  let projectName = $derived(() => {
    if (!officeState.projectPath) return null;
    const basename = officeState.projectPath.split('/').filter(Boolean).pop() ?? '';
    // Replace hyphens with spaces and title-case
    return basename
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  });
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
      <h1 class="text-lg font-bold tracking-tight" style="color: var(--vo-text)">
        Claude Virtual Office
      </h1>
      {#if officeState.teamName}
        <span class="text-sm border-l pl-3" style="color: var(--vo-text-secondary); border-color: var(--vo-border)">
          {officeState.teamName}
        </span>
      {/if}
      {#if projectName()}
        <span
          class="text-sm border-l pl-3"
          style="color: var(--vo-text-muted); border-color: var(--vo-border)"
          title={officeState.projectPath}
        >
          {projectName()}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-4">
      <ThemeSwitcher />
      <button
        class="mute-toggle"
        onclick={toggleMute}
        aria-label={soundState.muted ? 'Unmute sounds' : 'Mute sounds'}
        title={soundState.muted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {soundState.muted ? '\u{1F507}' : '\u{1F50A}'}
      </button>
      <div class="flex items-center gap-2">
        <span
          class="w-2.5 h-2.5 rounded-full {officeState.connected
            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
            : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}"
        ></span>
        <span class="text-xs" style="color: var(--vo-text-secondary)">
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
          <span class="text-xs" style="color: var(--vo-text-muted)">
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
        <span class="text-xs" style="color: var(--vo-text-muted)">
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
    <div class="status-bar-content">
      <span>Agents: <span class="status-bar-value">{agentCount}</span></span>
      <span class="status-bar-divider">|</span>
      <span>
        Tasks: <span class="status-bar-value">{completedTasks}/{totalTasks}</span>
        {#if totalTasks > 0}
          <span class="status-bar-dim">({taskProgress}%)</span>
        {/if}
      </span>
      <span class="status-bar-divider">|</span>
      <span>Session: <span class="status-bar-value">{sessionTime()}</span></span>
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
    background: color-mix(in srgb, var(--vo-background) 95%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--vo-border) 50%, transparent);
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
    border-right: 1px solid color-mix(in srgb, var(--vo-border) 40%, transparent);
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
    border-bottom: 1px solid color-mix(in srgb, var(--vo-border) 30%, transparent);
    background: color-mix(in srgb, var(--vo-surface) 30%, transparent);
    backdrop-filter: blur(8px);
  }

  .panel-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--vo-text-secondary);
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
    background: color-mix(in srgb, var(--vo-background) 95%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--vo-border) 50%, transparent);
    backdrop-filter: blur(12px);
  }

  .status-bar-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--vo-text-muted);
  }

  .status-bar-value {
    color: var(--vo-text-secondary);
  }

  .status-bar-divider {
    color: var(--vo-border);
  }

  .status-bar-dim {
    color: var(--vo-text-muted);
  }

  .mute-toggle {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    transition: opacity 0.15s;
    opacity: 0.7;
  }

  .mute-toggle:hover {
    opacity: 1;
  }
</style>
