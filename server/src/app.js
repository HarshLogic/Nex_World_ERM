const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { corsOptions } = require('./config/cors');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error.middleware');
const { sendError } = require('./utils/response.util');

const app = express();

// 1. Production CORS Middleware MUST be registered first
// Handles all origins, allowed methods/headers, and preflight OPTIONS requests
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Helmet Security Headers (crossOriginResourcePolicy: false for cross-domain API access)
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Root & Health Check Endpoints
app.get('/', (req, res) => {
  return res.json({
    status: 'online',
    message: 'Perfume ERP & POS Backend API is running successfully',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

app.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
});

// Centralized Error Handler (Retains CORS headers on error responses)
app.use(errorHandler);

module.exports = app;
