-- Create session_logs table for complete session transcription
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  speaker_id UUID, -- Can be null for system messages
  speaker_type TEXT NOT NULL CHECK (speaker_type IN ('player', 'npc', 'dm', 'system')),
  content TEXT NOT NULL,
  clean_content TEXT, -- Processed/cleaned version of the content
  dialogue_type TEXT, -- 'action', 'reaction', 'declaration', etc.
  confidence_score FLOAT, -- For tracking speech recognition confidence
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata/contextual fields
  context JSONB DEFAULT '{}'::JSONB, -- Additional context info
  entities_referenced TEXT[] -- Entity IDs referenced in this log entry
);

-- Create highlighted_actions table for key campaign moments
CREATE TABLE IF NOT EXISTS highlighted_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  log_id UUID REFERENCES session_logs(id), -- Can be null for synthetic/generated highlights
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  importance TEXT NOT NULL CHECK (importance IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL, -- 'combat', 'roleplay', 'discovery', 'decision', etc.
  entities_involved TEXT[] NOT NULL, -- Entity IDs involved in this action
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  narrative_consequences JSONB -- Potential story impacts
);

-- Create archived_sessions table for memory pruning
CREATE TABLE IF NOT EXISTS archived_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  archive_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary TEXT NOT NULL,
  key_events JSONB NOT NULL, -- Compressed representation of critical events
  entities_referenced TEXT[] NOT NULL, -- For efficient search/recall
  metadata JSONB DEFAULT '{}'::JSONB -- For search/indexing needs
);

-- Indexes for efficient retrieval
CREATE INDEX IF NOT EXISTS session_logs_session_id_idx ON session_logs(session_id);
CREATE INDEX IF NOT EXISTS session_logs_campaign_id_idx ON session_logs(campaign_id);
CREATE INDEX IF NOT EXISTS session_logs_speaker_id_idx ON session_logs(speaker_id);
CREATE INDEX IF NOT EXISTS session_logs_timestamp_idx ON session_logs(timestamp);

CREATE INDEX IF NOT EXISTS highlighted_actions_session_id_idx ON highlighted_actions(session_id);
CREATE INDEX IF NOT EXISTS highlighted_actions_campaign_id_idx ON highlighted_actions(campaign_id);
CREATE INDEX IF NOT EXISTS highlighted_actions_importance_idx ON highlighted_actions(importance);
CREATE INDEX IF NOT EXISTS highlighted_actions_category_idx ON highlighted_actions(category);

CREATE INDEX IF NOT EXISTS archived_sessions_campaign_id_idx ON archived_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS archived_sessions_session_id_idx ON archived_sessions(session_id);

-- RLS Policies
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlighted_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_sessions ENABLE ROW LEVEL SECURITY;

-- Session logs policies
CREATE POLICY "Allow read access to session logs for campaign members" 
ON session_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = session_logs.campaign_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert, update for campaign owners and DMs" 
ON session_logs FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = session_logs.campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
);

-- Highlighted actions policies
CREATE POLICY "Allow read access to highlighted actions for campaign members" 
ON highlighted_actions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = highlighted_actions.campaign_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert, update for campaign owners and DMs" 
ON highlighted_actions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = highlighted_actions.campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
);

-- Archived sessions policies
CREATE POLICY "Allow read access to archived sessions for campaign members" 
ON archived_sessions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = archived_sessions.campaign_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert, update for campaign owners and DMs" 
ON archived_sessions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = archived_sessions.campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
); 