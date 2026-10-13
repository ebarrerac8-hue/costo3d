import { useEffect, useState } from 'react';

/** Router mínimo basado en hash (#/ruta). Funciona en GitHub Pages sin configuración. */
export type Route =
  | { name: 'panel' }
  | { name: 'nuevo'; editId?: string }
  | { name: 'proyectos' }
  | { name: 'proyecto'; id: string }
  | { name: 'filamentos' }
  | { name: 'configuracion' }
  | { name: 'respaldo' }
  | { name: 'imprimir'; id: string; kind: 'cotizacion' | 'interno' }
  | { name: 'noEncontrada' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '');
  const [first, second, third] = path.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  switch (first) {
    case undefined:
    case 'nuevo': return { name: 'nuevo' };
    case 'editar': return second ? { name: 'nuevo', editId: second } : { name: 'noEncontrada' };
    case 'panel': return { name: 'panel' };
    case 'proyectos': return { name: 'proyectos' };
    case 'proyecto': return second ? { name: 'proyecto', id: second } : { name: 'noEncontrada' };
    case 'filamentos': return { name: 'filamentos' };
    case 'configuracion': return { name: 'configuracion' };
    case 'respaldo': return { name: 'respaldo' };
    case 'imprimir':
      return second && (third === 'cotizacion' || third === 'interno')
        ? { name: 'imprimir', id: second, kind: third }
        : { name: 'noEncontrada' };
    default: return { name: 'noEncontrada' };
  }
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return parseRoute(hash);
}

export const href = (path: string): string => `#${path}`;
export function navigate(path: string): void {
  window.location.hash = path;
}
