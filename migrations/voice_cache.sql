-- Create voice_cache table for TTS caching
CREATE TABLE IF NOT EXISTS voice_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  dialogue_hash TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Create unique constraint on npc_id and dialogue_hash
  CONSTRAINT unique_npc_dialogue UNIQUE (npc_id, dialogue_hash)
);

-- Add indexes for efficient retrieval
CREATE INDEX IF NOT EXISTS voice_cache_npc_id_idx ON voice_cache(npc_id);
CREATE INDEX IF NOT EXISTS voice_cache_dialogue_hash_idx ON voice_cache(dialogue_hash);
CREATE INDEX IF NOT EXISTS voice_cache_expires_at_idx ON voice_cache(expires_at);

-- Add voice_profile column to npcs table (embedded model approach)
ALTER TABLE npcs 
ADD COLUMN IF NOT EXISTS voice_profile JSONB DEFAULT '{
  "voice_id": null,
  "pitch": 1.0,
  "speed": 1.0,
  "tone": "neutral"
}'::JSONB;

-- Add resource control to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS voice_concurrency_limit INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS voice_cache_days INTEGER DEFAULT 30;

-- RLS Policies
ALTER TABLE voice_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to voice cache for campaign members" 
ON voice_cache FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM npcs 
    JOIN campaign_members ON npcs.campaign_id = campaign_members.campaign_id
    WHERE npcs.id = voice_cache.npc_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert, update for campaign owners and DMs" 
ON voice_cache FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM npcs 
    JOIN campaign_members ON npcs.campaign_id = campaign_members.campaign_id
    WHERE npcs.id = voice_cache.npc_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
); 