/**
 * RESPONSE HANDLING UTILITIES
 * Consistent response formatting across all API routes
 */

import { NextResponse } from 'next/server'
import { AppError, isAppError, toAppError, logError } from '../errors/AppError'
import { ZodError } from 'zod'

/**
 * Success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status: statusCode }
  )
}

/**
 * Error response
 */
export function errorResponse(error: unknown, requestId?: string) {
  const appError = toAppError(error)

  // Log the error
  logError(error, { requestId })

  return NextResponse.json(
    {
      success: false,
      error: appError.message,
      code: appError.code,
      details: appError.details,
      requestId
    },
    { status: appError.statusCode }
  )
}

/**
 * Validation error response
 */
export function validationErrorResponse(error: ZodError, requestId?: string) {
  const details: Record<string, string[]> = {}

  error.issues.forEach((err) => {
    const path = err.path.join('.')
    if (!details[path]) {
      details[path] = []
    }
    details[path].push(err.message)
  })

  return NextResponse.json(
    {
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details,
      requestId
    },
    { status: 400 }
  )
}

/**
 * Paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
) {
  const totalPages = Math.ceil(total / pageSize)

  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    },
    { status: 200 }
  )
}

/**
 * Cursor-paginated response
 */
export function cursorPaginatedResponse<T>(
  data: T[],
  nextCursor?: string,
  prevCursor?: string,
  hasMore?: boolean
) {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        nextCursor,
        prevCursor,
        hasMore: hasMore ?? false
      }
    },
    { status: 200 }
  )
}

/**
 * Async handler wrapper - catches errors and formats responses
 */
export function handleAsync(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (error) {
      return errorResponse(error)
    }
  }
}

/**
 * Type guard for success responses
 */
export function isSuccessResponse(response: any): boolean {
  return response?.success === true
}

/**
 * Type guard for error responses
 */
export function isErrorResponse(response: any): boolean {
  return response?.success === false
}

/**
 * Extract and normalize response
 */
export async function extractResponseData(response: NextResponse) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
