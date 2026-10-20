#!/usr/bin/env node
/**
 * @fileoverview Cross-platform local production gateway for ParkEazy same-origin routing.
 * Emulates the production Nginx/Cloud reverse proxy on Windows/macOS/Linux without external dependencies.
 * 
 * Usage:
 *   node scripts/production-gateway.mjs [--port 3001] [--api-port 4000]
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Command line args or env vars
const args = process.argv.slice(2);
let port = parseInt(process.env.PORT || '3001', 10);
let apiPort = parseInt(process.env.API_PORT || '4000', 10);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) port = parseInt(args[++i], 10);
  if (args[i] === '--api-port' && args[i + 1]) apiPort = parseInt(args[++i], 10);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const distDirs = {
  website: path.join(rootDir, 'apps/website/dist'),
  host: path.join(rootDir, 'apps/host/dist'),
  admin: path.join(rootDir, 'apps/admin/dist'),
};

function serveStaticFile(req, res, filePath, fallbackHtmlPath) {
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA fallback: only if request accepts HTML and fallback file exists
    if (fallbackHtmlPath && fs.existsSync(fallbackHtmlPath)) {
      const htmlStats = fs.statSync(fallbackHtmlPath);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': htmlStats.size,
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(fallbackHtmlPath).pipe(res);
      return;
    }

    // Static asset 404 (do not send HTML for missing CSS/JS)
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 Not Found: ${req.url}`);
  });
}

function proxyRequestToApi(req, res, targetPort) {
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          statusCode: 503,
          error: 'Service Unavailable',
          message: `Backend API service is not reachable on port ${targetPort}. Start it via: npm run dev:api`,
          timestamp: new Date().toISOString(),
          details: err.message,
        })
      );
    }
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API Route Separation: Never serve index.html for API routes
  if (pathname === '/health' || pathname.startsWith('/health/')) {
    return proxyRequestToApi(req, res, apiPort);
  }
  if (pathname === '/api/v1' || pathname.startsWith('/api/v1/')) {
    return proxyRequestToApi(req, res, apiPort);
  }

  // 2. Trailing slash normalization for portal roots
  if (pathname === '/host') {
    res.writeHead(301, { Location: `/host/${parsedUrl.search}` });
    return res.end();
  }
  if (pathname === '/admin') {
    res.writeHead(301, { Location: `/admin/${parsedUrl.search}` });
    return res.end();
  }

  // 3. Host Portal (/host/ -> apps/host/dist)
  if (pathname.startsWith('/host/')) {
    const subPath = pathname.slice('/host/'.length);
    const targetFile = path.join(distDirs.host, subPath || 'index.html');
    const fallback = path.join(distDirs.host, 'index.html');
    return serveStaticFile(req, res, targetFile, fallback);
  }

  // 4. Admin Panel (/admin/ -> apps/admin/dist)
  if (pathname.startsWith('/admin/')) {
    const subPath = pathname.slice('/admin/'.length);
    const targetFile = path.join(distDirs.admin, subPath || 'index.html');
    const fallback = path.join(distDirs.admin, 'index.html');
    return serveStaticFile(req, res, targetFile, fallback);
  }

  // 5. Customer Website (/ -> apps/website/dist)
  const subPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const targetFile = path.join(distDirs.website, subPath || 'index.html');
  const fallback = path.join(distDirs.website, 'index.html');
  return serveStaticFile(req, res, targetFile, fallback);
});

server.listen(port, () => {
  console.log(`\n===============================================================`);
  console.log(`  ParkEazy Production Same-Origin Gateway`);
  console.log(`===============================================================`);
  console.log(`  Customer Website: http://localhost:${port}/`);
  console.log(`  Host Portal:      http://localhost:${port}/host/`);
  console.log(`  Admin Panel:      http://localhost:${port}/admin/`);
  console.log(`  REST API Proxy:   http://localhost:${port}/api/v1/ -> :${apiPort}`);
  console.log(`  Health Check:     http://localhost:${port}/health  -> :${apiPort}`);
  console.log(`===============================================================\n`);
});

// Clean shutdown handler
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
