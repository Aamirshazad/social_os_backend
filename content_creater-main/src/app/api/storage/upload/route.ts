import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadBase64Image } from '@/lib/supabase/storage';

/**
 * POST - Upload a base64 image to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { base64Data, fileName, type = 'image' } = body;

    if (!base64Data || !fileName) {
      return NextResponse.json(
        { error: 'base64Data and fileName required' },
        { status: 400 }
      );
    }

    // Upload to storage
    const publicUrl = await uploadBase64Image(base64Data, fileName);

    return NextResponse.json({
      url: publicUrl,
      message: 'File uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
