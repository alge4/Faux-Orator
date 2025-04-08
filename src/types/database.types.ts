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
      agent_activity_logs: {
        Row: {
          id: string;
          agent_name: string;
          action: string;
          details: Json | null;
          campaign_id: string | null;
          user_id: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_name: string;
          action: string;
          details?: Json | null;
          campaign_id?: string | null;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_name?: string;
          action?: string;
          details?: Json | null;
          campaign_id?: string | null;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_activity_logs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_activity_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          setting: string | null;
          theme: string | null;
          owner_id: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          setting?: string | null;
          theme?: string | null;
          owner_id: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          setting?: string | null;
          theme?: string | null;
          owner_id?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      factions: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          description: string | null;
          goals: string | null;
          notable_members: string[] | null;
          allies: string[] | null;
          enemies: string[] | null;
          campaign_id: string;
          current_status: string | null;
          headquarters: string | null;
          tags: string[] | null;
          last_update: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string | null;
          description?: string | null;
          goals?: string | null;
          notable_members?: string[] | null;
          allies?: string[] | null;
          enemies?: string[] | null;
          campaign_id: string;
          current_status?: string | null;
          headquarters?: string | null;
          tags?: string[] | null;
          last_update?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          description?: string | null;
          goals?: string | null;
          notable_members?: string[] | null;
          allies?: string[] | null;
          enemies?: string[] | null;
          campaign_id?: string;
          current_status?: string | null;
          headquarters?: string | null;
          tags?: string[] | null;
          last_update?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "factions_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      items: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          description: string | null;
          history: string | null;
          properties: Json | null;
          campaign_id: string;
          current_holder: string | null;
          tags: string[] | null;
          last_update: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string | null;
          description?: string | null;
          history?: string | null;
          properties?: Json | null;
          campaign_id: string;
          current_holder?: string | null;
          tags?: string[] | null;
          last_update?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          description?: string | null;
          history?: string | null;
          properties?: Json | null;
          campaign_id?: string;
          current_holder?: string | null;
          tags?: string[] | null;
          last_update?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          description: string | null;
          history: string | null;
          points_of_interest: Json | null;
          notable_npcs: string[] | null;
          parent_location: string | null;
          campaign_id: string;
          tags: string[] | null;
          map_url: string | null;
          last_update: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string | null;
          description?: string | null;
          history?: string | null;
          points_of_interest?: Json | null;
          notable_npcs?: string[] | null;
          parent_location?: string | null;
          campaign_id: string;
          tags?: string[] | null;
          map_url?: string | null;
          last_update?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          description?: string | null;
          history?: string | null;
          points_of_interest?: Json | null;
          notable_npcs?: string[] | null;
          parent_location?: string | null;
          campaign_id?: string;
          tags?: string[] | null;
          map_url?: string | null;
          last_update?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "locations_parent_location_fkey";
            columns: ["parent_location"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      npcs: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          description: string | null;
          personality: string | null;
          goals: string | null;
          secrets: string | null;
          appearance: string | null;
          history: string | null;
          campaign_id: string;
          current_location: string | null;
          status: string | null;
          stat_block: Json | null;
          tags: string[] | null;
          last_update: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string | null;
          description?: string | null;
          personality?: string | null;
          goals?: string | null;
          secrets?: string | null;
          appearance?: string | null;
          history?: string | null;
          campaign_id: string;
          current_location?: string | null;
          status?: string | null;
          stat_block?: Json | null;
          tags?: string[] | null;
          last_update?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          description?: string | null;
          personality?: string | null;
          goals?: string | null;
          secrets?: string | null;
          appearance?: string | null;
          history?: string | null;
          campaign_id?: string;
          current_location?: string | null;
          status?: string | null;
          stat_block?: Json | null;
          tags?: string[] | null;
          last_update?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "npcs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      openai_usage_logs: {
        Row: {
          id: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          model: string;
          campaign_id: string | null;
          user_id: string;
          duration_ms: number | null;
          action: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          model: string;
          campaign_id?: string | null;
          user_id: string;
          duration_ms?: number | null;
          action?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          model?: string;
          campaign_id?: string | null;
          user_id?: string;
          duration_ms?: number | null;
          action?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "openai_usage_logs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "openai_usage_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      session_plans: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          objectives: Json;
          story_beats: Json;
          involved_entities: Json;
          campaign_id: string;
          difficulty: Database["public"]["Enums"]["session_difficulty"];
          estimated_duration: number | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary?: string | null;
          objectives?: Json;
          story_beats?: Json;
          involved_entities?: Json;
          campaign_id: string;
          difficulty?: Database["public"]["Enums"]["session_difficulty"];
          estimated_duration?: number | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string | null;
          objectives?: Json;
          story_beats?: Json;
          involved_entities?: Json;
          campaign_id?: string;
          difficulty?: Database["public"]["Enums"]["session_difficulty"];
          estimated_duration?: number | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_plans_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      entity_type:
        | "character"
        | "npc"
        | "monster"
        | "location"
        | "faction"
        | "item";
      session_difficulty: "easy" | "medium" | "hard" | "deadly";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
