/**
 * Twitter API Client Utility
 * Handles Twitter API v2 client initialization and OAuth 1.0a
 */

import { TwitterApi } from 'twitter-api-v2'

/**
 * Create Twitter client with app-level credentials (for OAuth flow)
 */
export function createTwitterClient() {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('Twitter API credentials not configured')
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
  })
}

/**
 * Create Twitter client with user access tokens
 */
export function createUserTwitterClient(accessToken: string, accessSecret: string) {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('Twitter API credentials not configured')
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  })
}

/**
 * Create read-only Twitter client with Bearer Token (OAuth 2.0)
 */
export function createBearerTwitterClient() {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN

  if (!bearerToken) {
    throw new Error('Twitter Bearer Token not configured')
  }

  return new TwitterApi(bearerToken)
}
