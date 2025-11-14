/**
 * ENTERPRISE ERROR HANDLING SYSTEM
 * Centralized error classes for consistent error handling
 */

export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_UUID = 'INVALID_UUID',

  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  MFA_REQUIRED = 'MFA_REQUIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  WORKSPACE_ACCESS_DENIED = 'WORKSPACE_ACCESS_DENIED',

  // Resource not found (404)
  NOT_FOUND = 'NOT_FOUND',
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  POST_NOT_FOUND = 'POST_NOT_FOUND',
  CAMPAIGN_NOT_FOUND = 'CAMPAIGN_NOT_FOUND',
  MEDIA_NOT_FOUND = 'MEDIA_NOT_FOUND',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  ACCOUNT_ALREADY_CONNECTED = 'ACCOUNT_ALREADY_CONNECTED',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  OAUTH_ERROR = 'OAUTH_ERROR',
  EMAIL_SENDING_ERROR = 'EMAIL_SENDING_ERROR',

  // Service errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT'
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details
    }
  }
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(400, ErrorCode.VALIDATION_ERROR, message, details)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, ErrorCode.UNAUTHORIZED, message)
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, ErrorCode.FORBIDDEN, message)
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, ErrorCode.NOT_FOUND, `${resource} not found`)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, ErrorCode.CONFLICT, message)
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    const details = retryAfter ? { retryAfter } : undefined
    super(429, ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many requests', details)
    this.name = 'RateLimitError'
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(500, ErrorCode.DATABASE_ERROR, `Database error: ${message}`, details)
    this.name = 'DatabaseError'
    Object.setPrototypeOf(this, DatabaseError.prototype)
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string) {
    super(502, ErrorCode.EXTERNAL_API_ERROR, `${service} API error: ${message}`)
    this.name = 'ExternalAPIError'
    Object.setPrototypeOf(this, ExternalAPIError.prototype)
  }
}

export class OAuthError extends AppError {
  constructor(platform: string, message: string) {
    super(400, ErrorCode.OAUTH_ERROR, `OAuth error with ${platform}: ${message}`)
    this.name = 'OAuthError'
    Object.setPrototypeOf(this, OAuthError.prototype)
  }
}

export class EncryptionError extends AppError {
  constructor(message: string) {
    super(500, ErrorCode.ENCRYPTION_ERROR, `Encryption error: ${message}`)
    this.name = 'EncryptionError'
    Object.setPrototypeOf(this, EncryptionError.prototype)
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(503, ErrorCode.SERVICE_UNAVAILABLE, `${service} is temporarily unavailable`)
    this.name = 'ServiceUnavailableError'
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype)
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string) {
    super(504, ErrorCode.TIMEOUT, `${operation} request timed out`)
    this.name = 'TimeoutError'
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(500, ErrorCode.INTERNAL_SERVER_ERROR, error.message)
  }

  return new AppError(500, ErrorCode.INTERNAL_SERVER_ERROR, 'An unknown error occurred')
}

/**
 * Safe error logging (sanitizes sensitive information)
 */
export function logError(error: unknown, context?: Record<string, any>) {
  const appError = toAppError(error)

  // In production, log to error tracking service (Sentry, etc.)
  const logData = {
    timestamp: new Date().toISOString(),
    error: {
      name: appError.name,
      code: appError.code,
      message: appError.message,
      statusCode: appError.statusCode
    },
    context
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', JSON.stringify(logData, null, 2))
  }

  return logData
}
