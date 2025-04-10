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
      campaigns: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          description: string | null;
          owner_id: string;
          setting: string | null;
          theme: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          setting?: string | null;
          theme?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          setting?: string | null;
          theme?: string | null;
          updated_at?: string;
        };
      };
      campaign_members: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      dialogues: {
        Row: {
          id: string;
          conversation_id: string;
          campaign_id: string;
          speaker_id: string;
          content: string;
          emotion: string | null;
          context: Json;
          referenced_topics: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          campaign_id: string;
          speaker_id: string;
          content: string;
          emotion?: string | null;
          context: Json;
          referenced_topics?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          campaign_id?: string;
          speaker_id?: string;
          content?: string;
          emotion?: string | null;
          context?: Json;
          referenced_topics?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
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
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
