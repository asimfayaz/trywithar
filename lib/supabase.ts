import { createClient } from '@supabase/supabase-js';

// Database schema types
// AuthUser combines auth.users data with user_billing
export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  // From user_billing
  free_models_used: number;
  credits: number;
  billing_created_at: string;
  billing_updated_at: string;
};

// User billing and usage data
export type UserBilling = {
  id: string;
  free_models_used: number;
  credits: number;
  created_at: string;
  updated_at: string;
};

// Legacy type alias for backwards compatibility
export type UserProfile = UserBilling;

// Legacy type alias for backwards compatibility
export type User = AuthUser;

export type Job = {
  id: string;
  external_job_id: string; // job_id from Hunyuan3D API
  user_id: string;
  photo_id: string;
  api_status: 'queued' | 'processing' | 'completed' | 'failed';
  api_stage?: string | null;
  progress: number;
  started_at?: string | null;
  completed_at?: string | null;
  model_url?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: string;
  user_id: string;
  front_image_url: string; // Original front image
  left_image_url?: string | null; // Original left image
  right_image_url?: string | null; // Original right image
  back_image_url?: string | null; // Original back image
  front_nobgr_image_url?: string | null; // Front image after background removal
  left_nobgr_image_url?: string | null; // Left image after background removal
  right_nobgr_image_url?: string | null; // Right image after background removal
  back_nobgr_image_url?: string | null; // Back image after background removal
  model_url?: string | null;
  generation_status: 'pending' | 'processing' | 'completed' | 'failed'; // Actual database enum values
  job_id?: string | null;
  created_at: string;
  updated_at: string;
};

// This is a placeholder for the actual environment variables
// You'll need to create a .env.local file with these values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User service
export const userService = {
  // Helper method to get user data using authenticated user object (for sign-in/sign-up)
  async getUserDataFromAuthUser(authUser: any): Promise<AuthUser> {
    // Get user billing data
    const { data: billingData, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (billingError) throw billingError;

    return {
      id: authUser.id,
      email: authUser.email!,
      name: authUser.user_metadata?.name || null,
      avatar_url: authUser.user_metadata?.avatar_url || null,
      created_at: authUser.created_at,
      free_models_used: billingData.free_models_used,
      credits: billingData.credits,
      billing_created_at: billingData.created_at,
      billing_updated_at: billingData.updated_at
    };
  },
  // Get user by ID (combines auth.users + user_billing)
  async getUserById(id: string): Promise<AuthUser> {
    // Get current session to access user data
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error('No authenticated user');
    
    // For security, only allow getting data for the current authenticated user
    if (session.user.id !== id) {
      throw new Error('Unauthorized: Can only access own user data');
    }

    // Get user billing data
    const { data: billingData, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('id', id)
      .single();
    
    if (billingError) throw billingError;

    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.user_metadata?.name || null,
      avatar_url: session.user.user_metadata?.avatar_url || null,
      created_at: session.user.created_at,
      free_models_used: billingData.free_models_used,
      credits: billingData.credits,
      billing_created_at: billingData.created_at,
      billing_updated_at: billingData.updated_at
    };
  },

  // Get user by email (combines auth.users + user_billing)
  async getUserByEmail(email: string): Promise<AuthUser> {
    // Get current session to access user data
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error('No authenticated user');
    
    // For security, only allow getting data for the current authenticated user
    if (session.user.email !== email) {
      throw new Error('Unauthorized: Can only access own user data');
    }

    // Get user billing data
    const { data: billingData, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (billingError) throw billingError;

    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.user_metadata?.name || null,
      avatar_url: session.user.user_metadata?.avatar_url || null,
      created_at: session.user.created_at,
      free_models_used: billingData.free_models_used,
      credits: billingData.credits,
      billing_created_at: billingData.created_at,
      billing_updated_at: billingData.updated_at
    };
  },

  // Create user billing record (auth user should already exist)
  async createUserBilling(userId: string, billingData?: Partial<UserBilling>): Promise<UserBilling> {
    const { data, error } = await supabase
      .from('user_billing')
      .insert({
        id: userId,
        free_models_used: billingData?.free_models_used || 0,
        credits: billingData?.credits || 0.0
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as UserBilling;
  },

  // Legacy method for backwards compatibility
  async createUserProfile(userId: string, profileData?: Partial<UserProfile>): Promise<UserProfile> {
    return this.createUserBilling(userId, profileData);
  },

  // Update user billing record
  async updateUserBilling(id: string, updates: Partial<Omit<UserBilling, 'id' | 'created_at' | 'updated_at'>>): Promise<UserBilling> {
    const { data, error } = await supabase
      .from('user_billing')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as UserBilling;
  },

  // Legacy method for backwards compatibility
  async updateUserProfile(id: string, updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<UserProfile> {
    return this.updateUserBilling(id, updates);
  },

  // Legacy method for backwards compatibility
  async createUser(userData: Omit<AuthUser, 'id' | 'created_at' | 'updated_at' | 'profile_created_at' | 'profile_updated_at'>): Promise<AuthUser> {
    // This shouldn't be used anymore since auth users are created via Supabase Auth
    // But keeping for backwards compatibility
    throw new Error('Use Supabase Auth signup instead of createUser');
  },

  // Legacy method for backwards compatibility
  async updateUser(id: string, updates: Partial<Omit<AuthUser, 'id' | 'created_at' | 'updated_at'>>): Promise<AuthUser> {
    // Update billing data only (auth data is managed by Supabase Auth)
    const billingUpdates: Partial<UserBilling> = {};
    if (updates.free_models_used !== undefined) billingUpdates.free_models_used = updates.free_models_used;
    if (updates.credits !== undefined) billingUpdates.credits = updates.credits;

    if (Object.keys(billingUpdates).length > 0) {
      await this.updateUserBilling(id, billingUpdates);
    }

    return this.getUserById(id);
  }
};

// Job service
export const jobService = {
  // Create a new job
  async createJob(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();
    
    if (error) throw error;
    return data as Job;
  },

  // Get job by external job ID
  async getJobByExternalId(externalJobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('external_job_id', externalJobId)
      .single();
    
    if (error) throw error;
    return data as Job;
  },

  // Get job by photo ID
  async getJobByPhotoId(photoId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('photo_id', photoId)
      .single();
    
    if (error) throw error;
    return data as Job;
  },

  // Update job status and progress
  async updateJobStatus(
    id: string, 
    updates: {
      api_status?: Job['api_status'];
      api_stage?: string;
      progress?: number;
      started_at?: string;
      completed_at?: string;
      model_url?: string;
      error_message?: string;
    }
  ) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Job;
  },

  // Get jobs by status
  async getJobsByStatus(status: Job['api_status']) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('api_status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Job[];
  }
};

// Photo service
export const photoService = {
  // Create a new photo entry
  async createPhoto(photoData: Omit<Photo, 'id' | 'created_at' | 'updated_at'> & {
    processing_stage?: string;
    expires_at?: string;
  }) {
    console.log('🔍 Creating photo with data:', JSON.stringify(photoData, null, 2));
    
    console.log('📡 About to make Supabase insert call...');
    const { data, error } = await supabase
      .from('photos')
      .insert(photoData)
      .select()
      .single();
    
    console.log('📡 Supabase insert call completed:', { hasData: !!data, hasError: !!error });
    
    if (error) {
      console.error('❌ Photo creation failed:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        photoData: JSON.stringify(photoData, null, 2)
      });
      throw error;
    }
    
    console.log('✅ Photo created successfully:', data);
    return data as Photo;
  },

  // Get a photo by ID
  async getPhotoById(id: string) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Photo;
  },

  // Get photos by user ID
  async getPhotosByUserId(userId: string) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Photo[];
  },

  // Get photos by generation status
  async getPhotosByStatus(status: Photo['generation_status']) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('generation_status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Photo[];
  },

  // Get photos by processing stage
  async getPhotosByStage(stages: string[]) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .in('processing_stage', stages)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Photo[];
  },

  // Get photos by job ID
  async getPhotosByJobId(jobId: string) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('job_id', jobId);
    
    if (error) throw error;
    return data as Photo[];
  },

  // Update a photo
  async updatePhoto(id: string, updates: Partial<Omit<Photo, 'id' | 'created_at' | 'updated_at'>> & {
    processing_stage?: string;
    expires_at?: string;
  }) {
    console.log('📝 Updating photo with ID:', id, 'Updates:', updates);
    
    // First check if the photo exists
    const { data: existingPhoto, error: checkError } = await supabase
      .from('photos')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      console.error('❌ Photo not found for update:', checkError);
      throw new Error(`Photo with ID ${id} not found: ${checkError.message}`);
    }
    
    console.log('✅ Photo exists, proceeding with update:', existingPhoto);
    
    const { data, error } = await supabase
      .from('photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Photo update failed:', error);
      throw new Error(`Failed to update photo: ${error.message}`);
    }
    
    console.log('✅ Photo updated successfully:', data);
    return data as Photo;
  },

  // Update generation status
  async updateGenerationStatus(id: string, status: Photo['generation_status'], jobId?: string) {
    const updates: Partial<Photo> = { generation_status: status };
    if (jobId) updates.job_id = jobId;
    
    return this.updatePhoto(id, updates);
  },

  // Update photo status (simplified for UI)
  async updatePhotoStatus(
    id: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    modelUrl?: string
  ): Promise<Photo> {
    const updates: Partial<Photo> = {
      generation_status: status
    };

    if (modelUrl) {
      updates.model_url = modelUrl;
    }

    return this.updatePhoto(id, updates);
  },

  // Delete a photo
  async deletePhoto(id: string) {
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
