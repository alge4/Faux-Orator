import { create } from 'zustand';
import { Entity } from './useCampaign';

export type ChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: string;
  contextRefs?: string[]; // References to entity IDs this message mentions
  entities?: Entity[]; // Full entity objects for references
};

interface ChatStore {
  messages: ChatMessage[];
  contextRefs: Entity[];
  isLoading: boolean;
  sendMessage: (text: string, contextRefs?: string[]) => void;
  addContextRef: (entity: Entity) => void;
  removeContextRef: (entityId: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [
    {
      id: 'system-1',
      text: 'Welcome! I am your D&D campaign assistant. I can help you plan sessions, manage NPCs, create encounters, and more. What would you like to work on?',
      sender: 'system',
      timestamp: new Date().toISOString(),
    }
  ],
  contextRefs: [],
  isLoading: false,
  
  sendMessage: (text: string, contextRefs: string[] = []) => {
    if (!text.trim()) return;
    
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender: get().messages.length % 2 === 0 ? 'user' : 'ai',
      timestamp: new Date().toISOString(),
      contextRefs,
    };
    
    set(state => ({ 
      messages: [...state.messages, message],
      isLoading: message.sender === 'user' // Only set loading when user sends message
    }));
  },
  
  addContextRef: (entity: Entity) => {
    set(state => {
      if (state.contextRefs.some(e => e.id === entity.id)) return state;
      return { contextRefs: [...state.contextRefs, entity] };
    });
  },
  
  removeContextRef: (entityId: string) => {
    set(state => ({
      contextRefs: state.contextRefs.filter(e => e.id !== entityId)
    }));
  },
  
  clearMessages: () => {
    set({
      messages: [
        {
          id: 'system-1',
          text: 'Chat cleared. How can I help you with your campaign?',
          sender: 'system',
          timestamp: new Date().toISOString(),
        }
      ],
      contextRefs: []
    });
  }
}));

// Helper function to generate mock AI responses
function generateAIResponse(userMessage: string, contextRefs: Entity[]): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Reference contextual entities if available
  if (contextRefs.length > 0) {
    const entityNames = contextRefs.map(e => e.name).join(', ');
    
    if (lowerMessage.includes('describe')) {
      return `Based on your references to ${entityNames}, here's what I know:\n\n${
        contextRefs.map(e => `**${e.name}**: ${e.content.description}`).join('\n\n')
      }`;
    }
    
    return `I see you're interested in ${entityNames}. How would you like to incorporate ${
      contextRefs.length > 1 ? 'these elements' : 'this element'
    } into your campaign?`;
  }
  
  // Generic responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your campaign assistant. How can I help you with your campaign today?";
  }
  
  if (lowerMessage.includes('help')) {
    return "I can help you build your campaign world, create NPCs, design encounters, generate plot hooks, and more. What would you like assistance with?";
  }
  
  if (lowerMessage.includes('npc') || lowerMessage.includes('character')) {
    return "Would you like me to help create an NPC? I can generate names, personalities, backgrounds, and motivations.";
  }
  
  if (lowerMessage.includes('encounter') || lowerMessage.includes('combat')) {
    return "I can help design a balanced encounter for your players. What level is your party and what environment will they be in?";
  }
  
  if (lowerMessage.includes('location') || lowerMessage.includes('place')) {
    return "I'd be happy to help you design a location for your campaign. Would you like a dungeon, settlement, wilderness area, or something else?";
  }
  
  // Default response
  return "I understand. How would you like to develop this idea further for your campaign?";
}

// Hook for components to use
export const useChat = () => {
  const {
    messages,
    contextRefs,
    isLoading,
    sendMessage,
    addContextRef,
    removeContextRef,
    clearMessages
  } = useChatStore();
  
  return {
    messages,
    contextRefs,
    isLoading,
    sendMessage,
    addContextRef,
    removeContextRef,
    clearMessages
  };
}; 