'use client'

import React, { useState } from 'react';
import { Platform } from '@/types';
import { X, AlertCircle, ExternalLink, Info } from 'lucide-react';

interface CredentialModalProps {
  platform: Platform;
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentials: any) => Promise<void>;
}

const PLATFORM_DOCS = {
  twitter: {
    name: 'Twitter/X',
    docsUrl: 'https://developer.twitter.com/en/docs/twitter-api',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'text', required: true },
      { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', required: true },
    ],
    instructions: [
      'Go to the Twitter Developer Portal',
      'Create a new app or select an existing one',
      'Generate API keys and access tokens under "Keys and tokens"',
      'Copy all four credentials and paste them below',
    ],
  },
  linkedin: {
    name: 'LinkedIn',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'text', required: true },
    ],
    instructions: [
      'Go to LinkedIn Developers',
      'Create a new app',
      'Request access to the "Share on LinkedIn" and "Sign In with LinkedIn" products',
      'Copy your Client ID and Client Secret',
      'Generate an access token using OAuth 2.0 flow',
    ],
  },
  facebook: {
    name: 'Facebook',
    docsUrl: 'https://developers.facebook.com/docs/pages-api',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Page Access Token', type: 'text', required: true },
      { key: 'pageId', label: 'Page ID (Optional)', type: 'text', required: false },
    ],
    instructions: [
      'Go to Facebook Developers',
      'Create a new app with "Business" type',
      'Add the "Pages" product to your app',
      'Generate a Page Access Token for your Facebook Page',
      'Copy your App ID, App Secret, and Page Access Token',
    ],
  },
  instagram: {
    name: 'Instagram',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'text', required: true },
      { key: 'userId', label: 'Instagram User ID (Optional)', type: 'text', required: false },
    ],
    instructions: [
      'Instagram API requires a Facebook Business account',
      'Go to Facebook Developers and create an app',
      'Add Instagram Graph API product',
      'Connect your Instagram Business account',
      'Generate a long-lived access token',
    ],
  },
  tiktok: {
    name: 'TikTok',
    docsUrl: 'https://developer.tiktok.com/',
    fields: [
      { key: 'clientKey', label: 'Client Key', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    instructions: [
      'Go to TikTok Developer Console',
      'Create a new app with "Content Management Tool" category',
      'Enable "Content Posting API"',
      'Copy your Client Key and Client Secret',
      'Use OAuth to connect your account (click the Connect button above)',
    ],
  },
  youtube: {
    name: 'YouTube',
    docsUrl: 'https://developers.google.com/youtube/v3',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    instructions: [
      'Go to Google Cloud Console',
      'Create a new project',
      'Enable YouTube Data API v3',
      'Create OAuth 2.0 Web Application credentials',
      'Copy your Client ID and Client Secret',
      'Use OAuth to connect your account (click the Connect button above)',
    ],
  },
};

const CredentialModal: React.FC<CredentialModalProps> = ({ platform, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  if (!isOpen) return null;

  const platformConfig = PLATFORM_DOCS[platform];

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    const missingFields = platformConfig.fields
      .filter(field => field.required && !formData[field.key]?.trim())
      .map(field => field.label);

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    setIsSaving(true);

    try {
      const credentials = {
        ...formData,
        isConnected: true,
        connectedAt: new Date().toISOString(),
      };

      await onSave(credentials);
      setFormData({});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate/30">
          <h2 className="text-2xl font-bold text-charcoal-dark">
            Connect {platformConfig.name}
          </h2>
          <button
            onClick={onClose}
            className="text-slate hover:text-charcoal-dark transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Security Notice</p>
              <p>
                Credentials are stored locally in your browser. For production use, consider
                using a secure backend server to store sensitive API keys.
              </p>
            </div>
          </div>

          {/* Instructions Toggle */}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-2 text-charcoal hover:text-charcoal-dark mb-4 font-medium"
          >
            <Info className="w-5 h-5" />
            {showInstructions ? 'Hide' : 'Show'} Setup Instructions
          </button>

          {/* Instructions */}
          {showInstructions && (
            <div className="bg-light-gray rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-charcoal-dark mb-3">How to get your credentials:</h3>
              <ol className="space-y-2 text-sm text-slate list-decimal list-inside">
                {platformConfig.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
              <a
                href={platformConfig.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-charcoal hover:text-charcoal-dark font-medium text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View Official Documentation
              </a>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {platformConfig.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-charcoal-dark mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="w-full px-4 py-2 border border-slate/30 rounded-lg focus:ring-2 focus:ring-charcoal focus:border-charcoal"
                  placeholder={`Enter your ${field.label.toLowerCase()}`}
                  required={field.required}
                />
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate/30 bg-light-gray">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate/30 rounded-lg text-charcoal hover:bg-white transition-colors font-medium"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-charcoal text-white rounded-lg hover:bg-charcoal-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Connecting...' : 'Connect Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CredentialModal;
