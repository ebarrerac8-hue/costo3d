import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' permite publicar en GitHub Pages sin importar el nombre del repositorio.
// La navegación usa "#/" (hash), por lo que no se necesita configuración de servidor.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
