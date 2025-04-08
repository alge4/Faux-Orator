-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to set updated_at on users
CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Campaigns table
CREATE TABLE campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  setting TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to set updated_at on campaigns
CREATE TRIGGER set_updated_at_campaigns
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Campaign members table
CREATE TABLE campaign_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('dm', 'player')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(campaign_id, user_id)
);

-- Locations table
CREATE TABLE locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_location_id UUID REFERENCES locations(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to set updated_at on locations
CREATE TRIGGER set_updated_at_locations
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- NPCs table
CREATE TABLE npcs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  personality TEXT,
  current_location_id UUID REFERENCES locations(id),
  status TEXT CHECK (status IN ('alive', 'dead', 'missing', 'unknown')),
  faction_id UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to set updated_at on npcs
CREATE TRIGGER set_updated_at_npcs
BEFORE UPDATE ON npcs
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Factions table
CREATE TABLE factions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  current_status TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to set updated_at on factions
CREATE TRIGGER set_updated_at_factions
BEFORE UPDATE ON factions
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Add faction_id foreign key to npcs
ALTER TABLE npcs ADD CONSTRAINT npcs_faction_id_fkey FOREIGN KEY (faction_id) REFERENCES factions(id);

-- Items table
CREATE TABLE items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_magical BOOLEAN DEFAULT FALSE,
  current_holder_id UUID REFERENCES npcs(id),
  location_id UUID REFERENCES locations(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to set updated_at on items
CREATE TRIGGER set_updated_at_items
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Session plans table
CREATE TABLE session_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  objectives JSONB,
  involved_entities JSONB,
  story_beats JSONB,
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  estimated_duration INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to set updated_at on session_plans
CREATE TRIGGER set_updated_at_session_plans
BEFORE UPDATE ON session_plans
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Story arcs table
CREATE TABLE story_arcs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  nodes JSONB,
  connections JSONB,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to set updated_at on story_arcs
CREATE TRIGGER set_updated_at_story_arcs
BEFORE UPDATE ON story_arcs
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Action consequences table
CREATE TABLE action_consequences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  consequences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Agent logs table
CREATE TABLE agent_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  session_id UUID,
  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  input JSONB,
  output JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create RLS policies
-- First enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_consequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for now)
-- Users can see all other users
CREATE POLICY "Users can see all users" ON users
  FOR SELECT USING (true);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Campaigns - DMs can do anything
CREATE POLICY "DMs can do anything with campaigns" ON campaigns
  USING (
    auth.uid() IN (
      SELECT user_id FROM campaign_members 
      WHERE campaign_id = id AND role = 'dm'
    )
  );

-- Members can see campaigns they belong to
CREATE POLICY "Members can see their campaigns" ON campaigns
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM campaign_members 
      WHERE campaign_id = id
    )
  );

-- Members can see and manage their own memberships
CREATE POLICY "Members can manage own memberships" ON campaign_members
  FOR ALL USING (auth.uid() = user_id);

-- DMs can manage all memberships in their campaigns
CREATE POLICY "DMs can manage all memberships" ON campaign_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = campaign_members.campaign_id 
      AND user_id = auth.uid() 
      AND role = 'dm'
    )
  );

-- Create similar policies for all campaign-related tables
-- This is a simplification - in a real app you'd define more granular policies
CREATE POLICY "Campaign members can view all campaign data" ON locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = locations.campaign_id 
      AND user_id = auth.uid()
    )
  );

-- DMs can manage all campaign data
CREATE POLICY "DMs can manage all campaign data" ON locations
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = locations.campaign_id 
      AND user_id = auth.uid() 
      AND role = 'dm'
    )
  );

-- Apply the same basic policies to other tables
CREATE POLICY "Campaign members can view npcs" ON npcs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = npcs.campaign_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can manage npcs" ON npcs
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = npcs.campaign_id 
      AND user_id = auth.uid() 
      AND role = 'dm'
    )
  );

-- Create a function to generate mock data (for testing only)
CREATE OR REPLACE FUNCTION generate_mock_data(user_id UUID)
RETURNS VOID AS $$
DECLARE
  campaign_id UUID;
  location_id UUID;
  faction_id UUID;
BEGIN
  -- Create a mock campaign
  INSERT INTO campaigns (name, description, created_by, setting, tags)
  VALUES ('Demo Campaign', 'A demo campaign for testing', user_id, 'Forgotten Realms', ARRAY['fantasy', 'demo'])
  RETURNING id INTO campaign_id;
  
  -- Add user as DM
  INSERT INTO campaign_members (campaign_id, user_id, role)
  VALUES (campaign_id, user_id, 'dm');
  
  -- Create mock locations
  INSERT INTO locations (campaign_id, name, description, tags)
  VALUES (campaign_id, 'Neverwinter', 'A bustling city on the Sword Coast', ARRAY['city', 'urban'])
  RETURNING id INTO location_id;
  
  INSERT INTO locations (campaign_id, name, description, parent_location_id, tags)
  VALUES (campaign_id, 'The Driftwood Tavern', 'A popular tavern in Neverwinter', location_id, ARRAY['tavern', 'social']);
  
  -- Create mock faction
  INSERT INTO factions (campaign_id, name, description, current_status, tags)
  VALUES (campaign_id, 'Lords Alliance', 'A coalition of political powers', 'active', ARRAY['political', 'powerful'])
  RETURNING id INTO faction_id;
  
  -- Create mock NPCs
  INSERT INTO npcs (campaign_id, name, description, personality, current_location_id, status, faction_id, tags)
  VALUES 
    (campaign_id, 'Lord Neverember', 'The ruler of Neverwinter', 'Proud and ambitious', location_id, 'alive', faction_id, ARRAY['noble', 'ruler']),
    (campaign_id, 'Gundren Rockseeker', 'A dwarven miner with a secret map', 'Gruff but kind', location_id, 'alive', NULL, ARRAY['dwarf', 'merchant']);
    
  -- Create a mock session plan
  INSERT INTO session_plans (
    campaign_id, 
    title, 
    summary, 
    objectives, 
    involved_entities, 
    story_beats, 
    tags, 
    difficulty, 
    estimated_duration
  )
  VALUES (
    campaign_id,
    'The Missing Shipment',
    'The party investigates a missing shipment of weapons intended for the city guard',
    '["Introduce Lord Neverember", "Lead players to the smugglers den", "Set up faction conflict"]'::JSONB,
    '{
      "npcs": [
        {"id": "placeholder", "name": "Lord Neverember", "role": "Quest giver"},
        {"id": "placeholder", "name": "Gundren Rockseeker", "role": "Informant"}
      ],
      "locations": [
        {"id": "placeholder", "name": "Neverwinter", "significance": "Main city"},
        {"id": "placeholder", "name": "The Driftwood Tavern", "significance": "Meeting place"}
      ]
    }'::JSONB,
    '[
      {
        "id": "beat1",
        "description": "Players meet with Lord Neverember who explains the situation",
        "type": "roleplay",
        "expectedDuration": 30
      },
      {
        "id": "beat2",
        "description": "Investigation at the docks leads to a clue",
        "type": "exploration",
        "expectedDuration": 45
      },
      {
        "id": "beat3",
        "description": "Confrontation with smugglers",
        "type": "combat",
        "expectedDuration": 60
      }
    ]'::JSONB,
    ARRAY['intrigue', 'urban'],
    'medium',
    180
  );
END;
$$ LANGUAGE plpgsql; 