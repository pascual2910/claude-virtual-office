<script lang="ts">
  import { onMount } from 'svelte';
  import { OfficeRenderer } from '../canvas/office-renderer';
  import { officeState, selectAgent } from '../state/store.svelte';
  import AgentDetailPanel from './AgentDetailPanel.svelte';

  let containerEl: HTMLDivElement;
  let renderer: OfficeRenderer | null = null;

  onMount(() => {
    renderer = new OfficeRenderer();
    renderer.init(containerEl).then(() => {
      renderer!.setOnAgentClick((id) => {
        selectAgent(id);
      });
    });

    return () => {
      renderer?.destroy();
      renderer = null;
    };
  });

  $effect(() => {
    const agents = officeState.agents;
    if (renderer && agents) {
      renderer.updateAgents(agents);
    }
  });
</script>

<div class="virtual-office-wrapper">
  <div
    class="virtual-office-container"
    bind:this={containerEl}
  ></div>
  <AgentDetailPanel />
</div>

<style>
  .virtual-office-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .virtual-office-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 0.75rem;
  }

  .virtual-office-container :global(canvas) {
    display: block;
    border-radius: 0.75rem;
  }
</style>
