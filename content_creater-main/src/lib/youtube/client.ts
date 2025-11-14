/**
 * YouTube OAuth Client Library
 * Handles OAuth 2.0 authentication and API interactions with YouTube
 */

const YOUTUBE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';

interface YouTubeTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface YouTubeChannelInfo {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
    };
  }>;
}

interface YouTubeVideoResponse {
  id: string;
  snippet: {
    title: string;
    description: string;
  };
}

export class YouTubeClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${YOUTUBE_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier?: string
  ): Promise<YouTubeTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    if (codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

    const response = await fetch(YOUTUBE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube token exchange failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<YouTubeTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(YOUTUBE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube token refresh failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Get user's primary channel information
   */
  async getChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
    const params = new URLSearchParams({
      part: 'id,snippet',
      mine: 'true',
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to fetch YouTube channel info: ${error.error.message || 'Unknown error'}`
      );
    }

    return response.json();
  }

  /**
   * Upload video to YouTube
   * Uses resumable upload protocol for reliability
   */
  async uploadVideo(
    accessToken: string,
    videoFile: {
      title: string;
      description: string;
      tags?: string[];
      privacyStatus?: 'public' | 'private' | 'unlisted';
      categoryId?: string;
      buffer: Buffer;
      mimeType: string;
    }
  ): Promise<YouTubeVideoResponse> {
    // Step 1: Initialize resumable upload
    const metadata = {
      snippet: {
        title: videoFile.title,
        description: videoFile.description,
        tags: videoFile.tags || [],
        categoryId: videoFile.categoryId || '22', // Default to "Short Movies"
      },
      status: {
        privacyStatus: videoFile.privacyStatus || 'private',
      },
    };

    const initResponse = await fetch(
      `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': videoFile.mimeType,
          'X-Upload-Content-Length': videoFile.buffer.length.toString(),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(
        `Failed to initialize YouTube upload: ${error.error.message || 'Unknown error'}`
      );
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('No upload URL provided by YouTube');
    }

    // Step 2: Upload video content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': videoFile.mimeType,
      },
      body: videoFile.buffer,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(
        `Failed to upload YouTube video: ${error.error.message || 'Unknown error'}`
      );
    }

    return uploadResponse.json();
  }

  /**
   * Update video metadata
   */
  async updateVideoMetadata(
    accessToken: string,
    videoId: string,
    metadata: {
      title?: string;
      description?: string;
      tags?: string[];
      privacyStatus?: 'public' | 'private' | 'unlisted';
    }
  ): Promise<YouTubeVideoResponse> {
    const body = {
      id: videoId,
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags || [],
        categoryId: '22',
      },
      status: {
        privacyStatus: metadata.privacyStatus || 'private',
      },
    };

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?part=snippet,status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to update YouTube video: ${error.error.message || 'Unknown error'}`
      );
    }

    return response.json();
  }

  /**
   * Get video details
   */
  async getVideoDetails(accessToken: string, videoId: string): Promise<YouTubeVideoResponse> {
    const params = new URLSearchParams({
      part: 'snippet,status',
      id: videoId,
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to fetch YouTube video details: ${error.error.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    return data.items[0];
  }
}

/**
 * Create YouTube client instance
 */
export function createYouTubeClient(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): YouTubeClient {
  return new YouTubeClient(clientId, clientSecret, redirectUri);
}
