import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadBase64Image } from '@/lib/supabase/storage';

// Helper to check if string is base64 data URL
function isBase64DataUrl(str: string | undefined): boolean {
  if (!str) return false;
  return str.startsWith('data:') && str.includes(';base64,');
}

// GET - Fetch library posts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    // Get total count
    const { count } = await supabase
      .from('post_library')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    // Get paginated results
    const { data, error } = await supabase
      .from('post_library')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      items: data || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('Error fetching library posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library posts' },
      { status: 500 }
    );
  }
}

// POST - Archive a published post to library
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { post, platformResults, workspaceId } = body;

    if (!post || !platformResults || !workspaceId) {
      return NextResponse.json(
        { error: 'post, platformResults, and workspaceId required' },
        { status: 400 }
      );
    }

    // Transform platform results into platform_data object
    const platform_data: Record<string, any> = {};
    platformResults.forEach((result: any) => {
      platform_data[result.platform] = {
        post_id: result.postId,
        url: result.url,
        status: result.success ? 'published' : 'failed',
        error: result.error || null,
        published_at: new Date().toISOString(),
      };
    });

    // Upload base64 media to storage if needed (fallback for any remaining base64 data)
    let imageUrl = post.generatedImage;
    let videoUrl = post.generatedVideoUrl;

    if (isBase64DataUrl(post.generatedImage)) {
      try {
        imageUrl = await uploadBase64Image(post.generatedImage, `library-${post.id}-image`);
        console.log('Uploaded library image to storage:', imageUrl);
      } catch (error) {
        console.error('Failed to upload library image:', error);
      }
    }

    if (isBase64DataUrl(post.generatedVideoUrl)) {
      try {
        videoUrl = await uploadBase64Image(post.generatedVideoUrl, `library-${post.id}-video`);
        console.log('Uploaded library video to storage:', videoUrl);
      } catch (error) {
        console.error('Failed to upload library video:', error);
      }
    }

    const libraryItem = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      original_post_id: post.id,
      title: post.topic,
      topic: post.topic,
      post_type: post.postType || 'post',
      platforms: post.platforms || [],
      content: {
        ...post.content || {},
        // Include generated media (as storage URLs)
        generatedImage: imageUrl,
        generatedVideoUrl: videoUrl,
        // Include platform templates if they exist
        platformTemplates: post.platformTemplates,
      },
      published_at: new Date().toISOString(),
      platform_data,
      created_by: user.id,
    };

    const { data, error } = await (supabase as any)
      .from('post_library')
      .insert([libraryItem])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error archiving post to library:', error);
    return NextResponse.json(
      { error: 'Failed to archive post' },
      { status: 500 }
    );
  }
}
