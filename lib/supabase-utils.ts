import { createClient } from '@supabase/supabase-js';
import type { TransactionType } from '@/types/models';

// Client-side configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for client-side
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});

// Function to create a transaction
export const createTransaction = async (
  userId: string,
  transactionData: {
    type: TransactionType;
    amount: number;
    credits: number;
    description?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('user_transactions')
      .insert([{ 
        ...transactionData,
        user_id: userId
      }]);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    return null;
  }
};

// Function to update user credits
export const updateUserCredits = async (userId: string, credits: number) => {
  try {
    const { data, error } = await supabase
      .from('user_billing')
      .update({ credits })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating user credits:', error);
    return null;
  }
};
