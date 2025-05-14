import { Database } from '../lib/database.types';

export type EntityType = 
  | 'npc' 
  | 'location' 
  | 'faction' 
  | 'item' 
  | 'event' 
  | 'quest' 
  | 'player' 
  | 'story-point' 
  | 'rule' 
  | 'monster' 
  | 'encounter' 
  | 'character' 
  | 'lore';

export interface Entity {
  id: string;
  campaign_id: string;
  type: EntityType;
  name: string;
  content: Record<string, unknown>;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntityRelationship {
  id: string;
  campaign_id: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  description?: string;
  strength: number;
  bidirectional: boolean;
  created_at: string;
  updated_at: string;
}

// A subset of relationship data used for displaying in the UI
export interface EntityRelationshipDisplay {
  id: string;
  source: {
    id: string;
    name: string;
    type: EntityType;
  };
  target: {
    id: string;
    name: string;
    type: EntityType;
  };
  relationship_type: string;
  description?: string;
  strength: number;
  bidirectional: boolean;
}

// Common relationship types for dropdown selection
export const COMMON_RELATIONSHIP_TYPES = [
  'knows',
  'allies_with',
  'enemies_with',
  'located_in',
  'member_of',
  'owns',
  'created',
  'related_to',
  'reports_to',
  'leads',
  'trades_with',
  'worships',
  'protects',
  'threatens',
  'seeks',
  'controls',
  'studies'
];

// For use in API calls
export type EntityRelationshipInsert = Omit<EntityRelationship, 'id' | 'created_at' | 'updated_at'>;
export type EntityRelationshipUpdate = Partial<Omit<EntityRelationship, 'id' | 'created_at' | 'updated_at'>>; 