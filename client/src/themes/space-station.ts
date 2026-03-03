import type { ThemeConfig } from '../../../shared/types';

export const spaceStationTheme: ThemeConfig = {
  id: 'space-station',
  name: 'Space Station',
  description: 'Sci-fi command center with holographic displays and starfield',
  emoji: '🚀',
  palette: {
    primary: '#06b6d4',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    background: '#0a0a1a',
    surface: '#111127',
    text: '#e0f2fe',
    textSecondary: '#7dd3fc',
    success: '#22c55e',
    warning: '#eab308',
    error: '#f43f5e',
    idle: '#6b7280',
  },
  office: {
    backgroundColor: 0x0a0a1a,
    deskColor: 0x1a1a3e,
    deskAccent: 0x06b6d4,
    floorColor: 0x0a0a1a,
    wallColor: 0x111127,
    wallAccent: 0x8b5cf6,
    gridColor: 0x1a1a3e,
    gridAlpha: 0.2,
    agentGlow: true,
    monitorColor: 0x111127,
    monitorGlow: 0x06b6d4,
    decorations: [
      // Viewport window along top wall
      { type: 'viewport', position: { x: 100, y: 5 }, width: 500, height: 45, color: 0x0a0a2e, accentColor: 0x1a1a4e },
      // Console monitors
      { type: 'monitor-rack', position: { x: 30, y: 60 }, width: 40, height: 60, color: 0x1a1a3e, accentColor: 0x8b5cf6 },
      { type: 'monitor-rack', position: { x: 630, y: 60 }, width: 40, height: 60, color: 0x1a1a3e, accentColor: 0x06b6d4 },
    ],
    particles: { type: 'stars', count: 40, color: 0xffffff, speed: 0.1, size: 1.5, alpha: 0.6 },
  },
};
