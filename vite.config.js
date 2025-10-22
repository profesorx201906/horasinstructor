// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⬅️ Agrega esta sección para configurar el servidor
  server: {
    port: 3001, // Aquí defines el nuevo puerto
    open: true, // Opcional: abre el navegador automáticamente
  },
});