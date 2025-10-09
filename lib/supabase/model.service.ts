import { createClient } from '@supabase/supabase-js';
import type { ModelStatus } from './types';

// Singleton Supabase client instance
let supabaseInstance: any = null;

export class ModelService {
  private static getClient(accessToken?: string) {
    if (!supabaseInstance) {
      supabaseInstance = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: accessToken ? `Bearer ${accessToken}` : '',
            },
          }
        }
      );
    }
    return supabaseInstance;
  }

  constructor(private accessToken?: string) {}

  private get supabase() {
    return ModelService.getClient(this.accessToken);
  }

  async createDraftModel(userId: string) {
    const { data, error } = await this.supabase
      .from('models')
      .insert({
        user_id: userId,
        model_status: 'draft'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getModel(modelId: string) {
    const { data, error } = await this.supabase
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateModelStatus(modelId: string, status: ModelStatus) {
    const { error } = await this.supabase
      .from('models')
      .update({ model_status: status })
      .eq('id', modelId);
    
    if (error) throw error;
  }

  async updateModel(modelId: string, updateData: any) {
    const { error } = await this.supabase
      .from('models')
      .update(updateData)
      .eq('id', modelId);
    
    if (error) throw error;
  }

  // New methods to fix import errors
  async getModelsByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from('models')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  }

  async getModelsByStatus(status: string) {
    const { data, error } = await this.supabase
      .from('models')
      .select('*')
      .eq('model_status', status);
    
    if (error) throw error;
    return data;
  }

  async createModel(modelData: any) {
    const { data, error } = await this.supabase
      .from('models')
      .insert(modelData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async createJob(jobData: any) {
    const { data, error } = await this.supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTestModels(): Promise<void> {
    const { error } = await this.supabase
      .from('models')
      .delete()
      .eq('user_id', 'test-user');
      
    if (error) throw new Error(`Failed to delete test models: ${error.message}`);
  }
}
