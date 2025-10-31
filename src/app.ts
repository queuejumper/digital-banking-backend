import express from 'express';
import { router as apiRouter } from './routes';

export const createApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'digital-bank-backend' });
  });

  app.use('/api/v1', apiRouter);
  return app;
};


