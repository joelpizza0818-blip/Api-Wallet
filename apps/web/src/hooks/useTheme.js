import { useEffect, useState } from 'react';

const THEME_PREF_KEY = 'api-wallet-theme-prefs';
const THEME_STORAGE_KEY = 'api-wallet-theme';

function getInitialTheme() {
  try {
    const prefs = localStorage.getItem(THEME_PREF_KEY);
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (parsed.primaryTheme) {
        return parsed.primaryTheme === 'light' ? 'light' : 'dark';
      }
    }
  } catch {}

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return 'dark';
}

function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      try {
        const prefs = localStorage.getItem(THEME_PREF_KEY);
        const parsed = prefs ? JSON.parse(prefs) : {};
        parsed.primaryTheme = nextTheme;
        localStorage.setItem(THEME_PREF_KEY, JSON.stringify(parsed));
      } catch {}
      return nextTheme;
    });
  }

  return { theme, toggleTheme };
}

export default useTheme;
