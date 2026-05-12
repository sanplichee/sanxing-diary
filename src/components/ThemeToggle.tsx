import { Sun, Moon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { state, updateSettings } = useApp();
  const { resolvedTheme } = useTheme();

  const cycle = () => {
    const next = state.settings.themeMode === 0 ? 2 : state.settings.themeMode === 2 ? 1 : 0;
    updateSettings({ themeMode: next as 0 | 1 | 2 });
  };

  const labels = ['系统', '深色', '浅色'];

  return (
    <button className="theme-toggle-btn" onClick={cycle} title={`主题: ${labels[state.settings.themeMode]}`}>
      {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
