import { Database } from "./database.types";
import { Json } from "./supabase";

export type SessionLog = Database["public"]["Tables"]["session_logs"]["Row"];
export type HighlightedAction =
  Database["public"]["Tables"]["highlighted_actions"]["Row"];
export type ArchivedSession =
  Database["public"]["Tables"]["archived_sessions"]["Row"];

export type SpeakerType = "player" | "npc" | "dm" | "system";
export type DialogueType =
  | "action"
  | "reaction"
  | "declaration"
  | "question"
  | "answer"
  | "narration"
  | "other";
export type ImportanceLevel = "low" | "medium" | "high" | "critical";
export type ActionCategory =
  | "combat"
  | "roleplay"
  | "discovery"
  | "decision"
  | "quest"
  | "other";

export interface TranscriptInput {
  raw_text: string;
  session_id: string;
  campaign_id: string;
  timestamp?: Date;
}

export interface DiarizedSpeech {
  speaker_id?: string;
  speaker_type: SpeakerType;
  content: string;
  confidence_score?: number;
  timestamp: Date;
}

export interface ProcessedTranscript {
  diarized_segments: DiarizedSpeech[];
  extracted_entities: string[];
  confidence: number;
}

export interface HighlightedActionInput {
  session_id: string;
  campaign_id: string;
  log_id?: string;
  title: string;
  description: string;
  importance: ImportanceLevel;
  category: ActionCategory;
  entities_involved: string[];
  narrative_consequences?: Json;
}

export interface EntityReference {
  id: string;
  type: "npc" | "player" | "location" | "item" | "faction";
  name: string;
  confidence: number;
}

export interface SessionSummary {
  key_events: HighlightedAction[];
  player_actions: Record<string, string[]>; // player_id -> list of actions
  npc_actions: Record<string, string[]>; // npc_id -> list of actions
  locations_visited: string[];
  items_referenced: string[];
  decisions_made: {
    decision: string;
    importance: ImportanceLevel;
    consequences: string;
  }[];
}

export interface ArchivedSessionInput {
  session_id: string;
  campaign_id: string;
  summary: string;
  key_events: Json;
  entities_referenced: string[];
  metadata?: Json;
}
