import express from 'express';
import cors from 'cors';
import { router as apiRouter } from './routes';
import { toErrorResponse } from './utils/errors';
import { serializeJsonSafe } from './utils/json';

export const createApp = () => {
  const app = express();
  // Broad CORS for local dev with auth headers and preflight support
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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


