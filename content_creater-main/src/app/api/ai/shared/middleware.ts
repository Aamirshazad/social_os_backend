import { NextRequest } from 'next/server';
import { ZodSchema } from 'zod';
import { validationErrorResponse } from './response';

/**
 * Validates request body against a Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ valid: true; data: T } | { valid: false; response: Response }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { valid: true, data: validatedData };
  } catch (error: any) {
    if (error.errors) {
      return { valid: false, response: validationErrorResponse(error.errors) };
    }
    return { valid: false, response: validationErrorResponse([{ message: 'Invalid request body' }]) };
  }
}

/**
 * Extracts workspace context from request headers or cookies
 * In a real implementation, this would validate the user's session
 * and ensure they have access to the workspace
 */
export function getWorkspaceContext(request: NextRequest): { workspaceId?: string; userId?: string } {
  // TODO: Implement proper authentication and workspace validation
  // For now, return placeholder values
  const workspaceId = request.headers.get('x-workspace-id') || undefined;
  const userId = request.headers.get('x-user-id') || undefined;
  
  return { workspaceId, userId };
}

/**
 * Checks if API keys are configured
 */
export function checkApiKeys(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    missing.push('GEMINI_API_KEY');
  }
  
  if (!process.env.OPENAI_API_KEY && !process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    missing.push('OPENAI_API_KEY');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Rate limiting helper (placeholder for future implementation)
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  resetAt?: Date;
}

export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  // TODO: Implement rate limiting using Redis or similar
  // For now, always allow requests
  return {
    allowed: true,
  };
}
