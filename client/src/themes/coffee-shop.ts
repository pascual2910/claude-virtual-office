import type { ThemeConfig } from '../../../shared/types';

export const coffeeShopTheme: ThemeConfig = {
  id: 'coffee-shop',
  name: 'Coffee Shop',
  description: 'Warm cafe with round tables, plants, and ambient glow',
  emoji: '☕',
  palette: {
    primary: '#92400e',
    secondary: '#78350f',
    accent: '#d97706',
    background: '#1a120d',
    surface: '#261a12',
    text: '#fef3c7',
    textSecondary: '#c4a882',
    success: '#65a30d',
    warning: '#d97706',
    error: '#dc2626',
    idle: '#78716c',
  },
  office: {
    backgroundColor: 0x1a120d,
    deskColor: 0x6b4930,
    deskAccent: 0x92400e,
    floorColor: 0x1a120d,
    wallColor: 0x261a12,
    wallAccent: 0x3d2a1e,
    gridColor: 0x261a12,
    gridAlpha: 0.1,
    agentGlow: false,
    monitorColor: 0x261a12,
    monitorGlow: 0xd97706,
    decorations: [
      // Counter / bar along top
      { type: 'bookshelf', position: { x: 200, y: 8 }, width: 300, height: 40, color: 0x44332a, accentColor: 0x92400e },
      // Plants
      { type: 'plant', position: { x: 50, y: 70 }, width: 30, height: 40, color: 0x4d7c0f },
      { type: 'plant', position: { x: 650, y: 70 }, width: 30, height: 40, color: 0x4d7c0f },
      { type: 'plant', position: { x: 350, y: 350 }, width: 25, height: 35, color: 0x65a30d },
      // Window with warm light
      { type: 'window', position: { x: 550, y: 10 }, width: 100, height: 40, color: 0x3d2a1e, accentColor: 0xfbbf24 },
      // Lamps
      { type: 'lamp', position: { x: 120, y: 90 }, width: 8, height: 20, color: 0xfbbf24 },
      { type: 'lamp', position: { x: 580, y: 90 }, width: 8, height: 20, color: 0xfbbf24 },
    ],
    particles: { type: 'steam', count: 8, color: 0xfef3c7, speed: 0.3, size: 3, alpha: 0.12 },
  },
};
