-- Add locking fields to all relevant entity tables

-- For NPCs
ALTER TABLE npcs
ADD COLUMN IF NOT EXISTS writeable_by_agents BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS frozen_by_dm BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_fields TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMPTZ;

-- For Locations
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS writeable_by_agents BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS frozen_by_dm BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_fields TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMPTZ;

-- For Items
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  owner_id UUID, -- Can be NULL if not owned
  owner_type TEXT CHECK (owner_type IN ('npc', 'character', 'location', NULL)),
  properties JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Locking fields
  writeable_by_agents BOOLEAN DEFAULT TRUE,
  frozen_by_dm BOOLEAN DEFAULT FALSE,
  locked_fields TEXT[] DEFAULT '{}',
  unlock_at TIMESTAMPTZ
);

-- For Factions
CREATE TABLE IF NOT EXISTS factions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  headquarters_id UUID REFERENCES locations(id),
  leader_id UUID REFERENCES npcs(id),
  goals TEXT[],
  allies TEXT[],
  enemies TEXT[],
  resources JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Locking fields
  writeable_by_agents BOOLEAN DEFAULT TRUE,
  frozen_by_dm BOOLEAN DEFAULT FALSE,
  locked_fields TEXT[] DEFAULT '{}',
  unlock_at TIMESTAMPTZ
);

-- For Story Arcs
ALTER TABLE story_arcs
ADD COLUMN IF NOT EXISTS writeable_by_agents BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS frozen_by_dm BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_fields TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMPTZ;

-- Create lockable fields reference table to validate field names
CREATE TABLE IF NOT EXISTS lockable_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  description TEXT,
  
  CONSTRAINT unique_entity_field UNIQUE (entity_type, field_name)
);

-- Insert base lockable fields for each entity type
INSERT INTO lockable_fields (entity_type, field_name, description)
VALUES 
  -- NPC lockable fields
  ('npc', 'name', 'NPC name'),
  ('npc', 'description', 'NPC description'),
  ('npc', 'personality', 'NPC personality traits'),
  ('npc', 'memory_context', 'NPC memory and context'),
  ('npc', 'voice_profile', 'Voice settings'),
  ('npc', 'location_id', 'Current location of NPC'),
  
  -- Location lockable fields
  ('location', 'name', 'Location name'),
  ('location', 'description', 'Location description'),
  ('location', 'map_data', 'Map and visual data'),
  ('location', 'parent_location_id', 'Parent location reference'),
  
  -- Item lockable fields
  ('item', 'name', 'Item name'),
  ('item', 'description', 'Item description'),
  ('item', 'properties', 'Magical/special properties'),
  ('item', 'location_id', 'Current location'),
  ('item', 'owner_id', 'Current owner'),
  
  -- Faction lockable fields
  ('faction', 'name', 'Faction name'),
  ('faction', 'description', 'Faction description'),
  ('faction', 'goals', 'Faction goals and motivations'),
  ('faction', 'headquarters_id', 'Faction headquarters'),
  ('faction', 'leader_id', 'Faction leader'),
  ('faction', 'allies', 'Allied factions'),
  ('faction', 'enemies', 'Enemy factions'),
  
  -- Story Arc lockable fields
  ('story_arc', 'title', 'Story arc title'),
  ('story_arc', 'description', 'Story arc description'),
  ('story_arc', 'status', 'Current status'),
  ('story_arc', 'nodes', 'Plot points/nodes')
ON CONFLICT (entity_type, field_name) DO NOTHING;

-- Create revision queue for handling edits to locked fields
CREATE TABLE IF NOT EXISTS revision_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  field TEXT NOT NULL,
  current_value JSONB,
  proposed_value JSONB NOT NULL,
  agent_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved BOOLEAN,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT
);

-- RLS Policies for new tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lockable_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_queue ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Allow read access to items for campaign members" 
ON items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = items.campaign_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert, update for campaign owners and DMs" 
ON items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = items.campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
);

-- Factions policies
CREATE POLICY "Allow read access to factions for campaign members" 
ON factions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = factions.campaign_id
    AND campaign_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert, update for campaign owners and DMs" 
ON factions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM campaign_members 
    WHERE campaign_members.campaign_id = factions.campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.role IN ('owner', 'dm')
  )
);

-- Lockable fields policies (available to all authenticated users)
CREATE POLICY "Allow read access to lockable fields for all authenticated users" 
ON lockable_fields FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin management of lockable fields" 
ON lockable_fields FOR ALL 
USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Revision queue policies
CREATE POLICY "Allow read access to revision queue for campaign members" 
ON revision_queue FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM campaigns c
    JOIN campaign_members cm ON c.id = cm.campaign_id
    WHERE (
      (revision_queue.entity_type = 'npc' AND EXISTS (
        SELECT 1 FROM npcs WHERE npcs.id = revision_queue.entity_id AND npcs.campaign_id = c.id
      )) OR
      (revision_queue.entity_type = 'location' AND EXISTS (
        SELECT 1 FROM locations WHERE locations.id = revision_queue.entity_id AND locations.campaign_id = c.id
      )) OR
      (revision_queue.entity_type = 'item' AND EXISTS (
        SELECT 1 FROM items WHERE items.id = revision_queue.entity_id AND items.campaign_id = c.id
      )) OR
      (revision_queue.entity_type = 'faction' AND EXISTS (
        SELECT 1 FROM factions WHERE factions.id = revision_queue.entity_id AND factions.campaign_id = c.id
      )) OR
      (revision_queue.entity_type = 'story_arc' AND EXISTS (
        SELECT 1 FROM story_arcs WHERE story_arcs.id = revision_queue.entity_id AND story_arcs.campaign_id = c.id
      ))
    )
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert for all authenticated users" 
ON revision_queue FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update for campaign owners and DMs" 
ON revision_queue FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM campaigns c
    JOIN campaign_members cm ON c.id = cm.campaign_id
    WHERE (
      (revision_queue.entity_type = 'npc' AND EXISTS (
        SELECT 1 FROM npcs WHERE npcs.id = revision_queue.entity_id AND npcs.campaign_id = c.id
      )) OR
      (revision_queue.entity_type = 'location' AND EXISTS (
        SELECT 1 FROM locations WHERE locations.id = revision_queue.entity_id AND locations.campaign_id = c.id
      )) OR
      (revision_queue.entity_type = 'item' AND EXISTS (
        SELECT 1 FROM items WHERE items.id = revision_queue.entity_id AND items.campaign_id = c.id
      )) OR
      (revision_queue.entity_type = 'faction' AND EXISTS (
        SELECT 1 FROM factions WHERE factions.id = revision_queue.entity_id AND factions.campaign_id = c.id
      )) OR
      (revision_queue.entity_type = 'story_arc' AND EXISTS (
        SELECT 1 FROM story_arcs WHERE story_arcs.id = revision_queue.entity_id AND story_arcs.campaign_id = c.id
      ))
    )
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'dm')
  )
); 