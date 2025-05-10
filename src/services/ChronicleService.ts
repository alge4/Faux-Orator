import {
  ArchivedSessionInput,
  DiarizedSpeech,
  HighlightedActionInput,
  ProcessedTranscript,
  SessionSummary,
  TranscriptInput,
} from "../types/chronicle";
import { supabase } from "../supabase/client";

class ChronicleService {
  /**
   * Process raw transcript into structured data
   */
  public async processTranscript(
    input: TranscriptInput
  ): Promise<ProcessedTranscript> {
    try {
      // In a real implementation, this would:
      // 1. Use a speech recognition service to diarize speakers
      // 2. Apply NLP to extract entities and actions
      // 3. Calculate confidence scores

      // Mock implementation for now
      const mockSegments: DiarizedSpeech[] = [
        {
          speaker_type: "dm",
          content:
            "As you enter the tavern, you see a dwarf arguing with the bartender.",
          confidence_score: 0.95,
          timestamp: new Date(),
        },
        {
          speaker_type: "player",
          content: "I want to approach them and listen to their conversation.",
          confidence_score: 0.92,
          timestamp: new Date(Date.now() + 5000),
        },
      ];

      // Store in session logs
      for (const segment of mockSegments) {
        await this.addSessionLog({
          session_id: input.session_id,
          campaign_id: input.campaign_id,
          speaker_type: segment.speaker_type,
          speaker_id: segment.speaker_id,
          content: segment.content,
          confidence_score: segment.confidence_score,
          timestamp: segment.timestamp.toISOString(),
        });
      }

      return {
        diarized_segments: mockSegments,
        extracted_entities: ["tavern", "dwarf", "bartender"],
        confidence: 0.93,
      };
    } catch (error) {
      console.error("Error processing transcript:", error);
      throw error;
    }
  }

  /**
   * Add a log entry to session_logs
   */
  private async addSessionLog(logEntry: {
    session_id: string;
    campaign_id: string;
    speaker_type: string;
    speaker_id?: string;
    content: string;
    dialogue_type?: string;
    confidence_score?: number;
    timestamp: string;
    entities_referenced?: string[];
  }) {
    try {
      const { error } = await supabase.from("session_logs").insert([logEntry]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error adding session log:", error);
      throw error;
    }
  }

  /**
   * Add a highlighted action (key moment in session)
   */
  public async addHighlightedAction(highlight: HighlightedActionInput) {
    try {
      const { error } = await supabase.from("highlighted_actions").insert([
        {
          session_id: highlight.session_id,
          campaign_id: highlight.campaign_id,
          log_id: highlight.log_id,
          title: highlight.title,
          description: highlight.description,
          importance: highlight.importance,
          category: highlight.category,
          entities_involved: highlight.entities_involved,
          narrative_consequences: highlight.narrative_consequences,
        },
      ]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error adding highlighted action:", error);
      throw error;
    }
  }

  /**
   * Archive a session to free up memory
   */
  public async archiveSession(input: ArchivedSessionInput) {
    try {
      const { error } = await supabase.from("archived_sessions").insert([
        {
          session_id: input.session_id,
          campaign_id: input.campaign_id,
          summary: input.summary,
          key_events: input.key_events,
          entities_referenced: input.entities_referenced,
          metadata: input.metadata,
        },
      ]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error archiving session:", error);
      throw error;
    }
  }

  /**
   * Generate session summary
   */
  public async generateSessionSummary(
    sessionId: string
  ): Promise<SessionSummary> {
    try {
      // Fetch session logs
      const { data: logs, error: logsError } = await supabase
        .from("session_logs")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: true });

      if (logsError) {
        throw logsError;
      }

      // Fetch highlighted actions
      const { data: highlights, error: highlightsError } = await supabase
        .from("highlighted_actions")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: true });

      if (highlightsError) {
        throw highlightsError;
      }

      // In a real implementation, this would analyze session data
      // to extract key events, decisions, and summaries

      // Mock response for now
      const summary: SessionSummary = {
        key_events: highlights || [],
        player_actions: {},
        npc_actions: {},
        locations_visited: [],
        items_referenced: [],
        decisions_made: [],
      };

      // Group actions by player
      if (logs) {
        logs.forEach((log) => {
          if (log.speaker_type === "player" && log.speaker_id) {
            if (!summary.player_actions[log.speaker_id]) {
              summary.player_actions[log.speaker_id] = [];
            }
            summary.player_actions[log.speaker_id].push(log.content);
          } else if (log.speaker_type === "npc" && log.speaker_id) {
            if (!summary.npc_actions[log.speaker_id]) {
              summary.npc_actions[log.speaker_id] = [];
            }
            summary.npc_actions[log.speaker_id].push(log.content);
          }
        });
      }

      return summary;
    } catch (error) {
      console.error("Error generating session summary:", error);
      throw error;
    }
  }

  /**
   * Prune session memory to only keep recent sessions
   */
  public async pruneSessionMemory(campaignId: string, keepCount: number = 4) {
    try {
      // Get all sessions for the campaign, ordered by creation date
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("id, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      if (!sessions || sessions.length <= keepCount) {
        return; // Nothing to prune
      }

      // Sessions to archive
      const sessionsToArchive = sessions.slice(keepCount);

      for (const session of sessionsToArchive) {
        // Generate summary for the session
        const summary = await this.generateSessionSummary(session.id);

        // Archive the session
        await this.archiveSession({
          session_id: session.id,
          campaign_id: campaignId,
          summary: `Archived session from ${new Date(
            session.created_at
          ).toLocaleDateString()}`,
          key_events: summary.key_events,
          entities_referenced: Object.keys(summary.npc_actions),
        });
      }

      return true;
    } catch (error) {
      console.error("Error pruning session memory:", error);
      throw error;
    }
  }
}

export const chronicleService = new ChronicleService();
