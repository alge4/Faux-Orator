import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export interface AssistantChat {
  id: string;
  campaign_id: string;
  mode: "planning" | "running" | "review";
  context: Record<string, any>;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantMessage {
  id: string;
  campaign_id: string;
  user_id: string;
  content: string;
  mode: "planning" | "running" | "review";
  entities: any[];
  is_ai_response: boolean;
  assistant_chat_id: string;
  has_attachments: boolean;
  created_at: string;
}

interface UseAssistantChatResult {
  assistantChat: AssistantChat | null;
  messages: AssistantMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  refreshChat: () => Promise<void>;
  isTyping: boolean;
}

const DM_ASSISTANT_CONTEXT = {
  role: "You are an expert Dungeon Master's assistant with deep knowledge of D&D 5.5e rules, traditional lore, and game mastering techniques. You have studied various D&D editions, online gaming platforms, game design, and countless campaign styles. Your goal is to help DMs create and run engaging, balanced, and memorable campaigns. We must maintain player agency and not plan activities without freedom for choices and dice points.",
  expertise: [
    "D&D 5.5E rules and mechanics",
    "Campaign planning and world-building",
    "NPC creation and roleplay",
    "Combat encounter design",
    "Narrative development",
    "Player engagement techniques",
    "Online gaming tools and VTTs",
    "Improv storytelling",
    "Game balance and pacing",
  ],
  modeContexts: {
    planning:
      "In planning mode, focus on world-building, campaign structure, plot development, and session preparation. Help create compelling storylines, interesting locations, and memorable NPCs.",
    running:
      "In running mode, provide quick reference for rules, suggest narrative directions, help manage pacing, and offer creative solutions for unexpected player actions. Help me the dungeon master keep the session engaging, fun and moving forwards. Collate notes from the session to be reviewed later.",
    review:
      "In review mode, analyze session outcomes, suggest improvements, help track narrative threads, and provide insights for future session planning. Confirm events that may have happened in the session, and help the dungeon master to remember the details of the session.",
  },
};

export function useAssistantChat(
  campaignId: string,
  mode: "planning" | "running" | "review"
): UseAssistantChatResult {
  const [assistantChat, setAssistantChat] = useState<AssistantChat | null>(
    null
  );
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const generateAIResponse = async (
    userMessage: string,
    chatContext: AssistantChat,
    previousMessages: AssistantMessage[]
  ) => {
    setIsTyping(true);
    try {
      // Here you would typically call your AI service (e.g., OpenAI, Claude, etc.)
      // For now, we'll simulate the AI response with a placeholder
      const modeContext = DM_ASSISTANT_CONTEXT.modeContexts[mode];

      // Insert AI response into the database
      const { data: aiMessage, error: aiError } = await supabase
        .from("messages")
        .insert({
          campaign_id: campaignId,
          content: "AI response placeholder - integrate with your AI service",
          mode,
          assistant_chat_id: chatContext.id,
          is_ai_response: true,
          entities: [],
          has_attachments: false,
        })
        .select()
        .single();

      if (aiError) throw aiError;

      // Update context with any new information
      const updatedContext = {
        ...chatContext.context,
        lastDiscussedTopic: userMessage,
        messageCount: previousMessages.length + 2,
      };

      // Update the chat context
      const { error: contextError } = await supabase
        .from("assistant_chats")
        .update({
          context: updatedContext,
          last_interaction: new Date().toISOString(),
        })
        .eq("id", chatContext.id);

      if (contextError) throw contextError;

      return aiMessage;
    } catch (err) {
      console.error("Error generating AI response:", err);
      throw err;
    } finally {
      setIsTyping(false);
    }
  };

  const fetchOrCreateAssistantChat = async () => {
    try {
      // First try to fetch existing chat
      let { data: existingChat, error: fetchError } = await supabase
        .from("assistant_chats")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("mode", mode)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      // If no chat exists, create one with initial context
      if (!existingChat) {
        const { data: newChat, error: createError } = await supabase
          .from("assistant_chats")
          .insert({
            campaign_id: campaignId,
            mode: mode,
            context: {
              assistantRole: DM_ASSISTANT_CONTEXT.role,
              expertise: DM_ASSISTANT_CONTEXT.expertise,
              modeContext: DM_ASSISTANT_CONTEXT.modeContexts[mode],
              messageCount: 0,
              lastDiscussedTopic: null,
            },
          })
          .select()
          .single();

        if (createError) throw createError;
        existingChat = newChat;
      }

      setAssistantChat(existingChat);
      return existingChat;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch/create assistant chat")
      );
      return null;
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select(
          `
          *,
          attachments (*)
        `
        )
        .eq("assistant_chat_id", chatId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch messages")
      );
    }
  };

  const refreshChat = async () => {
    setIsLoading(true);
    setError(null);
    const chat = await fetchOrCreateAssistantChat();
    if (chat) {
      await fetchMessages(chat.id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    refreshChat();
  }, [campaignId, mode]);

  const sendMessage = async (content: string, files?: File[]) => {
    if (!assistantChat) return;

    try {
      // Handle file uploads first if any
      const attachments = files
        ? await Promise.all(
            files.map(async (file) => {
              const filePath = `campaigns/${campaignId}/assistant/${
                assistantChat.id
              }/${Date.now()}-${file.name}`;
              const { error: uploadError } = await supabase.storage
                .from("attachments")
                .upload(filePath, file);

              if (uploadError) throw uploadError;

              return {
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                storage_path: filePath,
              };
            })
          )
        : [];

      // Insert the user message
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert({
          campaign_id: campaignId,
          content,
          mode,
          assistant_chat_id: assistantChat.id,
          has_attachments: attachments.length > 0,
          is_ai_response: false,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // If we have attachments, create them in the database
      if (attachments.length > 0) {
        const { error: attachmentError } = await supabase
          .from("attachments")
          .insert(
            attachments.map((att) => ({
              ...att,
              message_id: message.id,
              campaign_id: campaignId,
            }))
          );

        if (attachmentError) throw attachmentError;
      }

      // Fetch current messages for context
      await fetchMessages(assistantChat.id);

      // Generate and save AI response
      await generateAIResponse(content, assistantChat, messages);

      // Refresh messages to include both user message and AI response
      await fetchMessages(assistantChat.id);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to send message")
      );
    }
  };

  return {
    assistantChat,
    messages,
    isLoading,
    error,
    sendMessage,
    refreshChat,
    isTyping,
  };
}
