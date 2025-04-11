-- Create voice_profiles table to store NPC voice settings
-- This table associates NPCs with specific voice IDs from services like ElevenLabs

-- Drop the table if it exists (for re-running migrations)
DROP TABLE IF EXISTS voice_profiles;

-- Create the voice_profiles table
CREATE TABLE voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'elevenlabs', -- 'elevenlabs' or 'browser'
  voice_id TEXT NOT NULL,
  settings JSONB, -- Additional voice settings (pitch, speed, style, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create an index on npc_id for faster lookups
CREATE INDEX voice_profiles_npc_id_idx ON voice_profiles(npc_id);

-- Add trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_voice_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voice_profiles_updated_at
BEFORE UPDATE ON voice_profiles
FOR EACH ROW
EXECUTE FUNCTION update_voice_profiles_updated_at(); 