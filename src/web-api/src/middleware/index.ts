import bodyParser from 'body-parser';
import { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { registerPassportMiddleware } from './passport';

export function registerMiddleware(app: Application) {
  // Origin allowlist instead of the previous wildcard (security audit finding
  // M11). Requests without an Origin header (server-to-server, curl) are
  // unaffected - CORS only governs browser cross-origin reads. Override with
  // CORS_ORIGINS as a comma-separated list.
  const allowedOrigins = (
    process.env.CORS_ORIGINS ??
    'https://playpokerodds.com,https://www.playpokerodds.com,http://localhost:4200'
  )
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins }));
  app.disable('x-powered-by');
  app.use(bodyParser.json());
  app.use(morgan('dev'));
  registerPassportMiddleware();
}
export { registerErrorHandlers } from './errorHandler';
