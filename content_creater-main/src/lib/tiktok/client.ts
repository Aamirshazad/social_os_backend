/**
 * TikTok OAuth Client Library
 * Handles OAuth 2.0 authentication and API interactions with TikTok
 */

const TIKTOK_OAUTH_URL = 'https://www.tiktok.com/v1/oauth/authorize';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v1/oauth/token';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v1/user/info/';

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface TikTokUserInfo {
  data: {
    user: {
      open_id: string;
      union_id?: string;
      display_name: string;
      avatar_url?: string;
    };
  };
}

interface TikTokVideoUploadResponse {
  data: {
    video_id: string;
    share_url?: string;
  };
}

export class TikTokClient {
  private clientKey: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientKey: string, clientSecret: string, redirectUri: string) {
    this.clientKey = clientKey;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: 'user.info.basic,video.upload,video.publish',
      redirect_uri: this.redirectUri,
      state: state,
    });

    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${TIKTOK_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier?: string
  ): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TikTok token exchange failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TikTok token refresh failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Get user profile information
   */
  async getUserInfo(accessToken: string, openId: string): Promise<TikTokUserInfo> {
    const params = new URLSearchParams({
      fields: 'open_id,union_id,display_name,avatar_url',
    });

    const response = await fetch(`${TIKTOK_USER_INFO_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch TikTok user info: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Create video upload
   * For TikTok, we need to prepare video data for upload
   */
  async createVideoUpload(
    accessToken: string,
    openId: string,
    videoData: {
      caption: string;
      videoUrl: string;
      videoSize: number;
      mimeType?: string;
    }
  ): Promise<TikTokVideoUploadResponse> {
    const uploadUrl = `https://open.tiktokapis.com/v1/post/publish/video/init/`;

    const body = {
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoData.videoSize,
        chunk_size: 5242880, // 5MB chunks
        total_chunk_count: Math.ceil(videoData.videoSize / 5242880),
      },
      post_info: {
        caption: videoData.caption,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
        video_stereo_type: 'MONO',
      },
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to create TikTok video upload: ${error.error_description || error.error}`
      );
    }

    return response.json();
  }

  /**
   * Publish video to TikTok
   */
  async publishVideo(
    accessToken: string,
    uploadId: string,
    caption: string
  ): Promise<TikTokVideoUploadResponse> {
    const publishUrl = 'https://open.tiktokapis.com/v1/post/publish/video/';

    const body = {
      upload_id: uploadId,
      post_info: {
        caption: caption,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
    };

    const response = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to publish TikTok video: ${error.error_description || error.error}`
      );
    }

    return response.json();
  }
}

/**
 * Create TikTok client instance
 */
export function createTikTokClient(
  clientKey: string,
  clientSecret: string,
  redirectUri: string
): TikTokClient {
  return new TikTokClient(clientKey, clientSecret, redirectUri);
}
