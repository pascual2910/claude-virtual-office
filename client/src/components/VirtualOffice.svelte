<script lang="ts">
  import { onMount } from 'svelte';
  import { OfficeRenderer } from '../canvas/office-renderer';
  import { officeState, selectAgent, themeState } from '../state/store.svelte';
  import AgentDetailPanel from './AgentDetailPanel.svelte';

  let containerEl: HTMLDivElement;
  let renderer: OfficeRenderer | null = null;

  // Track previous tool state per agent to detect changes
  let prevToolMap: Map<string, string | null> = new Map();
  // Track completed task count to detect new completions
  let prevCompletedCount = 0;

  onMount(() => {
    renderer = new OfficeRenderer();
    renderer.init(containerEl).then(() => {
      renderer!.setOnAgentClick((id) => {
        selectAgent(id);
      });
      renderer!.setTheme(themeState.current);
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

      // Detect tool use changes → show tool icon animation
      for (const agent of agents) {
        const prevTool = prevToolMap.get(agent.id);
        if (agent.currentTool && agent.currentTool !== prevTool) {
          renderer.showToolUse(agent.id, agent.currentTool);
        }
        prevToolMap.set(agent.id, agent.currentTool);
      }
    }
  });

  // Detect task completions → celebrate
  $effect(() => {
    const completedCount = officeState.tasks.filter(t => t.status === 'completed').length;
    if (renderer && completedCount > prevCompletedCount && prevCompletedCount > 0) {
      // Find the agent who completed the task (owner of the most recently completed task)
      const completedTasks = officeState.tasks.filter(t => t.status === 'completed');
      const lastCompleted = completedTasks[completedTasks.length - 1];
      if (lastCompleted?.owner) {
        const agent = officeState.agents.find(a => a.name === lastCompleted.owner);
        if (agent) {
          renderer.celebrate(agent.id);
        }
      }
    }
    prevCompletedCount = completedCount;
  });

  $effect(() => {
    const theme = themeState.current;
    if (renderer) {
      renderer.setTheme(theme);
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
