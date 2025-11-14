/**
 * LinkedIn API Client Utility
 * Handles LinkedIn OAuth 2.0 and API v2 integration
 */

/**
 * LinkedIn OAuth 2.0 URLs
 */
export const LINKEDIN_OAUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
export const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
export const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

/**
 * Required OAuth scopes for LinkedIn (OpenID Connect)
 *
 * IMPORTANT: LinkedIn has migrated to OpenID Connect (OIDC)
 * Scopes available depend on which products are enabled in your LinkedIn Developer Portal
 *
 * Basic scopes (always use these):
 * - openid: Required for OpenID Connect
 * - profile: User profile information
 * - email: User email address
 *
 * Optional scopes (only use if product is enabled):
 * - w_member_social: Allows posting to LinkedIn (requires "Share on LinkedIn" product enabled)
 *
 * If you get "invalid_scope_error", it means a scope is not authorized:
 * 1. Remove the problematic scope from this array, OR
 * 2. Enable the corresponding product in LinkedIn Developer Portal
 *
 * For posting capability, you must:
 * 1. Enable "Share on LinkedIn" product in Developer Portal
 * 2. Then add 'w_member_social' to this array
 */
export const LINKEDIN_SCOPES = [
  'openid',      // Required for OpenID Connect
  'profile',     // Get user profile info
  'email',       // Get user email
  // 'w_member_social', // UNCOMMENT THIS ONLY IF "Share on LinkedIn" product is enabled in Developer Portal
];

/**
 * Generate LinkedIn OAuth authorization URL
 */
export function generateLinkedInAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
    scope: LINKEDIN_SCOPES.join(' '),
  });

  return `${LINKEDIN_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Get LinkedIn user profile via OpenID Connect userinfo endpoint
 * This is the recommended endpoint for new LinkedIn apps using OpenID Connect
 *
 * Response includes:
 * - sub: User identifier (format: ACoAA...)
 * - name: Full name
 * - given_name: First name
 * - family_name: Last name
 * - picture: Profile picture URL
 * - email: Email address
 */
export async function getLinkedInProfile(accessToken: string): Promise<{
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email?: string;
}> {
  const response = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch LinkedIn profile: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get LinkedIn user's URN (Uniform Resource Name)
 */
export async function getLinkedInUserUrn(accessToken: string): Promise<string> {
  const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202402',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn user URN');
  }

  const data = await response.json();
  return data.id; // Returns the user's URN
}

/**
 * Post to LinkedIn (UGC Posts)
 */
export async function postToLinkedIn(
  accessToken: string,
  authorUrn: string,
  text: string,
  visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC',
  mediaUrn?: string
): Promise<{ id: string }> {
  const shareContent: any = {
    author: `urn:li:person:${authorUrn}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: text,
        },
        shareMediaCategory: mediaUrn ? 'IMAGE' : 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  };

  // Add media if provided
  if (mediaUrn) {
    shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = [
      {
        status: 'READY',
        media: mediaUrn,
      },
    ];
  }

  const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202402',
    },
    body: JSON.stringify(shareContent),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post to LinkedIn: ${error}`);
  }

  return response.json();
}

/**
 * Initialize image upload to LinkedIn
 */
export async function initializeImageUpload(
  accessToken: string,
  authorUrn: string
): Promise<{
  uploadUrl: string;
  asset: string;
}> {
  const requestBody = {
    registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
      owner: `urn:li:person:${authorUrn}`,
      serviceRelationships: [
        {
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        },
      ],
    },
  };

  const response = await fetch(`${LINKEDIN_API_BASE}/assets?action=registerUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202402',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to initialize image upload: ${error}`);
  }

  const data = await response.json();
  return {
    uploadUrl: data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
    asset: data.value.asset,
  };
}

/**
 * Upload image binary to LinkedIn
 */
export async function uploadImageBinary(
  uploadUrl: string,
  imageBuffer: Buffer,
  accessToken: string
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image binary to LinkedIn');
  }
}

/**
 * Initialize video upload to LinkedIn
 */
export async function initializeVideoUpload(
  accessToken: string,
  authorUrn: string
): Promise<{
  uploadUrl: string;
  asset: string;
}> {
  const requestBody = {
    registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
      owner: `urn:li:person:${authorUrn}`,
      serviceRelationships: [
        {
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        },
      ],
    },
  };

  const response = await fetch(`${LINKEDIN_API_BASE}/assets?action=registerUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202402',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to initialize video upload: ${error}`);
  }

  const data = await response.json();
  return {
    uploadUrl: data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
    asset: data.value.asset,
  };
}

/**
 * Upload video binary to LinkedIn
 */
export async function uploadVideoBinary(
  uploadUrl: string,
  videoBuffer: Buffer,
  accessToken: string
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: videoBuffer,
  });

  if (!response.ok) {
    throw new Error('Failed to upload video binary to LinkedIn');
  }
}

/**
 * Refresh LinkedIn access token
 */
export async function refreshLinkedInToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
}> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh token');
  }

  return response.json();
}
