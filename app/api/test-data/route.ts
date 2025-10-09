import { NextRequest, NextResponse } from 'next/server'
import { ModelService } from '@/lib/supabase/model.service'
import type { ModelData } from '@/app/page'

const modelService = new ModelService();

export async function POST(request: NextRequest) {
  try {
    const { action, models } = await request.json()

    if (action === 'setup') {
      // Create test models
      await Promise.all(models.map(async (model: ModelData) => {
        await modelService.createModel({
          id: model.id,
          user_id: 'test-user',
          model_status: model.status,
          model_url: model.modelUrl,
          front_image_url: model.thumbnail,
          created_at: model.uploadedAt,
          updated_at: model.updatedAt
        })
      }))
      return NextResponse.json({ success: true })
    } 
    else if (action === 'cleanup') {
      // Clean up test models
      await modelService.deleteTestModels()
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Test data error:', error)
    return NextResponse.json(
      { error: 'Failed to manage test data' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { modelId, ...updateData } = await request.json()
    await modelService.updateModel(modelId, updateData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Test data update error:', error)
    return NextResponse.json(
      { error: 'Failed to update test model' },
      { status: 500 }
    )
  }
}
