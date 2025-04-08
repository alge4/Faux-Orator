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
      users: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
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
      campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          is_active: boolean;
          setting: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by: string;
          is_active?: boolean;
          setting?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_by?: string;
          is_active?: boolean;
          setting?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      campaign_members: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          role: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      locations: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          description: string | null;
          parent_location_id: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          description?: string | null;
          parent_location_id?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          description?: string | null;
          parent_location_id?: string | null;
          tags?: string[] | null;
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
            foreignKeyName: "locations_parent_location_id_fkey";
            columns: ["parent_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      npcs: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          description: string | null;
          personality: string | null;
          current_location_id: string | null;
          status: string | null;
          faction_id: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          description?: string | null;
          personality?: string | null;
          current_location_id?: string | null;
          status?: string | null;
          faction_id?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          description?: string | null;
          personality?: string | null;
          current_location_id?: string | null;
          status?: string | null;
          faction_id?: string | null;
          tags?: string[] | null;
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
          },
          {
            foreignKeyName: "npcs_current_location_id_fkey";
            columns: ["current_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "npcs_faction_id_fkey";
            columns: ["faction_id"];
            isOneToOne: false;
            referencedRelation: "factions";
            referencedColumns: ["id"];
          }
        ];
      };
      factions: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          description: string | null;
          current_status: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          description?: string | null;
          current_status?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          description?: string | null;
          current_status?: string | null;
          tags?: string[] | null;
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
          campaign_id: string;
          name: string;
          description: string | null;
          is_magical: boolean;
          current_holder_id: string | null;
          location_id: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          description?: string | null;
          is_magical?: boolean;
          current_holder_id?: string | null;
          location_id?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          description?: string | null;
          is_magical?: boolean;
          current_holder_id?: string | null;
          location_id?: string | null;
          tags?: string[] | null;
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
          },
          {
            foreignKeyName: "items_current_holder_id_fkey";
            columns: ["current_holder_id"];
            isOneToOne: false;
            referencedRelation: "npcs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      session_plans: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          summary: string | null;
          objectives: Json | null;
          involved_entities: Json | null;
          story_beats: Json | null;
          tags: string[] | null;
          difficulty: string | null;
          estimated_duration: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          summary?: string | null;
          objectives?: Json | null;
          involved_entities?: Json | null;
          story_beats?: Json | null;
          tags?: string[] | null;
          difficulty?: string | null;
          estimated_duration?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          title?: string;
          summary?: string | null;
          objectives?: Json | null;
          involved_entities?: Json | null;
          story_beats?: Json | null;
          tags?: string[] | null;
          difficulty?: string | null;
          estimated_duration?: number | null;
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
      story_arcs: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          description: string | null;
          nodes: Json | null;
          connections: Json | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          description?: string | null;
          nodes?: Json | null;
          connections?: Json | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          title?: string;
          description?: string | null;
          nodes?: Json | null;
          connections?: Json | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_arcs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      action_consequences: {
        Row: {
          id: string;
          campaign_id: string;
          action: string;
          consequences: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          action: string;
          consequences?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          action?: string;
          consequences?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "action_consequences_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      agent_logs: {
        Row: {
          id: string;
          campaign_id: string;
          session_id: string | null;
          agent_type: string;
          action: string;
          input: Json | null;
          output: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          session_id?: string | null;
          agent_type: string;
          action: string;
          input?: Json | null;
          output?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          session_id?: string | null;
          agent_type?: string;
          action?: string;
          input?: Json | null;
          output?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_logs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_mock_data: {
        Args: {
          user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
