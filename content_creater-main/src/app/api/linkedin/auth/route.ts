/**
 * LinkedIn OAuth - Start Authentication Flow
 * POST /api/linkedin/auth
 *
 * DEPRECATED: This endpoint is maintained for backward compatibility.
 * New implementations should use /api/auth/oauth/linkedin instead.
 * This endpoint now redirects to the new implementation.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Redirect to new OAuth endpoint
    // Copy body and forward to new endpoint
    const newEndpointUrl = new URL(req.url)
    newEndpointUrl.pathname = '/api/auth/oauth/linkedin'

    const response = await fetch(newEndpointUrl, {
      method: 'POST',
      headers: req.headers,
      body: req.body,
    })

    // Return the response from the new endpoint
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } catch (error) {
    console.error('LinkedIn OAuth error:', error)
    return NextResponse.json(
      {
        error: 'Failed to initiate LinkedIn authentication',
        details: (error as Error).message
      },
      { status: 500 }
    )
  }
}
