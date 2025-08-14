import { supabase } from '@/lib/supabase';
import type { ModelStatus } from './types';

export class ModelService {
  async createDraftModel(userId: string) {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateModelStatus(modelId: string, status: ModelStatus) {
    const { error } = await supabase
      .from('models')
      .update({ model_status: status })
      .eq('id', modelId);
    
    if (error) throw error;
  }

  async updateModel(modelId: string, updateData: any) {
    const { error } = await supabase
      .from('models')
      .update(updateData)
      .eq('id', modelId);
    
    if (error) throw error;
  }

  // New methods to fix import errors
  async getModelsByUserId(userId: string) {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  }

  async getModelsByStatus(status: string) {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('model_status', status);
    
    if (error) throw error;
    return data;
  }

  async createModel(modelData: any) {
    const { data, error } = await supabase
      .from('models')
      .insert(modelData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
