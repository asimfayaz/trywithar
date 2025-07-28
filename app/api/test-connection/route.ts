import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test the connection by selecting a single row
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Database connection failed', 
          error: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'Successfully connected to Supabase',
      data: data || 'No photos found (table is empty)'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
