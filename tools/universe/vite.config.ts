import { defineConfig, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Serve the repo's graphify-out/ folder (incl. dotfiles like .graphify_labels.json,
// which Vite's publicDir would refuse to serve) at /graphify-out/*.
const GRAPHIFY_DIR = fileURLToPath(new URL('../../graphify-out', import.meta.url));

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
};

function graphifyHandler(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/graphify-out/')) return next();
    const rel = decodeURIComponent(req.url.slice('/graphify-out/'.length).split('?')[0]);
    const file = path.resolve(GRAPHIFY_DIR, rel);
    if (!file.startsWith(GRAPHIFY_DIR)) {
      res.statusCode = 403;
      return res.end('forbidden');
    }
    try {
      const data = await readFile(file);
      res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end('not found');
    }
  };
}

function serveGraphifyOut(): Plugin {
  return {
    name: 'serve-graphify-out',
    configureServer(server) {
      server.middlewares.use(graphifyHandler());
    },
    configurePreviewServer(server) {
      server.middlewares.use(graphifyHandler());
    },
  };
}

export default defineConfig({
  plugins: [react(), serveGraphifyOut()],
  server: { port: 5199 },
});
