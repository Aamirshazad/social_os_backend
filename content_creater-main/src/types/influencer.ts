// Influencer Marketing Campaign Types

export type InfluencerPlatform = 'facebook' | 'youtube' | 'tiktok' | 'instagram';

export interface Influencer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  platforms: InfluencerProfile[];
  
  // Demographics
  age?: number;
  gender?: 'male' | 'female' | 'other';
  location: string;
  languages: string[];
  
  // Performance metrics
  totalFollowers: number;
  averageEngagementRate: number;
  niches: string[];
  rating: number; // 0-5 stars
  
  // Business info
  rates: {
    facebook?: number;
    youtube?: number;
    tiktok?: number;
    instagram?: number;
  };
  preferredCampaignTypes?: string[];
  
  // Status
  status: 'available' | 'busy' | 'inactive';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  
  // History
  campaignsCompleted: number;
  successRate: number; // percentage
  createdAt: string;
  lastActive?: string;
  
  // Tags for data-driven selection
  tags: string[];
  notes?: string;
}

export interface InfluencerProfile {
  platform: InfluencerPlatform;
  username: string;
  profileUrl: string;
  followers: number;
  engagementRate: number;
  verified: boolean;
  averageViews?: number;
  contentCategories: string[];
}

export interface InfluencerCampaign {
  id: string;
  name: string;
  description: string;
  brand: string;
  
  // Campaign details
  objective: 'awareness' | 'engagement' | 'conversion' | 'sales';
  platforms: InfluencerPlatform[];
  budget: number;
  currency: string;
  
  // Targeting
  targeting: {
    demographics: {
      ageRange?: { min: number; max: number };
      gender?: 'male' | 'female' | 'all';
      locations: string[];
      languages?: string[];
    };
    audienceSize: { min: number; max: number };
    engagementRate: { min: number; max: number };
    niches: string[];
  };
  
  // Timeline
  startDate: string;
  endDate: string;
  
  // Results estimation
  estimatedReach: number;
  estimatedEngagement: number;
  estimatedCost: number;
  estimatedROI: number;
  
  // Content requirements
  contentRequirements: {
    postTypes: string[];
    numberOfPosts: number;
    hashtags?: string[];
    mentions?: string[];
    contentGuidelines?: string;
  };
  
  // Selected influencers
  selectedInfluencers: CampaignInfluencer[];
  
  // Status
  status: 'draft' | 'planning' | 'outreach' | 'negotiation' | 'active' | 'completed' | 'cancelled';
  
  // Tracking
  actualReach?: number;
  actualEngagement?: number;
  actualROI?: number;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CampaignInfluencer {
  influencerId: string;
  influencerName: string;
  platforms: InfluencerPlatform[];
  
  // Outreach
  outreachStatus: 'pending' | 'sent' | 'viewed' | 'responded' | 'accepted' | 'declined';
  outreachDate?: string;
  responseDate?: string;
  
  // Negotiation
  proposedRate: number;
  negotiatedRate?: number;
  negotiationNotes?: string[];
  
  // Contract
  contractStatus: 'pending' | 'sent' | 'signed' | 'completed';
  contractUrl?: string;
  signedDate?: string;
  
  // Deliverables
  deliverables: Deliverable[];
  
  // Payment
  paymentStatus: 'pending' | 'scheduled' | 'processing' | 'paid' | 'failed';
  paymentAmount: number;
  paymentDate?: string;
  paymentMethod?: string;
  
  // Performance
  performance?: {
    reach: number;
    engagement: number;
    clicks: number;
    conversions: number;
  };
  
  // Communication
  lastContactDate?: string;
  remindersSent: number;
  
  // Feedback
  feedback?: {
    rating: number;
    comment: string;
    date: string;
  };
}

export interface Deliverable {
  id: string;
  platform: InfluencerPlatform;
  type: 'post' | 'story' | 'reel' | 'video' | 'short';
  status: 'pending' | 'submitted' | 'approved' | 'revision_needed' | 'published';
  dueDate: string;
  submittedDate?: string;
  approvedDate?: string;
  publishedDate?: string;
  postUrl?: string;
  content?: {
    caption?: string;
    mediaUrls?: string[];
  };
  performance?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
  };
}

export interface OutreachTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  platform: 'email' | 'dm';
  variables: string[]; // e.g., {influencer_name}, {brand_name}, {rate}
  createdAt: string;
}

export interface CampaignMessage {
  id: string;
  campaignId: string;
  influencerId: string;
  sender: 'brand' | 'influencer';
  message: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

export interface PaymentSchedule {
  id: string;
  campaignId: string;
  influencerId: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  transactionId?: string;
}

export interface CampaignReport {
  campaignId: string;
  generatedAt: string;
  overview: {
    totalInfluencers: number;
    totalBudget: number;
    totalSpent: number;
    totalReach: number;
    totalEngagement: number;
    averageEngagementRate: number;
    totalConversions: number;
    roi: number;
  };
  platformBreakdown: {
    platform: InfluencerPlatform;
    influencers: number;
    reach: number;
    engagement: number;
    cost: number;
  }[];
  topPerformers: {
    influencerId: string;
    influencerName: string;
    reach: number;
    engagement: number;
    roi: number;
  }[];
  timeline: {
    date: string;
    reach: number;
    engagement: number;
    posts: number;
  }[];
}

export interface DataDrivenScore {
  influencerId: string;
  overallScore: number; // 0-100
  factors: {
    audienceMatch: number;
    engagementQuality: number;
    contentRelevance: number;
    priceEfficiency: number;
    reliability: number;
    pastPerformance: number;
  };
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended';
  reasoning: string[];
}
