import { Application, Container, Graphics, Text } from 'pixi.js';
import type { AgentState, AgentStatus } from '../../../shared/types';

const STATUS_COLORS: Record<AgentStatus, number> = {
  working: 0x3b82f6,
  typing: 0x8b5cf6,
  reading: 0x06b6d4,
  'running-command': 0xf59e0b,
  searching: 0x10b981,
  thinking: 0x6366f1,
  idle: 0x6b7280,
  stopped: 0x374151,
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  working: 'Working',
  typing: 'Typing',
  reading: 'Reading',
  'running-command': 'Running cmd',
  searching: 'Searching',
  thinking: 'Thinking',
  idle: 'Idle',
  stopped: 'Stopped',
};

interface AgentVisual {
  container: Container;
  agentCircle: Graphics;
  deskGraphics: Graphics;
  monitorGraphics: Graphics;
  nameLabel: Text;
  statusLabel: Text;
  animationLabel: Text | null;
  currentStatus: AgentStatus;
  animTime: number;
  targetColor: number;
  currentColor: number;
}

export class OfficeRenderer {
  private app: Application | null = null;
  private agentVisuals: Map<string, AgentVisual> = new Map();
  private floorContainer: Container = new Container();
  private agentsContainer: Container = new Container();
  private resizeObserver: ResizeObserver | null = null;
  private containerEl: HTMLElement | null = null;
  private onAgentClick: ((id: string) => void) | null = null;

  async init(container: HTMLElement): Promise<void> {
    this.containerEl = container;
    this.app = new Application();

    await this.app.init({
      background: 0x1a1a2e,
      antialias: true,
      resizeTo: container,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Build scene
    this.app.stage.addChild(this.floorContainer);
    this.app.stage.addChild(this.agentsContainer);

    this.drawOfficeBackground();

    // Animation ticker
    this.app.ticker.add((ticker) => {
      this.animate(ticker.deltaTime);
    });

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      if (this.app) {
        this.app.resize();
        this.drawOfficeBackground();
      }
    });
    this.resizeObserver.observe(container);
  }

  setOnAgentClick(handler: (id: string) => void): void {
    this.onAgentClick = handler;
  }

  private drawOfficeBackground(): void {
    this.floorContainer.removeChildren();

    if (!this.app) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Floor
    const floor = new Graphics();
    floor.rect(0, 0, w, h);
    floor.fill({ color: 0x1a1a2e });
    this.floorContainer.addChild(floor);

    // Wall accent at top
    const wall = new Graphics();
    wall.rect(0, 0, w, 50);
    wall.fill({ color: 0x1e293b });
    this.floorContainer.addChild(wall);

    // Wall bottom line
    const wallLine = new Graphics();
    wallLine.rect(0, 49, w, 2);
    wallLine.fill({ color: 0x334155 });
    this.floorContainer.addChild(wallLine);

    // Floor grid (subtle)
    const grid = new Graphics();
    const gridSize = 80;
    for (let x = 0; x < w; x += gridSize) {
      grid.rect(x, 50, 1, h - 50);
      grid.fill({ color: 0x1f2937, alpha: 0.3 });
    }
    for (let y = 50; y < h; y += gridSize) {
      grid.rect(0, y, w, 1);
      grid.fill({ color: 0x1f2937, alpha: 0.3 });
    }
    this.floorContainer.addChild(grid);
  }

  updateAgents(agents: AgentState[]): void {
    const currentIds = new Set(agents.map((a) => a.id));

    // Remove agents no longer present
    for (const [id, visual] of this.agentVisuals) {
      if (!currentIds.has(id)) {
        this.removeAgentVisual(id);
      }
    }

    // Create or update agents
    for (const agent of agents) {
      const existing = this.agentVisuals.get(agent.id);
      if (existing) {
        this.updateAgentVisual(existing, agent);
      } else {
        this.createAgentVisual(agent);
      }
    }
  }

  private createAgentVisual(agent: AgentState): void {
    const container = new Container();
    const color = STATUS_COLORS[agent.status] ?? 0x6b7280;

    // Desk (rounded rectangle)
    const deskGraphics = new Graphics();
    deskGraphics.roundRect(-60, -10, 120, 60, 8);
    deskGraphics.fill({ color: 0x334155 });
    deskGraphics.roundRect(-60, -10, 120, 60, 8);
    deskGraphics.stroke({ color: 0x475569, width: 1 });
    container.addChild(deskGraphics);

    // Monitor on desk
    const monitorGraphics = new Graphics();
    monitorGraphics.roundRect(-25, -5, 50, 30, 4);
    monitorGraphics.fill({ color: 0x1e293b });
    monitorGraphics.roundRect(-25, -5, 50, 30, 4);
    monitorGraphics.stroke({ color: 0x475569, width: 1 });
    // Monitor screen glow
    monitorGraphics.roundRect(-22, -2, 44, 24, 2);
    monitorGraphics.fill({ color: color, alpha: 0.15 });
    container.addChild(monitorGraphics);

    // Agent circle (positioned above desk)
    const agentCircle = new Graphics();
    agentCircle.circle(0, -40, 20);
    agentCircle.fill({ color: color });
    agentCircle.circle(0, -40, 20);
    agentCircle.stroke({ color: 0xffffff, width: 2, alpha: 0.3 });
    agentCircle.eventMode = 'static';
    agentCircle.cursor = 'pointer';
    agentCircle.on('pointertap', () => {
      this.onAgentClick?.(agent.id);
    });
    // Make hit area bigger for easier clicking
    const hitArea = new Graphics();
    hitArea.circle(0, -40, 30);
    hitArea.fill({ color: 0xffffff, alpha: 0 });
    agentCircle.addChild(hitArea);
    container.addChild(agentCircle);

    // Agent initial letter inside circle
    const initial = new Text({
      text: agent.name.charAt(0).toUpperCase(),
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0xffffff,
      },
    });
    initial.anchor.set(0.5);
    initial.position.set(0, -40);
    container.addChild(initial);

    // Name label below desk
    const nameLabel = new Text({
      text: agent.name,
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        fill: 0xf1f5f9,
      },
    });
    nameLabel.anchor.set(0.5, 0);
    nameLabel.position.set(0, 55);
    container.addChild(nameLabel);

    // Status text above agent
    const statusText = agent.currentAction || STATUS_LABELS[agent.status] || agent.status;
    const statusLabel = new Text({
      text: this.truncateText(statusText, 20),
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 10,
        fill: color,
      },
    });
    statusLabel.anchor.set(0.5, 1);
    statusLabel.position.set(0, -65);
    container.addChild(statusLabel);

    // Animation label (Zzz for idle, pulse indicator for active)
    let animationLabel: Text | null = null;
    if (agent.status === 'idle') {
      animationLabel = new Text({
        text: 'Zzz',
        style: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          fill: 0x6b7280,
          fontStyle: 'italic',
        },
      });
      animationLabel.anchor.set(0.5);
      animationLabel.position.set(30, -55);
      container.addChild(animationLabel);
    }

    // Position in the office
    container.position.set(agent.seatPosition.x, agent.seatPosition.y);

    this.agentsContainer.addChild(container);

    this.agentVisuals.set(agent.id, {
      container,
      agentCircle,
      deskGraphics,
      monitorGraphics,
      nameLabel,
      statusLabel,
      animationLabel,
      currentStatus: agent.status,
      animTime: 0,
      targetColor: color,
      currentColor: color,
    });
  }

  private updateAgentVisual(visual: AgentVisual, agent: AgentState): void {
    const color = STATUS_COLORS[agent.status] ?? 0x6b7280;

    // Update position
    visual.container.position.set(agent.seatPosition.x, agent.seatPosition.y);

    // Update status label text
    const statusText = agent.currentAction || STATUS_LABELS[agent.status] || agent.status;
    visual.statusLabel.text = this.truncateText(statusText, 20);
    visual.statusLabel.style.fill = color;

    // Update name
    visual.nameLabel.text = agent.name;

    // If status changed, rebuild the circle and animation
    if (visual.currentStatus !== agent.status) {
      visual.currentStatus = agent.status;
      visual.targetColor = color;

      // Rebuild agent circle with new color
      visual.agentCircle.clear();
      visual.agentCircle.circle(0, -40, 20);
      visual.agentCircle.fill({ color: color });
      visual.agentCircle.circle(0, -40, 20);
      visual.agentCircle.stroke({ color: 0xffffff, width: 2, alpha: 0.3 });

      // Rebuild monitor glow
      visual.monitorGraphics.clear();
      visual.monitorGraphics.roundRect(-25, -5, 50, 30, 4);
      visual.monitorGraphics.fill({ color: 0x1e293b });
      visual.monitorGraphics.roundRect(-25, -5, 50, 30, 4);
      visual.monitorGraphics.stroke({ color: 0x475569, width: 1 });
      visual.monitorGraphics.roundRect(-22, -2, 44, 24, 2);
      visual.monitorGraphics.fill({ color: color, alpha: 0.15 });

      // Handle animation label
      if (visual.animationLabel) {
        visual.container.removeChild(visual.animationLabel);
        visual.animationLabel.destroy();
        visual.animationLabel = null;
      }

      if (agent.status === 'idle') {
        visual.animationLabel = new Text({
          text: 'Zzz',
          style: {
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            fill: 0x6b7280,
            fontStyle: 'italic',
          },
        });
        visual.animationLabel.anchor.set(0.5);
        visual.animationLabel.position.set(30, -55);
        visual.container.addChild(visual.animationLabel);
      }

      visual.animTime = 0;
    }
  }

  private removeAgentVisual(id: string): void {
    const visual = this.agentVisuals.get(id);
    if (visual) {
      this.agentsContainer.removeChild(visual.container);
      visual.container.destroy({ children: true });
      this.agentVisuals.delete(id);
    }
  }

  private animate(deltaTime: number): void {
    for (const [, visual] of this.agentVisuals) {
      visual.animTime += deltaTime * 0.02;

      if (visual.currentStatus === 'idle' && visual.animationLabel) {
        // Bob Zzz up and down
        visual.animationLabel.position.y = -55 + Math.sin(visual.animTime * 3) * 5;
        visual.animationLabel.alpha = 0.5 + Math.sin(visual.animTime * 2) * 0.3;
      } else if (
        visual.currentStatus === 'working' ||
        visual.currentStatus === 'typing' ||
        visual.currentStatus === 'running-command'
      ) {
        // Subtle pulse on the agent circle
        const scale = 1 + Math.sin(visual.animTime * 5) * 0.05;
        visual.agentCircle.scale.set(scale);
      } else {
        // Reset scale
        visual.agentCircle.scale.set(1);
      }
    }
  }

  private truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '\u2026';
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.agentVisuals.forEach((visual) => {
      visual.container.destroy({ children: true });
    });
    this.agentVisuals.clear();

    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
