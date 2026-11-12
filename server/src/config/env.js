const path = require('path');
const dotenv = require('dotenv');

// Automatically resolve .env across current directory, server directory, or workspace root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://erp_user:erp_secure_password_123@localhost:5432/erp_records_db?schema=public',

  // CORS Allowed Origins (Comma-separated list or single URL)
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    'https://nexperfumeerp.up.railway.app,http://localhost:3000',

  // JWT Secrets & Security
  JWT_SECRET:
    process.env.JWT_SECRET ||
    'super_secret_jwt_signing_key_change_in_production_min_32_chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_NAME: process.env.COOKIE_NAME || 'erp_token',
  COOKIE_SECURE: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,

  // Business Defaults
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'AED',
  DEFAULT_TAX_RATE: parseFloat(process.env.DEFAULT_TAX_RATE || '5.00'),
  PRICES_INCLUDE_TAX: process.env.PRICES_INCLUDE_TAX !== 'false',

  // Configured Initial Administrator Account (Read strictly on backend)
  ADMIN_NAME: process.env.ADMIN_NAME || 'Administrator',
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'client-admin@example.com').toLowerCase().trim(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@12345',
  ADMIN_ROLE: process.env.ADMIN_ROLE || 'ADMIN',
};

module.exports = env;
