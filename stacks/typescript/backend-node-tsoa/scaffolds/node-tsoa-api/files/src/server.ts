import express from 'express';
import { RegisterRoutes } from './generated/routes';

/** Builds the app: middleware first, then the routes tsoa generates from the controllers (`npm run generate`). */
export function createServer() {
  const app = express();
  app.use(express.json());
  RegisterRoutes(app);
  return app;
}
