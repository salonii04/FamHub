import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import tasksRoutes from './routes/tasks';
import authRoutes from './routes/auth';
import { loadEnv } from './config/loadEnv';

loadEnv();

const app = express();
app.set('trust proxy', 1);

const authRateLimitWindowMs = Number.parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10);
const authRateLimitMax = Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10);

const authRateLimiter = rateLimit({
    windowMs: Number.isNaN(authRateLimitWindowMs) ? 900000 : authRateLimitWindowMs,
    max: Number.isNaN(authRateLimitMax) ? 10 : authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again later.'
    }
});

app.use(helmet());

const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean)
    || ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
    origin: corsOrigins,
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
    res.status(status).json({
        success: false,
        error: status === 413 ? 'Request entity too large' : status === 400 ? 'Malformed request body' : 'Internal server error',
    });
});

export default app;