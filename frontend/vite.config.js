import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self' https://meetplanningapp-production.up.railway.app http://localhost:4000",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    headers: securityHeaders,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
    headers: securityHeaders,
  }
});
