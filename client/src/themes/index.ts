import type { ThemeConfig } from '../../../shared/types';
import { modernOfficeTheme } from './modern-office';
import { libraryTheme } from './library';
import { spaceStationTheme } from './space-station';
import { coffeeShopTheme } from './coffee-shop';

export const themes: ThemeConfig[] = [
  modernOfficeTheme,
  libraryTheme,
  spaceStationTheme,
  coffeeShopTheme,
];

export function getThemeById(id: string): ThemeConfig {
  return themes.find(t => t.id === id) ?? modernOfficeTheme;
}
