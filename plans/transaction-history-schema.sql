-- Create ENUM types for transaction type and status
CREATE TYPE transaction_type AS ENUM ('purchase', 'usage');
CREATE TYPE transaction_status AS ENUM ('completed', 'pending', 'failed');

-- Create user_transactions table
CREATE TABLE user_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    credits INTEGER NOT NULL,
    description TEXT,
    status transaction_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster user-specific queries
CREATE INDEX idx_user_transactions_user_id ON user_transactions(user_id);
