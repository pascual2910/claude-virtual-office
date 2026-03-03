import type { ThemeConfig } from '../../../shared/types';

export const libraryTheme: ThemeConfig = {
  id: 'library',
  name: 'Cozy Library',
  description: 'Warm wooden library with bookshelves and reading lamps',
  emoji: '📚',
  palette: {
    primary: '#d97706',
    secondary: '#b45309',
    accent: '#f59e0b',
    background: '#1c1410',
    surface: '#2a1f17',
    text: '#fef3c7',
    textSecondary: '#d4a574',
    success: '#65a30d',
    warning: '#f59e0b',
    error: '#dc2626',
    idle: '#78716c',
  },
  office: {
    backgroundColor: 0x1c1410,
    deskColor: 0x5c3d2e,
    deskAccent: 0x8b6544,
    floorColor: 0x1c1410,
    wallColor: 0x2a1f17,
    wallAccent: 0x44332a,
    gridColor: 0x2a1f17,
    gridAlpha: 0.15,
    agentGlow: false,
    monitorColor: 0x2a1f17,
    monitorGlow: 0xd97706,
    decorations: [
      // Bookshelves along the top wall
      { type: 'bookshelf', position: { x: 30, y: 10 }, width: 80, height: 45, color: 0x5c3d2e, accentColor: 0xd97706 },
      { type: 'bookshelf', position: { x: 130, y: 10 }, width: 80, height: 45, color: 0x5c3d2e, accentColor: 0x65a30d },
      { type: 'bookshelf', position: { x: 230, y: 10 }, width: 80, height: 45, color: 0x5c3d2e, accentColor: 0x3b82f6 },
      { type: 'bookshelf', position: { x: 430, y: 10 }, width: 80, height: 45, color: 0x5c3d2e, accentColor: 0xdc2626 },
      { type: 'bookshelf', position: { x: 530, y: 10 }, width: 80, height: 45, color: 0x5c3d2e, accentColor: 0x8b5cf6 },
      { type: 'bookshelf', position: { x: 630, y: 10 }, width: 80, height: 45, color: 0x5c3d2e, accentColor: 0xf59e0b },
      // Reading lamps
      { type: 'lamp', position: { x: 80, y: 100 }, width: 10, height: 25, color: 0xfbbf24 },
      { type: 'lamp', position: { x: 500, y: 100 }, width: 10, height: 25, color: 0xfbbf24 },
      // Plants
      { type: 'plant', position: { x: 350, y: 70 }, width: 25, height: 35, color: 0x4d7c0f },
    ],
    particles: { type: 'dust', count: 15, color: 0xfbbf24, speed: 0.15, size: 2, alpha: 0.25 },
  },
};
