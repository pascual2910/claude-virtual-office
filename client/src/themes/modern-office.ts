import type { ThemeConfig } from '../../../shared/types';

export const modernOfficeTheme: ThemeConfig = {
  id: 'modern-office',
  name: 'Modern Office',
  description: 'Professional dark theme with blue accents',
  palette: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    accent: '#8b5cf6',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    idle: '#6b7280',
  },
  office: {
    backgroundColor: 0x0f172a,
    deskColor: 0x334155,
    floorColor: 0x1a1a2e,
    wallColor: 0x1e293b,
  },
};
