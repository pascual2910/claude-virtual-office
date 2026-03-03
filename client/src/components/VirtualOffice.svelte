<script lang="ts">
  import { onMount } from 'svelte';
  import { OfficeRenderer } from '../canvas/office-renderer';
  import { officeState, selectAgent } from '../state/store.svelte';

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

<div
  class="virtual-office-container"
  bind:this={containerEl}
></div>

<style>
  .virtual-office-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 0.75rem;
    position: relative;
  }

  .virtual-office-container :global(canvas) {
    display: block;
    border-radius: 0.75rem;
  }
</style>
