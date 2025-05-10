-- Create conflict_resolutions table
CREATE TABLE conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    field TEXT NOT NULL,
    proposed_values JSONB NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    auto_resolvable BOOLEAN DEFAULT FALSE,
    resolution_strategy TEXT CHECK (resolution_strategy IN ('auto', 'dm_manual', 'rule_applied')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    final_value JSONB,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster conflict lookup
CREATE INDEX idx_conflict_resolutions_campaign ON conflict_resolutions (campaign_id);
CREATE INDEX idx_conflict_resolutions_entity ON conflict_resolutions (entity_id);
CREATE INDEX idx_conflict_resolutions_unresolved ON conflict_resolutions (campaign_id) WHERE resolved_at IS NULL;

-- Add RLS policies
ALTER TABLE conflict_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conflicts in their campaigns"
ON conflict_resolutions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = conflict_resolutions.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can create conflicts in their campaigns"
ON conflict_resolutions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = conflict_resolutions.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can update conflicts in their campaigns"
ON conflict_resolutions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = conflict_resolutions.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
); 