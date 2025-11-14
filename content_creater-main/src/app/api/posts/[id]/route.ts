import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadBase64Image } from '@/lib/supabase/storage';

// Helper to check if string is base64 data URL
function isBase64DataUrl(str: string | undefined): boolean {
  if (!str) return false;
  return str.startsWith('data:') && str.includes(';base64,');
}

// PUT - Update existing post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Upload base64 images to storage if needed
    let imageUrl = generatedImage;
    let videoUrl = generatedVideoUrl;

    if (isBase64DataUrl(generatedImage)) {
      try {
        imageUrl = await uploadBase64Image(generatedImage, `post-${id}-image`);
        console.log('Uploaded image to storage:', imageUrl);
      } catch (error) {
        console.error('Failed to upload image:', error);
        // Keep base64 as fallback (but this might still cause 413)
      }
    }

    if (isBase64DataUrl(generatedVideoUrl)) {
      try {
        videoUrl = await uploadBase64Image(generatedVideoUrl, `post-${id}-video`);
        console.log('Uploaded video to storage:', videoUrl);
      } catch (error) {
        console.error('Failed to upload video:', error);
      }
    }

    const dbPost = {
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
      .update(dbPost)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await (supabase as any).from('activity_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'update',
      resource_type: 'post',
      resource_id: id,
      details: {},
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    // Log activity
    await (supabase as any).from('activity_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'delete',
      resource_type: 'post',
      resource_id: id,
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}