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
}

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
        // PGRST116 is "not found"
        throw fetchError;
      }

      // If no chat exists, create one
      if (!existingChat) {
        const { data: newChat, error: createError } = await supabase
          .from("assistant_chats")
          .insert({
            campaign_id: campaignId,
            mode: mode,
            context: {},
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

      // Insert the message
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

      // Update last_interaction timestamp
      const { error: updateError } = await supabase
        .from("assistant_chats")
        .update({ last_interaction: new Date().toISOString() })
        .eq("id", assistantChat.id);

      if (updateError) throw updateError;

      // Refresh messages to include the new one
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
  };
}
