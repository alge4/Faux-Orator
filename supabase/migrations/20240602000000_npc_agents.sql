-- Migration for NPC Agents system
-- Adds tables for NPC interactions and voice profiles

-- Table for NPC interactions (conversation history)
CREATE TABLE IF NOT EXISTS npc_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE NOT NULL,
  speaker_type TEXT CHECK (speaker_type IN ('player', 'npc', 'system')) NOT NULL,
  content TEXT NOT NULL,
  session_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  player_id UUID REFERENCES users(id),
  emotion TEXT,
  context_note TEXT
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS npc_interactions_npc_id_idx ON npc_interactions(npc_id);
CREATE INDEX IF NOT EXISTS npc_interactions_session_id_idx ON npc_interactions(session_id);
CREATE INDEX IF NOT EXISTS npc_interactions_created_at_idx ON npc_interactions(created_at);

-- Table for voice profiles
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL, -- e.g., 'browser', 'elevenlabs', 'azure', etc.
  voice_id TEXT NOT NULL,  -- Provider-specific voice identifier
  settings JSONB DEFAULT '{}'::jsonb,  -- Voice settings like pitch, speed, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a unique constraint to ensure one voice profile per NPC (can be removed if we allow multiple)
CREATE UNIQUE INDEX IF NOT EXISTS voice_profiles_npc_id_uniq_idx ON voice_profiles(npc_id);

-- Create a trigger to set updated_at on voice_profiles
CREATE TRIGGER set_updated_at_voice_profiles
BEFORE UPDATE ON voice_profiles
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Add new fields to the NPCs table to support the agent system
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS voice_profile_id UUID REFERENCES voice_profiles(id);
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS memory_context JSONB DEFAULT '{}'::jsonb;
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS voice_characteristics TEXT;
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS typical_phrases TEXT[];
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS speech_patterns TEXT;

-- Add Row Level Security (RLS) policies
ALTER TABLE npc_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for npc_interactions
CREATE POLICY "Users can view npc interactions in their campaigns"
ON npc_interactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM npcs
    JOIN campaigns ON npcs.campaign_id = campaigns.id
    WHERE npcs.id = npc_interactions.npc_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert npc interactions in their campaigns"
ON npc_interactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM npcs
    JOIN campaigns ON npcs.campaign_id = campaigns.id
    WHERE npcs.id = npc_interactions.npc_id
    AND campaigns.owner_id = auth.uid()
  )
);

-- RLS policies for voice_profiles
CREATE POLICY "Users can view voice profiles in their campaigns"
ON voice_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM npcs
    JOIN campaigns ON npcs.campaign_id = campaigns.id
    WHERE npcs.id = voice_profiles.npc_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert voice profiles in their campaigns"
ON voice_profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM npcs
    JOIN campaigns ON npcs.campaign_id = campaigns.id
    WHERE npcs.id = voice_profiles.npc_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update voice profiles in their campaigns"
ON voice_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM npcs
    JOIN campaigns ON npcs.campaign_id = campaigns.id
    WHERE npcs.id = voice_profiles.npc_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete voice profiles in their campaigns"
ON voice_profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM npcs
    JOIN campaigns ON npcs.campaign_id = campaigns.id
    WHERE npcs.id = voice_profiles.npc_id
    AND campaigns.owner_id = auth.uid()
  )
);

COMMENT ON TABLE npc_interactions IS 'Stores conversation history for NPCs';
COMMENT ON TABLE voice_profiles IS 'Stores voice configuration for NPC text-to-speech'; 