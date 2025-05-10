-- Create blackboard_tasks table
CREATE TABLE blackboard_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('plot_point', 'event', 'location', 'note')),
    status TEXT CHECK (status IN ('incomplete', 'in_progress', 'resolved', 'blocked')),
    agents TEXT[] DEFAULT '{}',
    priority TEXT CHECK (priority IN ('low', 'normal', 'high')),
    title TEXT NOT NULL,
    description TEXT,
    context_refs TEXT[] DEFAULT '{}',
    parent_task_id UUID REFERENCES blackboard_tasks(id),
    blocked_by TEXT[] DEFAULT '{}',
    notes JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL
);

-- Create indexes for faster task lookup
CREATE INDEX idx_blackboard_tasks_campaign ON blackboard_tasks (campaign_id);
CREATE INDEX idx_blackboard_tasks_status ON blackboard_tasks (status);
CREATE INDEX idx_blackboard_tasks_type ON blackboard_tasks (type);
CREATE INDEX idx_blackboard_tasks_parent ON blackboard_tasks (parent_task_id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_blackboard_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blackboard_tasks_updated_at
    BEFORE UPDATE ON blackboard_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_blackboard_tasks_updated_at();

-- Add RLS policies
ALTER TABLE blackboard_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their campaigns"
ON blackboard_tasks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = blackboard_tasks.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can create tasks in their campaigns"
ON blackboard_tasks FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = blackboard_tasks.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can update tasks in their campaigns"
ON blackboard_tasks FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = blackboard_tasks.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
); 