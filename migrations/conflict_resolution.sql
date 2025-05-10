-- Create conflict resolution queue
CREATE TABLE IF NOT EXISTS conflict_resolution_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  field TEXT NOT NULL,
  proposed_values JSONB NOT NULL, -- Array of different proposed values
  source_agents TEXT[] NOT NULL, -- Array of agent names that proposed changes
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto_resolvable BOOLEAN DEFAULT FALSE,
  requires_dm BOOLEAN DEFAULT TRUE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID, -- User who resolved the conflict
  resolution_strategy TEXT CHECK (resolution_strategy IN ('auto', 'dm_manual', 'rule_applied', NULL)),
  resolution_notes TEXT,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create agent activity logs
CREATE TABLE IF NOT EXISTS agent_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  field_modified TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  mode TEXT NOT NULL CHECK (mode IN ('Planning', 'Running', 'Review')),
  reviewed_by_dm BOOLEAN DEFAULT FALSE,
  dm_approved BOOLEAN,
  dm_reviewed_at TIMESTAMPTZ,
  can_rollback BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create table for versioning to support rollback
CREATE TABLE IF NOT EXISTS entity_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL, -- Complete entity snapshot
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL, -- Agent or user ID
  change_summary TEXT,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  CONSTRAINT unique_entity_version UNIQUE (entity_id, entity_type, version_number)
);

-- Create cross-campaign sharing definitions
CREATE TABLE IF NOT EXISTS shared_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  source_campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT FALSE, -- Available to all campaigns if true
  shared_with_campaigns UUID[], -- Specific campaigns this is shared with
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sharing_settings JSONB DEFAULT '{
    "allow_modifications": false,
    "sync_changes": true,
    "attribute_source": true
  }'::JSONB, -- Controls how shared entities behave
  
  CONSTRAINT unique_shared_entity UNIQUE (entity_id, entity_type, source_campaign_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS conflict_resolution_queue_campaign_id_idx ON conflict_resolution_queue(campaign_id);
CREATE INDEX IF NOT EXISTS conflict_resolution_queue_entity_id_idx ON conflict_resolution_queue(entity_id);
CREATE INDEX IF NOT EXISTS conflict_resolution_queue_priority_idx ON conflict_resolution_queue(priority);
CREATE INDEX IF NOT EXISTS conflict_resolution_queue_resolved_idx ON conflict_resolution_queue(resolved);

CREATE INDEX IF NOT EXISTS agent_activity_logs_campaign_id_idx ON agent_activity_logs(campaign_id);
CREATE INDEX IF NOT EXISTS agent_activity_logs_entity_id_idx ON agent_activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS agent_activity_logs_agent_name_idx ON agent_activity_logs(agent_name);
CREATE INDEX IF NOT EXISTS agent_activity_logs_reviewed_idx ON agent_activity_logs(reviewed_by_dm);

CREATE INDEX IF NOT EXISTS entity_versions_campaign_id_idx ON entity_versions(campaign_id);
CREATE INDEX IF NOT EXISTS entity_versions_entity_id_idx ON entity_versions(entity_id);
CREATE INDEX IF NOT EXISTS entity_versions_entity_type_idx ON entity_versions(entity_type);

CREATE INDEX IF NOT EXISTS shared_entities_source_campaign_id_idx ON shared_entities(source_campaign_id);
CREATE INDEX IF NOT EXISTS shared_entities_is_global_idx ON shared_entities(is_global);
CREATE INDEX IF NOT EXISTS shared_entities_entity_type_idx ON shared_entities(entity_type);

-- RLS Policies
ALTER TABLE conflict_resolution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_entities ENABLE ROW LEVEL SECURITY;

-- Conflict resolution queue policies
CREATE POLICY "Allow read access to conflict resolution queue for campaign members" 
ON conflict_resolution_queue FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = conflict_resolution_queue.campaign_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert for all authenticated users" 
ON conflict_resolution_queue FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update for campaign owners and DMs" 
ON conflict_resolution_queue FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = conflict_resolution_queue.campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
);

-- Agent activity logs policies
CREATE POLICY "Allow read access to agent activity logs for campaign members" 
ON agent_activity_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = agent_activity_logs.campaign_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert for all authenticated users" 
ON agent_activity_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update for campaign owners and DMs" 
ON agent_activity_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = agent_activity_logs.campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
);

-- Entity versions policies
CREATE POLICY "Allow read access to entity versions for campaign members" 
ON entity_versions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = entity_versions.campaign_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert for all authenticated users" 
ON entity_versions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Shared entities policies
CREATE POLICY "Allow read access to shared entities for campaign members" 
ON shared_entities FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = shared_entities.source_campaign_id
    AND campaign_members.user_id = auth.uid()
  ) OR
  (
    shared_entities.is_global = TRUE
  ) OR
  (
    auth.uid() IN (
      SELECT user_id FROM campaign_members 
      WHERE campaign_id = ANY(shared_entities.shared_with_campaigns)
    )
  )
);

CREATE POLICY "Allow insert, update for campaign owners and DMs" 
ON shared_entities FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = shared_entities.source_campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
); 