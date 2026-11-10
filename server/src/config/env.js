require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://erp_user:erp_secure_password_123@localhost:5432/erp_records_db?schema=public',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_signing_key_change_in_production_min_32_chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_NAME: process.env.COOKIE_NAME || 'erp_token',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'AED',
  DEFAULT_TAX_RATE: parseFloat(process.env.DEFAULT_TAX_RATE || '5.00'),
  PRICES_INCLUDE_TAX: process.env.PRICES_INCLUDE_TAX !== 'false',
};

module.exports = env;

