/**
 * Security Middleware & Utilities
 * Implements production-grade security measures
 */

import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';

// ========================================
// 1. Input Validation & Sanitization
// ========================================

/**
 * Validation middleware - catches validation errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Medication validation rules
 */
export const validateMedication = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 characters')
    .escape(),
  
  body('dosage')
    .trim()
    .notEmpty().withMessage('Dosage is required')
    .isLength({ max: 100 }).withMessage('Dosage too long')
    .escape(),
  
  body('form')
    .trim()
    .isIn(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'inhaler', 'drops', 'patch', 'other'])
    .withMessage('Invalid medication form'),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Purpose too long')
    .escape(),
  
  body('total_quantity')
    .isInt({ min: 0, max: 10000 }).withMessage('Invalid quantity')
    .toInt(),
  
  body('remaining_quantity')
    .isInt({ min: 0, max: 10000 }).withMessage('Invalid quantity')
    .toInt(),
  
  validate
];

/**
 * Schedule validation rules
 */
export const validateSchedule = [
  body('medication_id')
    .isInt({ min: 1 }).withMessage('Invalid medication ID')
    .toInt(),
  
  body('time')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:MM required)'),
  
  body('frequency')
    .isIn(['daily', 'weekly', 'monthly', 'as_needed'])
    .withMessage('Invalid frequency'),
  
  body('with_food')
    .optional()
    .isBoolean().withMessage('with_food must be boolean')
    .toBoolean(),
  
  body('special_instructions')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Instructions too long')
    .escape(),
  
  body('start_date')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Invalid date format (YYYY-MM-DD required)'),
  
  validate
];

/**
 * ID parameter validation
 */
export const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID')
    .toInt(),
  validate
];

/**
 * Log validation rules
 */
export const validateLog = [
  body('schedule_id')
    .isInt({ min: 1 }).withMessage('Invalid schedule ID')
    .toInt(),
  
  body('status')
    .isIn(['taken', 'skipped', 'missed']).withMessage('Invalid status'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes too long')
    .escape(),
  
  validate
];

// ========================================
// 2. Rate Limiting
// ========================================

/**
 * General API rate limit: 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limit for auth endpoints: 5 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

/**
 * SMS rate limit: 10 messages per hour
 */
export const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'SMS rate limit exceeded. Please try again later.',
});

// ========================================
// 3. Security Headers (Helmet)
// ========================================

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.groq.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// ========================================
// 4. HTTP Parameter Pollution Protection
// ========================================

export const parameterPollutionProtection = hpp();

// ========================================
// 5. Sanitization Utilities
// ========================================

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .substring(0, 10000); // Limit length
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ========================================
// 6. Error Handler (Prevents info leakage)
// ========================================

export function secureErrorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Don't expose internal error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'An error occurred',
    ...(isDev && { stack: err.stack })
  });
}

// ========================================
// 7. OAuth Token Security
// ========================================

/**
 * Middleware to ensure OAuth tokens are never exposed
 */
export function stripSensitiveData(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Remove sensitive fields
    if (data && typeof data === 'object') {
      delete data.password;
      delete data.token;
      delete data.accessToken;
      delete data.refreshToken;
      delete data.session_token;
    }
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Validate user owns the resource
 */
export async function validateOwnership(req, res, next) {
  try {
    const userId = req.user?.id;
    const resourceId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Add ownership check logic based on your requirements
    // This is a placeholder - implement based on your data model
    next();
  } catch (error) {
    res.status(500).json({ error: 'Ownership validation failed' });
  }
}

export default {
  validate,
  validateMedication,
  validateSchedule,
  validateId,
  validateLog,
  apiLimiter,
  authLimiter,
  smsLimiter,
  securityHeaders,
  parameterPollutionProtection,
  sanitizeInput,
  sanitizeObject,
  secureErrorHandler,
  stripSensitiveData,
  validateOwnership
};
