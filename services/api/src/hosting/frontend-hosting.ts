import { static as serveStatic } from 'express';
import fs from 'node:fs';
import path from 'node:path';

export interface FrontendHostingPaths {
  distRoot: string;
  websiteDist: string;
  hostDist: string;
  adminDist: string;
}

const REQUIRED_FILES = [
  'website/index.html',
  'host/index.html',
  'admin/index.html',
] as const;
const BACKEND_PREFIXES = ['/api', '/health', '/docs', '/uploads', '/metrics'];

function withinPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function backendOwned(pathname: string): boolean {
  return BACKEND_PREFIXES.some((prefix) => withinPrefix(pathname, prefix));
}

function completeDist(candidate: string): boolean {
  return REQUIRED_FILES.every((file) => fs.existsSync(path.join(candidate, file)));
}

export function resolveFrontendHostingPaths(): FrontendHostingPaths {
  const candidates = [
    process.env.FRONTEND_DIST_ROOT,
    path.resolve(process.cwd(), 'dist'),
  ].filter((value): value is string => Boolean(value));
  const distRoot = [...new Set(candidates.map((candidate) => path.resolve(candidate)))].find(completeDist);
  if (!distRoot) {
    throw new Error(
      `ParkEazy frontend build is incomplete. Run "npm run build" first. Expected ${REQUIRED_FILES.join(', ')} under dist/.`,
    );
  }
  return {
    distRoot,
    websiteDist: path.join(distRoot, 'website'),
    hostDist: path.join(distRoot, 'host'),
    adminDist: path.join(distRoot, 'admin'),
  };
}

/** Register built frontends on the same Express instance as the NestJS API. */
export function registerFrontendHosting(
  app: { use: (...args: any[]) => unknown },
  paths: FrontendHostingPaths,
  logger: { log: (message: string) => void },
): void {
  const staticOptions = { index: false, fallthrough: true, etag: true, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 };

  // Guard every static handler so backend-owned paths always reach NestJS.
  const guardedStatic = (directory: string) => {
    const middleware = serveStatic(directory, staticOptions);
    return (req: any, res: any, next: any) => {
      if (backendOwned(req.path)) return next();
      return middleware(req, res, next);
    };
  };

  // Each portal's asset URLs are rooted at its public prefix (/host/ and /admin/).
  app.use('/host', guardedStatic(paths.hostDist));
  app.use('/admin', guardedStatic(paths.adminDist));
  app.use('/', guardedStatic(paths.websiteDist));

  app.use((req: any, res: any, next: any) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const pathname = req.path as string;
    if (backendOwned(pathname)) return next();
    if (path.extname(pathname)) return next();

    if (withinPrefix(pathname, '/host')) {
      return res.sendFile(path.join(paths.hostDist, 'index.html'));
    }
    if (withinPrefix(pathname, '/admin')) {
      return res.sendFile(path.join(paths.adminDist, 'index.html'));
    }
    return res.sendFile(path.join(paths.websiteDist, 'index.html'));
  });

  logger.log(`ParkEazy full-app frontend root: ${paths.distRoot}`);
  logger.log(`Customer website: ${paths.websiteDist}`);
  logger.log(`Host portal: ${paths.hostDist}`);
  logger.log(`Admin portal: ${paths.adminDist}`);
}
