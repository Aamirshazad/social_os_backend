/**
 * WORKSPACE API ROUTES
 * GET /api/workspace - Get workspace details
 * PATCH /api/workspace - Update workspace (admin)
 * DELETE /api/workspace - Delete workspace (admin)
 *
 * Architecture Pattern:
 * Request → Authentication → Validation → Service → Repository → Database
 */

import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  validationErrorResponse
} from '@/core/middleware/responseHandler'
import {
  createRequestContext,
  generateRequestId,
  extractRequestMetadata,
  requireAdmin
} from '@/core/middleware/auth'
import { WorkspaceService } from '@/services/WorkspaceService'
import { UpdateWorkspaceSchema } from '@/lib/validation/schemas'
import { ZodError } from 'zod'

/**
 * GET /api/workspace
 * Get current workspace details
 *
 * Authentication: Required
 * Authorization: Any authenticated user
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const { ip, userAgent } = extractRequestMetadata(request)

  try {
    const context = await createRequestContext(requestId, ip, userAgent)
    const workspaceService = new WorkspaceService()
    const workspace = await workspaceService.getWorkspace(context)
    return successResponse(workspace, 200)
  } catch (error) {
    return errorResponse(error, requestId)
  }
}

/**
 * PATCH /api/workspace
 * Update workspace settings (admin only)
 *
 * Authentication: Required
 * Authorization: Admin role only
 */
export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId()
  const { ip, userAgent } = extractRequestMetadata(request)

  try {
    const context = await createRequestContext(requestId, ip, userAgent)
    requireAdmin(context)

    const body = await request.json()
    const validatedData = UpdateWorkspaceSchema.parse(body)

    const workspaceService = new WorkspaceService()
    const updated = await workspaceService.updateWorkspace(context, validatedData)

    return successResponse(updated, 200)
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error, requestId)
    }
    return errorResponse(error, requestId)
  }
}

/**
 * DELETE /api/workspace
 * Delete/deactivate workspace (admin only)
 *
 * Authentication: Required
 * Authorization: Admin role only
 */
export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId()
  const { ip, userAgent } = extractRequestMetadata(request)

  try {
    const context = await createRequestContext(requestId, ip, userAgent)
    requireAdmin(context)

    const workspaceService = new WorkspaceService()
    await workspaceService.deleteWorkspace(context)

    return successResponse({ message: 'Workspace deleted successfully' }, 200)
  } catch (error) {
    return errorResponse(error, requestId)
  }
}
