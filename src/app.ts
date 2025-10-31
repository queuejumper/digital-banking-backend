import express from 'express';
import cors from 'cors';
import { router as apiRouter } from './routes';
import { toErrorResponse } from './utils/errors';
import { serializeJsonSafe } from './utils/json';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';

export const createApp = () => {
  const app = express();
  // Trust proxy headers (required for Fly.io/load balancers)
  app.set('trust proxy', true);
  // Broad CORS for local dev with auth headers and preflight support
  app.use(
    cors({
      origin: env.nodeEnv === 'production' ? env.frontendOrigin : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    })
  );
  app.options('*', cors());
  app.use(express.json());

  // Serialize BigInt safely in all JSON responses
  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => originalJson(serializeJsonSafe(body));
    next();
  });

  // Basic rate limiting (can be refined per-route)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Stricter rate limit for auth endpoints
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'digital-bank-backend' });
  });

  app.use('/api/v1', apiRouter);

  // Global error handler with debug details in non-production
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  });
  return app;
};


