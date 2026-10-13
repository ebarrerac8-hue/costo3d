import { useEffect, useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import type { ThemePreference } from '../models/types';
import { href, type Route } from '../router';
import { Icon, type IconName } from './Icon';

type Section = 'panel' | 'nuevo' | 'proyectos' | 'filamentos' | 'configuracion' | 'respaldo';

const NAV: { section: Section; path: string; label: string; icon: IconName }[] = [
  { section: 'panel', path: '/panel', label: 'Panel principal', icon: 'panel' },
  { section: 'nuevo', path: '/nuevo', label: 'Nuevo cálculo', icon: 'plus' },
  { section: 'proyectos', path: '/proyectos', label: 'Mis proyectos', icon: 'folder' },
  { section: 'filamentos', path: '/filamentos', label: 'Filamentos', icon: 'spool' },
  { section: 'configuracion', path: '/configuracion', label: 'Configuración', icon: 'settings' },
  { section: 'respaldo', path: '/respaldo', label: 'Respaldo', icon: 'backup' },
];

function sectionOf(route: Route): Section | null {
  switch (route.name) {
    case 'panel': return 'panel';
    case 'nuevo': return route.editId ? 'proyectos' : 'nuevo';
    case 'proyectos':
    case 'proyecto': return 'proyectos';
    case 'filamentos': return 'filamentos';
    case 'configuracion': return 'configuracion';
    case 'respaldo': return 'respaldo';
    default: return null;
  }
}

const THEMES: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Automático', icon: 'monitor' },
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', icon: 'moon' },
];

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { data, setTheme } = useApp();
  const [open, setOpen] = useState(false);
  const active = sectionOf(route);
  const routeKey = JSON.stringify(route);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [routeKey]);

  return (
    <div className="app">
      <a className="skip-link" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById('contenido')?.focus(); }}>
        Saltar al contenido
      </a>
      <header className="topbar">
        <a className="brand" href={href('/nuevo')}><span className="brand-mark"><Icon name="cube" size={20} /></span>Costo3D</a>
        <button
          type="button" className="icon-btn on-dark" aria-expanded={open} aria-controls="menu-principal"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'x' : 'menu'} size={22} />
        </button>
      </header>

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <a className="brand desktop-only" href={href('/nuevo')}><span className="brand-mark"><Icon name="cube" size={20} /></span>Costo3D</a>
        <nav id="menu-principal" aria-label="Principal">
          <ul>
            {NAV.map((n) => (
              <li key={n.section}>
                <a href={href(n.path)} className={n.section === active ? 'active' : undefined} aria-current={n.section === active ? 'page' : undefined}>
                  <Icon name={n.icon} />{n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-foot">
          <p className="printer-name">{data.settings.printerName}</p>
          <div className="theme-switch" role="group" aria-label="Tema de color">
            {THEMES.map((t) => (
              <button
                key={t.value} type="button" aria-pressed={data.preferences.theme === t.value}
                title={t.label} aria-label={t.label} onClick={() => void setTheme(t.value)}
              >
                <Icon name={t.icon} size={16} />
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main id="contenido" tabIndex={-1}>{children}</main>
    </div>
  );
}
