/**
 * Instagram API Client Utility
 * Handles Instagram Graph API OAuth 2.0 and content publishing
 * Note: Instagram API requires a Facebook Business account
 */

import { createHmac } from 'crypto'

/**
 * Instagram OAuth 2.0 URLs (via Facebook)
 */
export const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v24.0/dialog/oauth';
export const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v24.0/oauth/access_token';
export const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v24.0';
export const FACEBOOK_GRAPH_BASE = 'https://graph.facebook.com/v24.0';

/**
 * Generate appsecret_proof for Instagram server-to-server calls
 * This is required when making API calls from the backend with an app secret
 */
export function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex')
}

/**
 * Required OAuth scopes for Instagram
 * - instagram_basic: Basic access to Instagram business account data
 * - instagram_content_publish: Create posts (images, videos, carousels)
 * - instagram_manage_insights: Get analytics (reach, impressions, engagement)
 * - pages_manage_posts: Create posts on connected Facebook pages
 * - pages_read_engagement: Read engagement metrics
 */
export const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'pages_manage_posts',
  'pages_read_engagement',
];

/**
 * Generate Instagram OAuth authorization URL (via Facebook)
 */
export function generateInstagramAuthUrl(
  appId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state: state,
    scope: INSTAGRAM_SCOPES.join(','),
    response_type: 'code',
  });

  return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
}> {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Get long-lived access token (60 days)
 */
export async function getLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${FACEBOOK_GRAPH_BASE}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to get long-lived token');
  }

  return response.json();
}

/**
 * Get Facebook Pages connected to the account
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getFacebookPages(accessToken: string, appSecretProof?: string): Promise<{
  data: Array<{
    id: string;
    name: string;
    access_token: string;
  }>;
}> {
  let url = `${FACEBOOK_GRAPH_BASE}/me/accounts?access_token=${accessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook pages');
  }

  return response.json();
}

/**
 * Get Instagram Business Account ID from Facebook Page
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getInstagramBusinessAccount(
  pageId: string,
  pageAccessToken: string,
  appSecretProof?: string
): Promise<string | null> {
  let url = `${FACEBOOK_GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram business account');
  }

  const data = await response.json();
  return data.instagram_business_account?.id || null;
}

/**
 * Get Instagram account info
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getInstagramAccountInfo(
  igUserId: string,
  accessToken: string,
  appSecretProof?: string
): Promise<{
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}> {
  let url = `${FACEBOOK_GRAPH_BASE}/${igUserId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram account info');
  }

  return response.json();
}

/**
 * Create Instagram media container (Step 1 of posting)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function createMediaContainer(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption,
    access_token: accessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create media container');
  }

  return response.json();
}

/**
 * Create Instagram carousel container (for multiple images)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function createCarouselContainer(
  igUserId: string,
  accessToken: string,
  imageUrls: string[],
  caption: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  // First, create containers for each image
  const childrenIds: string[] = [];

  for (const imageUrl of imageUrls) {
    const params = new URLSearchParams({
      image_url: imageUrl,
      is_carousel_item: 'true',
      access_token: accessToken,
    });

    if (appSecretProof) {
      params.append('appsecret_proof', appSecretProof);
    }

    const response = await fetch(
      `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
      {
        method: 'POST',
        body: params,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create carousel item');
    }

    const data = await response.json();
    childrenIds.push(data.id);
  }

  // Create carousel container
  const params = new URLSearchParams({
    media_type: 'CAROUSEL',
    children: childrenIds.join(','),
    caption: caption,
    access_token: accessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create carousel container');
  }

  return response.json();
}

/**
 * Create Instagram video container
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function createVideoContainer(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    media_type: 'VIDEO',
    video_url: videoUrl,
    caption: caption,
    access_token: accessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create video container');
  }

  return response.json();
}

/**
 * Publish media container to Instagram
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function publishMediaContainer(
  igUserId: string,
  accessToken: string,
  creationId: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media_publish`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to publish media container');
  }

  return response.json();
}

/**
 * Upload image to a publicly accessible URL
 * Instagram requires images to be hosted at a public URL
 * This is a helper to upload to Supabase Storage
 */
export async function uploadImageToStorage(
  imageBuffer: Buffer,
  fileName: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  // Upload to Supabase Storage
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
  formData.append('file', blob, fileName);

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/media/${fileName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload image to storage');
  }

  // Return public URL
  return `${supabaseUrl}/storage/v1/object/public/media/${fileName}`;
}

/**
 * Get Instagram media insights (analytics)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getMediaInsights(
  mediaId: string,
  accessToken: string,
  appSecretProof?: string
): Promise<{
  data: Array<{
    name: string;
    values: Array<{ value: number }>;
  }>;
}> {
  const metrics = ['engagement', 'impressions', 'reach', 'saved'];

  let url = `${FACEBOOK_GRAPH_BASE}/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch media insights');
  }

  return response.json();
}
