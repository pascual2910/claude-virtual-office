import { Application, Container, Graphics, Text } from 'pixi.js';
import type { AgentState, AgentStatus, ThemeConfig, SceneDecoration, ParticleConfig } from '../../../shared/types';

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
  glowCircle: Graphics | null;
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

interface Particle {
  graphics: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  baseAlpha: number;
}

export class OfficeRenderer {
  private app: Application | null = null;
  private agentVisuals: Map<string, AgentVisual> = new Map();
  private floorContainer: Container = new Container();
  private decorationContainer: Container = new Container();
  private particleContainer: Container = new Container();
  private agentsContainer: Container = new Container();
  private resizeObserver: ResizeObserver | null = null;
  private containerEl: HTMLElement | null = null;
  private onAgentClick: ((id: string) => void) | null = null;
  private particles: Particle[] = [];
  private theme: ThemeConfig['office'] | null = null;

  async init(container: HTMLElement): Promise<void> {
    this.containerEl = container;
    this.app = new Application();

    const bgColor = this.theme?.backgroundColor ?? 0x1a1a2e;

    await this.app.init({
      background: bgColor,
      antialias: true,
      resizeTo: container,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    this.app.stage.addChild(this.floorContainer);
    this.app.stage.addChild(this.decorationContainer);
    this.app.stage.addChild(this.particleContainer);
    this.app.stage.addChild(this.agentsContainer);

    this.drawOfficeBackground();

    this.app.ticker.add((ticker) => {
      this.animate(ticker.deltaTime);
    });

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

  /** Apply a new theme — redraws everything */
  setTheme(themeConfig: ThemeConfig): void {
    this.theme = themeConfig.office;
    if (this.app) {
      this.app.renderer.background.color = themeConfig.office.backgroundColor;
    }
    this.drawOfficeBackground();
    // Rebuild all agent visuals with new theme colors
    const agents: AgentState[] = [];
    for (const [, visual] of this.agentVisuals) {
      // We don't have the full AgentState, but we can force a redraw on next updateAgents call
      visual.currentStatus = 'stopped' as AgentStatus; // Force status change detection
    }
  }

  private get t() {
    // Shorthand for theme office config with fallbacks
    return this.theme ?? {
      backgroundColor: 0x1a1a2e,
      deskColor: 0x334155,
      deskAccent: 0x475569,
      floorColor: 0x1a1a2e,
      wallColor: 0x1e293b,
      wallAccent: 0x334155,
      gridColor: 0x1f2937,
      gridAlpha: 0.3,
      agentGlow: false,
      monitorColor: 0x1e293b,
      monitorGlow: 0x3b82f6,
      decorations: [],
      particles: { type: 'none' as const, count: 0, color: 0, speed: 0, size: 0, alpha: 0 },
    };
  }

  private drawOfficeBackground(): void {
    this.floorContainer.removeChildren();
    this.decorationContainer.removeChildren();
    this.clearParticles();

    if (!this.app) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const t = this.t;

    // Floor
    const floor = new Graphics();
    floor.rect(0, 0, w, h);
    floor.fill({ color: t.floorColor });
    this.floorContainer.addChild(floor);

    // Wall accent at top
    const wall = new Graphics();
    wall.rect(0, 0, w, 55);
    wall.fill({ color: t.wallColor });
    this.floorContainer.addChild(wall);

    // Wall bottom line
    const wallLine = new Graphics();
    wallLine.rect(0, 54, w, 2);
    wallLine.fill({ color: t.wallAccent });
    this.floorContainer.addChild(wallLine);

    // Floor grid
    if (t.gridAlpha > 0) {
      const grid = new Graphics();
      const gridSize = 80;
      for (let x = 0; x < w; x += gridSize) {
        grid.rect(x, 56, 1, h - 56);
        grid.fill({ color: t.gridColor, alpha: t.gridAlpha });
      }
      for (let y = 56; y < h; y += gridSize) {
        grid.rect(0, y, w, 1);
        grid.fill({ color: t.gridColor, alpha: t.gridAlpha });
      }
      this.floorContainer.addChild(grid);
    }

    // Draw decorations
    for (const dec of t.decorations) {
      this.drawDecoration(dec);
    }

    // Spawn particles
    if (t.particles.type !== 'none') {
      this.spawnParticles(t.particles, w, h);
    }
  }

  private drawDecoration(dec: SceneDecoration): void {
    const g = new Graphics();
    const { x, y } = dec.position;

    switch (dec.type) {
      case 'bookshelf': {
        // Shelf frame
        g.roundRect(x, y, dec.width, dec.height, 3);
        g.fill({ color: dec.color });
        g.roundRect(x, y, dec.width, dec.height, 3);
        g.stroke({ color: dec.accentColor ?? 0x666666, width: 1 });
        // Books (colored rectangles)
        const bookW = 6;
        const bookH = dec.height * 0.6;
        const colors = [dec.accentColor ?? 0xd97706, 0x3b82f6, 0xef4444, 0x10b981, 0x8b5cf6, 0xf59e0b];
        for (let i = 0; i < Math.floor(dec.width / (bookW + 2)); i++) {
          const bx = x + 4 + i * (bookW + 2);
          const by = y + dec.height - bookH - 4;
          const bh = bookH * (0.7 + Math.random() * 0.3);
          g.rect(bx, by + (bookH - bh), bookW, bh);
          g.fill({ color: colors[i % colors.length], alpha: 0.7 });
        }
        break;
      }
      case 'plant': {
        // Pot
        g.roundRect(x - 5, y + dec.height - 12, dec.width + 10, 12, 3);
        g.fill({ color: 0x78350f });
        // Leaves (overlapping circles)
        const leafColor = dec.color;
        g.circle(x + dec.width / 2, y + 5, dec.width * 0.4);
        g.fill({ color: leafColor, alpha: 0.8 });
        g.circle(x + dec.width / 2 - 6, y + 10, dec.width * 0.3);
        g.fill({ color: leafColor, alpha: 0.7 });
        g.circle(x + dec.width / 2 + 6, y + 10, dec.width * 0.3);
        g.fill({ color: leafColor, alpha: 0.7 });
        break;
      }
      case 'lamp': {
        // Pole
        g.rect(x + dec.width / 2 - 1, y + 8, 2, dec.height - 8);
        g.fill({ color: 0x78716c });
        // Light cone (glow)
        g.circle(x + dec.width / 2, y + 4, dec.width * 0.6);
        g.fill({ color: dec.color, alpha: 0.3 });
        g.circle(x + dec.width / 2, y + 4, dec.width * 0.3);
        g.fill({ color: dec.color, alpha: 0.6 });
        break;
      }
      case 'window': {
        // Window frame
        g.roundRect(x, y, dec.width, dec.height, 4);
        g.fill({ color: dec.color });
        g.roundRect(x, y, dec.width, dec.height, 4);
        g.stroke({ color: dec.accentColor ?? 0x666666, width: 1.5 });
        // Window panes with warm glow
        const paneW = (dec.width - 8) / 2;
        g.roundRect(x + 3, y + 3, paneW, dec.height - 6, 2);
        g.fill({ color: dec.accentColor ?? 0xfbbf24, alpha: 0.08 });
        g.roundRect(x + paneW + 5, y + 3, paneW, dec.height - 6, 2);
        g.fill({ color: dec.accentColor ?? 0xfbbf24, alpha: 0.08 });
        break;
      }
      case 'viewport': {
        // Space viewport
        g.roundRect(x, y, dec.width, dec.height, 6);
        g.fill({ color: dec.color });
        g.roundRect(x, y, dec.width, dec.height, 6);
        g.stroke({ color: dec.accentColor ?? 0x1a1a4e, width: 2 });
        // Stars inside viewport
        for (let i = 0; i < 20; i++) {
          const sx = x + 5 + Math.random() * (dec.width - 10);
          const sy = y + 3 + Math.random() * (dec.height - 6);
          g.circle(sx, sy, 0.5 + Math.random() * 1);
          g.fill({ color: 0xffffff, alpha: 0.3 + Math.random() * 0.5 });
        }
        break;
      }
      case 'monitor-rack': {
        // Rack frame
        g.roundRect(x, y, dec.width, dec.height, 4);
        g.fill({ color: dec.color });
        // Screens (stacked)
        for (let i = 0; i < 3; i++) {
          const sy = y + 4 + i * (dec.height / 3);
          g.roundRect(x + 4, sy, dec.width - 8, dec.height / 3 - 6, 2);
          g.fill({ color: dec.accentColor ?? 0x06b6d4, alpha: 0.1 + (i === 1 ? 0.1 : 0) });
        }
        // Blinking LEDs
        g.circle(x + dec.width - 6, y + dec.height - 6, 2);
        g.fill({ color: 0x22c55e, alpha: 0.8 });
        break;
      }
      case 'partition': {
        g.rect(x, y, dec.width, dec.height);
        g.fill({ color: dec.color, alpha: 0.5 });
        break;
      }
    }

    this.decorationContainer.addChild(g);
  }

  private spawnParticles(config: ParticleConfig, w: number, h: number): void {
    for (let i = 0; i < config.count; i++) {
      const g = new Graphics();
      g.circle(0, 0, config.size);
      g.fill({ color: config.color, alpha: config.alpha });

      const x = Math.random() * w;
      const y = Math.random() * h;
      g.position.set(x, y);

      let vx = 0;
      let vy = 0;

      switch (config.type) {
        case 'dust':
          vx = (Math.random() - 0.5) * config.speed;
          vy = -Math.random() * config.speed * 0.5;
          break;
        case 'stars':
          // Twinkle in place
          vx = 0;
          vy = 0;
          break;
        case 'steam':
          vx = (Math.random() - 0.5) * config.speed * 0.3;
          vy = -config.speed;
          break;
      }

      this.particleContainer.addChild(g);
      this.particles.push({
        graphics: g,
        x, y, vx, vy,
        life: Math.random() * 1000,
        maxLife: 500 + Math.random() * 500,
        baseAlpha: config.alpha,
      });
    }
  }

  private clearParticles(): void {
    for (const p of this.particles) {
      p.graphics.destroy();
    }
    this.particles = [];
    this.particleContainer.removeChildren();
  }

  updateAgents(agents: AgentState[]): void {
    const currentIds = new Set(agents.map((a) => a.id));

    for (const [id] of this.agentVisuals) {
      if (!currentIds.has(id)) {
        this.removeAgentVisual(id);
      }
    }

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
    const t = this.t;

    // Desk
    const deskGraphics = new Graphics();
    deskGraphics.roundRect(-60, -10, 120, 60, 8);
    deskGraphics.fill({ color: t.deskColor });
    deskGraphics.roundRect(-60, -10, 120, 60, 8);
    deskGraphics.stroke({ color: t.deskAccent, width: 1 });
    container.addChild(deskGraphics);

    // Monitor on desk
    const monitorGraphics = new Graphics();
    monitorGraphics.roundRect(-25, -5, 50, 30, 4);
    monitorGraphics.fill({ color: t.monitorColor });
    monitorGraphics.roundRect(-25, -5, 50, 30, 4);
    monitorGraphics.stroke({ color: t.deskAccent, width: 1 });
    monitorGraphics.roundRect(-22, -2, 44, 24, 2);
    monitorGraphics.fill({ color: color, alpha: 0.15 });
    container.addChild(monitorGraphics);

    // Agent glow ring (for themes that use it)
    let glowCircle: Graphics | null = null;
    if (t.agentGlow) {
      glowCircle = new Graphics();
      glowCircle.circle(0, -40, 26);
      glowCircle.fill({ color: color, alpha: 0.15 });
      container.addChild(glowCircle);
    }

    // Agent circle
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
    const hitArea = new Graphics();
    hitArea.circle(0, -40, 30);
    hitArea.fill({ color: 0xffffff, alpha: 0 });
    agentCircle.addChild(hitArea);
    container.addChild(agentCircle);

    // Initial letter
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

    // Name label
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

    // Status text
    const statusText = agent.currentAction || STATUS_LABELS[agent.status] || agent.status;
    const statusLabel = new Text({
      text: this.truncateText(statusText, 24),
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 10,
        fill: color,
      },
    });
    statusLabel.anchor.set(0.5, 1);
    statusLabel.position.set(0, -65);
    container.addChild(statusLabel);

    // Idle animation label
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

    container.position.set(agent.seatPosition.x, agent.seatPosition.y);
    this.agentsContainer.addChild(container);

    this.agentVisuals.set(agent.id, {
      container,
      agentCircle,
      glowCircle,
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
    const t = this.t;

    visual.container.position.set(agent.seatPosition.x, agent.seatPosition.y);

    const statusText = agent.currentAction || STATUS_LABELS[agent.status] || agent.status;
    visual.statusLabel.text = this.truncateText(statusText, 24);
    visual.statusLabel.style.fill = color;
    visual.nameLabel.text = agent.name;

    if (visual.currentStatus !== agent.status) {
      visual.currentStatus = agent.status;
      visual.targetColor = color;

      // Rebuild agent circle
      visual.agentCircle.clear();
      visual.agentCircle.circle(0, -40, 20);
      visual.agentCircle.fill({ color: color });
      visual.agentCircle.circle(0, -40, 20);
      visual.agentCircle.stroke({ color: 0xffffff, width: 2, alpha: 0.3 });

      // Rebuild glow
      if (visual.glowCircle) {
        visual.glowCircle.clear();
        visual.glowCircle.circle(0, -40, 26);
        visual.glowCircle.fill({ color: color, alpha: 0.15 });
      }

      // Rebuild monitor glow
      visual.monitorGraphics.clear();
      visual.monitorGraphics.roundRect(-25, -5, 50, 30, 4);
      visual.monitorGraphics.fill({ color: t.monitorColor });
      visual.monitorGraphics.roundRect(-25, -5, 50, 30, 4);
      visual.monitorGraphics.stroke({ color: t.deskAccent, width: 1 });
      visual.monitorGraphics.roundRect(-22, -2, 44, 24, 2);
      visual.monitorGraphics.fill({ color: color, alpha: 0.15 });

      // Rebuild desk with theme colors
      visual.deskGraphics.clear();
      visual.deskGraphics.roundRect(-60, -10, 120, 60, 8);
      visual.deskGraphics.fill({ color: t.deskColor });
      visual.deskGraphics.roundRect(-60, -10, 120, 60, 8);
      visual.deskGraphics.stroke({ color: t.deskAccent, width: 1 });

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
    const w = this.app?.screen.width ?? 800;
    const h = this.app?.screen.height ?? 600;

    // Animate agents
    for (const [, visual] of this.agentVisuals) {
      visual.animTime += deltaTime * 0.02;

      if (visual.currentStatus === 'idle' && visual.animationLabel) {
        visual.animationLabel.position.y = -55 + Math.sin(visual.animTime * 3) * 5;
        visual.animationLabel.alpha = 0.5 + Math.sin(visual.animTime * 2) * 0.3;
      } else if (
        visual.currentStatus === 'working' ||
        visual.currentStatus === 'typing' ||
        visual.currentStatus === 'running-command'
      ) {
        const scale = 1 + Math.sin(visual.animTime * 5) * 0.05;
        visual.agentCircle.scale.set(scale);
        if (visual.glowCircle) {
          visual.glowCircle.alpha = 0.1 + Math.sin(visual.animTime * 3) * 0.1;
        }
      } else {
        visual.agentCircle.scale.set(1);
      }
    }

    // Animate particles
    const particleConfig = this.t.particles;
    for (const p of this.particles) {
      p.life += deltaTime;

      switch (particleConfig.type) {
        case 'dust':
          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
          // Wrap around
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          // Gentle drift
          p.vx += (Math.random() - 0.5) * 0.01;
          p.graphics.alpha = p.baseAlpha * (0.5 + Math.sin(p.life * 0.01) * 0.5);
          break;

        case 'stars':
          // Twinkle effect
          p.graphics.alpha = p.baseAlpha * (0.3 + Math.sin(p.life * 0.03 + p.x) * 0.7);
          break;

        case 'steam':
          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
          p.graphics.alpha = p.baseAlpha * Math.max(0, 1 - (p.life % p.maxLife) / p.maxLife);
          // Reset when faded
          if (p.life % p.maxLife > p.maxLife * 0.95) {
            p.y = h * 0.3 + Math.random() * h * 0.4;
            p.x = Math.random() * w;
            p.life = 0;
          }
          break;
      }

      p.graphics.position.set(p.x, p.y);
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

    this.clearParticles();

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
