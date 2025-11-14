/**
 * Campaign Content Generation API
 * Integrated AI content generation for campaigns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { aiService } from '@/app/api/ai/shared/aiService'
import { Platform, ContentType, Tone } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { campaignId, message, history, workspaceId } = body

    if (!message || !campaignId) {
      return NextResponse.json(
        { error: 'Message and campaign ID are required' },
        { status: 400 }
      )
    }

    // Get campaign details for context
    const supabase = await createServerClient()
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Type assertion for campaign data
    const campaignData = campaign as any

    // Enhanced prompt with campaign context
    const campaignContext = `
Campaign Context:
- Name: ${campaignData.name || 'Unknown'}
- Type: ${campaignData.campaign_type || 'general'}
- Goals: ${campaignData.goals ? campaignData.goals.join(', ') : 'not specified'}
- Content Themes: ${campaignData.content_themes ? campaignData.content_themes.join(', ') : 'not specified'}

Remember to align all content with these campaign details.
${message}
`

    // Call AI Service
    const result = await aiService.contentStrategistChat(
      campaignContext,
      history || []
    )

    // If ready to generate, create the content
    if (result.readyToGenerate && result.parameters) {
      const { topic, platforms, contentType, tone } = result.parameters
      
      const generatedContent = await aiService.generateSocialMediaContent(
        topic,
        platforms as Platform[],
        contentType as ContentType,
        tone as Tone
      )

      return NextResponse.json({
        success: true,
        data: {
          response: result.response,
          readyToGenerate: true,
          parameters: result.parameters,
          generatedContent
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Campaign content generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate campaign content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
