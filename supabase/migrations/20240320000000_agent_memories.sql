-- Create agent_memories table
CREATE TABLE agent_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    memory_type TEXT CHECK (memory_type IN ('short_term', 'long_term', 'shared')),
    context JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE,
    archived BOOLEAN DEFAULT FALSE
);

-- Create index for faster memory retrieval
CREATE INDEX idx_agent_memories_lookup ON agent_memories (agent_id, memory_type, archived);
CREATE INDEX idx_agent_memories_campaign ON agent_memories (campaign_id);

-- Add RLS policies
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memories in their campaigns"
ON agent_memories FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = agent_memories.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can create memories in their campaigns"
ON agent_memories FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = agent_memories.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can update memories in their campaigns"
ON agent_memories FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = agent_memories.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
); 