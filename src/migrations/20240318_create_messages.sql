-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('planning', 'running', 'review')),
  entities JSONB DEFAULT '[]',
  is_ai_response BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes
CREATE INDEX messages_campaign_id_idx ON messages(campaign_id);
CREATE INDEX messages_user_id_idx ON messages(user_id);
CREATE INDEX messages_mode_idx ON messages(mode);

-- Add RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their campaigns"
  ON messages FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id 
      FROM campaign_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their campaigns"
  ON messages FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT campaign_id 
      FROM campaign_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 