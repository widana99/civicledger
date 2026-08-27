import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import nodemailer from 'nodemailer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const gmailUser = env.GMAIL_USER || '';
  const gmailPass = env.GMAIL_APP_PASSWORD || '';

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  function emailSenderPlugin(): Plugin {
    return {
      name: 'email-sender-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/send-email' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { to, subject, html, text } = JSON.parse(body);
                const info = await transporter.sendMail({
                  from: `"CivicLedger Layanan Pengaduan" <${gmailUser}>`,
                  to,
                  subject,
                  text: text || 'Pemberitahuan status laporan fasilitas kota CivicLedger.',
                  html,
                  headers: {
                    'X-Priority': '1 (Highest)',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'High',
                    'X-Mailer': 'CivicLedger Notification Engine',
                  },
                });
                console.log('[Gmail SMTP] Email successfully sent to:', to, 'Message ID:', info.messageId);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, messageId: info.messageId }));
              } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : 'Failed to send';
                console.error('[Gmail SMTP] Error sending email:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: errMsg }));
              }
            });
          } else {
            next();
          }
        });
      },
    };
  }

  return {
    plugins: [react(), emailSenderPlugin()],
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@splinetool')) {
              return 'spline-3d-engine';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'analytics-charts';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'geo-maps';
            }
            if (id.includes('@supabase')) {
              return 'supabase-client';
            }
            if (id.includes('framer-motion')) {
              return 'motion-core';
            }
            if (id.includes('lucide-react')) {
              return 'ui-icons';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
              return 'export-utils';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'react-framework';
            }
          },
        },
      },
    },
    optimizeDeps: {
      exclude: [],
    },
  };
});
