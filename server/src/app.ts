import express from 'express';
import cors from 'cors';
import { API_BASE_PATH, APP_NAME } from '@famhub/shared';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get(`${API_BASE_PATH}/health`, (_req, res) => {
    res.json({ status: 'ok', app: APP_NAME, time: new Date().toISOString() });
  });

  return app;
}