<script lang="ts">
  import { themes } from '../themes';
  import { themeState, setTheme } from '../state/store.svelte';

  let open = $state(false);
</script>

<div class="theme-switcher">
  <button class="theme-trigger" onclick={() => (open = !open)}>
    <span class="theme-emoji">{themeState.current.emoji}</span>
    <span class="theme-name">{themeState.current.name}</span>
    <svg class="chevron" class:rotated={open} width="10" height="10" viewBox="0 0 10 10">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>
  </button>

  {#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="theme-backdrop" onclick={() => (open = false)}></div>
    <div class="theme-dropdown">
      {#each themes as theme}
        <button
          class="theme-option"
          class:active={theme.id === themeState.current.id}
          onclick={() => { setTheme(theme.id); open = false; }}
        >
          <span class="option-emoji">{theme.emoji}</span>
          <div class="option-info">
            <span class="option-name">{theme.name}</span>
            <span class="option-desc">{theme.description}</span>
          </div>
          <div class="option-swatches">
            <span class="swatch" style="background-color: {theme.palette.primary}"></span>
            <span class="swatch" style="background-color: {theme.palette.accent}"></span>
            <span class="swatch" style="background-color: {theme.palette.background}"></span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .theme-switcher {
    position: relative;
  }

  .theme-trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: #94a3b8;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.4);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .theme-trigger:hover {
    color: #e2e8f0;
    border-color: rgba(51, 65, 85, 0.7);
  }

  .theme-emoji {
    font-size: 0.875rem;
  }

  .theme-name {
    display: none;
  }

  @media (min-width: 768px) {
    .theme-name {
      display: inline;
    }
  }

  .chevron {
    color: #64748b;
    transition: transform 0.2s ease;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  .theme-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }

  .theme-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.375rem;
    width: 280px;
    background: rgba(15, 23, 42, 0.97);
    border: 1px solid rgba(51, 65, 85, 0.6);
    border-radius: 0.625rem;
    backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    padding: 0.375rem;
    z-index: 50;
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: none;
    background: transparent;
    color: #e2e8f0;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
  }

  .theme-option:hover {
    background: rgba(30, 41, 59, 0.7);
  }

  .theme-option.active {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .option-emoji {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .option-info {
    flex: 1;
    min-width: 0;
  }

  .option-name {
    display: block;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .option-desc {
    display: block;
    font-size: 0.6875rem;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-swatches {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>
