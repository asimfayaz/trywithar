import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { TransactionType } from '@/types/models'

// Define the structure of the query parameters
interface QueryParams {
  page?: string;
  limit?: string;
}

// Define transaction creation interface
interface TransactionData {
  type: TransactionType;
  amount: number;
  credits: number;
  description?: string;
  status?: 'completed' | 'pending' | 'failed';
}

export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    
    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Fetch transactions for current user with pagination
    const { data: transactions, error, count } = await supabase
      .from('user_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        totalItems: count
      }
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    
    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse request body
    const transactionData: TransactionData = await request.json()
    
    // Validate required fields
    if (!transactionData.type || transactionData.amount === undefined || transactionData.credits === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (type, amount, credits)' },
        { status: 400 }
      )
    }

    // Create transaction record
    const { data: transaction, error } = await supabase
      .from('user_transactions')
      .insert([{
        user_id: user.id,
        type: transactionData.type,
        amount: transactionData.amount,
        credits: transactionData.credits,
        description: transactionData.description || '',
        status: transactionData.status || 'completed'
      }])
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json(transaction[0], { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
