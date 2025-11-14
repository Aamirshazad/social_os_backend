import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadBase64Image } from '@/lib/supabase/storage';
import { Post } from '@/types';

// Helper to check if string is base64 data URL
function isBase64DataUrl(str: string | undefined): boolean {
  if (!str) return false;
  return str.startsWith('data:') && str.includes(';base64,');
}

// GET - Fetch all posts for workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace_id from query params or user metadata
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    // Fetch posts
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform database format to app format
    const posts = data.map((dbPost: any) => ({
      id: dbPost.id,
      topic: dbPost.topic,
      platforms: dbPost.platforms,
      content: dbPost.content,
      postType: dbPost.post_type || 'post',
      status: dbPost.status,
      createdAt: dbPost.created_at,
      scheduledAt: dbPost.scheduled_at,
      publishedAt: dbPost.published_at,
      campaignId: dbPost.campaign_id,
      engagementScore: dbPost.engagement_score,
      engagementSuggestions: dbPost.engagement_suggestions,
      generatedImage: dbPost.content?.generatedImage,
      generatedVideoUrl: dbPost.content?.generatedVideoUrl,
      platformTemplates: dbPost.content?.platformTemplates,
      isGeneratingImage: dbPost.content?.isGeneratingImage || false,
      isGeneratingVideo: dbPost.content?.isGeneratingVideo || false,
      videoGenerationStatus: dbPost.content?.videoGenerationStatus || '',
      videoOperation: dbPost.content?.videoOperation,
    }));

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { post, workspaceId } = body;

    if (!post || !workspaceId) {
      return NextResponse.json(
        { error: 'post and workspaceId required' },
        { status: 400 }
      );
    }

    // Extract fields that go into content JSONB
    const {
      generatedImage,
      generatedVideoUrl,
      isGeneratingImage,
      isGeneratingVideo,
      videoGenerationStatus,
      videoOperation,
      platformTemplates,
      content,
      ...rest
    } = post;

    // Upload base64 images to storage if needed
    let imageUrl = generatedImage;
    let videoUrl = generatedVideoUrl;

    if (isBase64DataUrl(generatedImage)) {
      try {
        imageUrl = await uploadBase64Image(generatedImage, `post-${post.id}-image`);
        console.log('Uploaded image to storage:', imageUrl);
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    }

    if (isBase64DataUrl(generatedVideoUrl)) {
      try {
        videoUrl = await uploadBase64Image(generatedVideoUrl, `post-${post.id}-video`);
        console.log('Uploaded video to storage:', videoUrl);
      } catch (error) {
        console.error('Failed to upload video:', error);
      }
    }

    const dbPost = {
      id: post.id,
      workspace_id: workspaceId,
      created_by: user.id,
      topic: post.topic,
      platforms: post.platforms,
      post_type: post.postType || 'post',
      content: {
        ...content,
        generatedImage: imageUrl,
        generatedVideoUrl: videoUrl,
        isGeneratingImage,
        isGeneratingVideo,
        videoGenerationStatus,
        videoOperation,
        platformTemplates,
      },
      status: post.status,
      scheduled_at: post.scheduledAt || null,
      published_at: post.publishedAt || null,
      campaign_id: post.campaignId || null,
      engagement_score: post.engagementScore || null,
      engagement_suggestions: post.engagementSuggestions || null,
    };

    const { data, error } = await (supabase as any)
      .from('posts')
      .insert(dbPost)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await (supabase as any).from('activity_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'create',
      resource_type: 'post',
      resource_id: data.id,
      details: {},
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}