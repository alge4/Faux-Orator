export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      npcs: {
        Row: {
          id: string;
          name: string;
          description: string;
          voice_profile_id: string;
          campaign_id: string;
          created_at: string;
          updated_at: string;
          memory_context: Json;
          personality: Json;
          location_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          voice_profile_id: string;
          campaign_id: string;
          created_at?: string;
          updated_at?: string;
          memory_context?: Json;
          personality?: Json;
          location_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          voice_profile_id?: string;
          campaign_id?: string;
          created_at?: string;
          updated_at?: string;
          memory_context?: Json;
          personality?: Json;
          location_id?: string | null;
        };
      };
      characters: {
        Row: {
          id: string;
          name: string;
          class: string;
          level: number;
          user_id: string;
          campaign_id: string;
          created_at: string;
          updated_at: string;
          character_data: Json;
        };
        Insert: {
          id?: string;
          name: string;
          class: string;
          level: number;
          user_id: string;
          campaign_id: string;
          created_at?: string;
          updated_at?: string;
          character_data?: Json;
        };
        Update: {
          id?: string;
          name?: string;
          class?: string;
          level?: number;
          user_id?: string;
          campaign_id?: string;
          created_at?: string;
          updated_at?: string;
          character_data?: Json;
        };
      };
      sessions: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          summary: string;
          created_at: string;
          updated_at: string;
          state: Json;
          active: boolean;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          summary: string;
          created_at?: string;
          updated_at?: string;
          state?: Json;
          active?: boolean;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          summary?: string;
          created_at?: string;
          updated_at?: string;
          state?: Json;
          active?: boolean;
        };
      };
      story_arcs: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          description: string;
          created_at: string;
          updated_at: string;
          status: "active" | "completed" | "planned";
          nodes: Json[];
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          description: string;
          created_at?: string;
          updated_at?: string;
          status?: "active" | "completed" | "planned";
          nodes?: Json[];
        };
        Update: {
          id?: string;
          campaign_id?: string;
          title?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
          status?: "active" | "completed" | "planned";
          nodes?: Json[];
        };
      };
      locations: {
        Row: {
          id: string;
          name: string;
          description: string;
          campaign_id: string;
          created_at: string;
          updated_at: string;
          parent_location_id: string | null;
          map_data: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          campaign_id: string;
          created_at?: string;
          updated_at?: string;
          parent_location_id?: string | null;
          map_data?: Json | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          campaign_id?: string;
          created_at?: string;
          updated_at?: string;
          parent_location_id?: string | null;
          map_data?: Json | null;
        };
      };
      voice_profiles: {
        Row: {
          id: string;
          name: string;
          settings: Json;
          created_at: string;
          updated_at: string;
          openai_voice_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          settings: Json;
          created_at?: string;
          updated_at?: string;
          openai_voice_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          openai_voice_id?: string;
        };
      };
    };
  };
}
