import useTheme from '../../../hooks/useTheme';
import './ThemeToggle.css';

function MoonIcon() {
  return <path d="M21 12.8A8.6 8.6 0 0 1 11.2 3a9 9 0 1 0 9.8 9.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />;
}

function SunIcon() {
  return <><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'oscuro' : 'claro';

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Cambiar a modo ${nextTheme}`} title={`Modo ${nextTheme}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      </svg>
    </button>
  );
}

export default ThemeToggle;
