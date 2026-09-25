import * as Joi from 'joi';

const isPlaceholderSecret = (value?: string) =>
  !value ||
  value === 'dev-access-secret-change-in-production' ||
  value === 'dev-refresh-secret-change-in-production' ||
  value.length < 32;

export const validationSchema = Joi.object({
  // Application
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),

  // Database
  MONGODB_URI: Joi.string().uri().required(),

  // JWT — production must never use placeholder/short secrets
  JWT_ACCESS_SECRET: Joi.string().min(32).required().custom((value, helpers) => {
    if (process.env.NODE_ENV === 'production' && isPlaceholderSecret(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'jwt-access-secret'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().custom((value, helpers) => {
    if (process.env.NODE_ENV === 'production' && isPlaceholderSecret(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'jwt-refresh-secret'),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Redis (optional)
  REDIS_URL: Joi.string().uri().allow('').optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  // Brevo
  BREVO_API_KEY: Joi.string().required(),
  BREVO_SENDER_EMAIL: Joi.string().email().default('noreply@clienthub.local'),
  BREVO_SENDER_NAME: Joi.string().default('ClientHub'),

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Swagger — default off (enable explicitly in non-prod)
  SWAGGER_ENABLED: Joi.boolean().default(false),
  SWAGGER_PATH: Joi.string().default('api/docs'),
});