-- Create schema for application tables
CREATE SCHEMA IF NOT EXISTS public;

-- Create custom types
CREATE TYPE public.entity_type AS ENUM ('character', 'npc', 'monster', 'location', 'faction', 'item');
CREATE TYPE public.session_difficulty AS ENUM ('easy', 'medium', 'hard', 'deadly');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set up Row Level Security (RLS)
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO 'your-super-secret-jwt-token-with-at-least-32-characters-long';

-- Users Profile table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  setting TEXT,
  theme TEXT,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create NPCs table
CREATE TABLE public.npcs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  personality TEXT,
  goals TEXT,
  secrets TEXT,
  appearance TEXT,
  history TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  current_location TEXT,
  status TEXT,
  stat_block JSONB,
  tags TEXT[],
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  history TEXT,
  points_of_interest JSONB,
  notable_npcs TEXT[],
  parent_location UUID REFERENCES public.locations(id),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  tags TEXT[],
  map_url TEXT,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create factions table
CREATE TABLE public.factions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  goals TEXT,
  notable_members TEXT[],
  allies TEXT[],
  enemies TEXT[],
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  current_status TEXT,
  headquarters TEXT,
  tags TEXT[],
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  history TEXT,
  properties JSONB,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  current_holder TEXT,
  tags TEXT[],
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create session plans table
CREATE TABLE public.session_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT,
  objectives JSONB DEFAULT '[]'::JSONB NOT NULL,
  story_beats JSONB DEFAULT '[]'::JSONB NOT NULL,
  involved_entities JSONB DEFAULT '[]'::JSONB NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  difficulty session_difficulty DEFAULT 'medium',
  estimated_duration INTEGER,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create agent activity log
CREATE TABLE public.agent_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create OpenAI usage log
CREATE TABLE public.openai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  model TEXT NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  duration_ms INTEGER,
  action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create functions to automatically update updated_at columns
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for all tables with updated_at
CREATE TRIGGER update_campaigns_modtime
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_npcs_modtime
BEFORE UPDATE ON public.npcs
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_locations_modtime
BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_factions_modtime
BEFORE UPDATE ON public.factions
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_items_modtime
BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_session_plans_modtime
BEFORE UPDATE ON public.session_plans
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Create policies for campaigns
CREATE POLICY "Users can view their own campaigns"
ON public.campaigns FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own campaigns"
ON public.campaigns FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own campaigns"
ON public.campaigns FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own campaigns"
ON public.campaigns FOR DELETE
USING (auth.uid() = owner_id);

-- Create policies for npcs
CREATE POLICY "Users can view npcs in their campaigns"
ON public.npcs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = npcs.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert npcs in their campaigns"
ON public.npcs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = npcs.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update npcs in their campaigns"
ON public.npcs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = npcs.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete npcs in their campaigns"
ON public.npcs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = npcs.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

-- Create similar policies for locations, factions, items, session_plans
-- (Following the same pattern as the npcs policies)

CREATE POLICY "Users can view locations in their campaigns"
ON public.locations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = locations.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert locations in their campaigns"
ON public.locations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = locations.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update locations in their campaigns"
ON public.locations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = locations.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete locations in their campaigns"
ON public.locations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = locations.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

-- Factions
CREATE POLICY "Users can view factions in their campaigns"
ON public.factions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = factions.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert factions in their campaigns"
ON public.factions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = factions.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update factions in their campaigns"
ON public.factions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = factions.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete factions in their campaigns"
ON public.factions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = factions.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

-- Items
CREATE POLICY "Users can view items in their campaigns"
ON public.items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = items.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert items in their campaigns"
ON public.items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = items.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update items in their campaigns"
ON public.items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = items.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items in their campaigns"
ON public.items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = items.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

-- Session Plans
CREATE POLICY "Users can view session plans in their campaigns"
ON public.session_plans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = session_plans.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert session plans in their campaigns"
ON public.session_plans FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = session_plans.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update session plans in their campaigns"
ON public.session_plans FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = session_plans.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete session plans in their campaigns"
ON public.session_plans FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = session_plans.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

-- Agent Activity Logs
CREATE POLICY "Users can view logs for their campaigns"
ON public.agent_activity_logs FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = agent_activity_logs.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "System can insert logs"
ON public.agent_activity_logs FOR INSERT
WITH CHECK (true);

-- OpenAI Usage Logs
CREATE POLICY "Users can view their own usage logs"
ON public.openai_usage_logs FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = openai_usage_logs.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "System can insert usage logs"
ON public.openai_usage_logs FOR INSERT
WITH CHECK (true); 