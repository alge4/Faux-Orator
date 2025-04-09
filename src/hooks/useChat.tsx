import { create } from 'zustand';
import { Entity } from './useCampaign';

export type ChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: string;
  contextRefs?: string[]; // References to entity IDs this message mentions
  referencedContent?: boolean; // Flag for UI highlighting
};

type ChatStore = {
  messages: ChatMessage[];
  contextRefs: Entity[];
  isLoading: boolean;
  
  // Actions
  sendMessage: (text: string, contextRefs?: string[]) => void;
  addContextRef: (entity: Entity) => void;
  removeContextRef: (entityId: string) => void;
  clearContextRefs: () => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [
    {
      id: 'system-1',
      text: 'Welcome to your campaign. You can chat with the AI assistant here.',
      sender: 'system',
      timestamp: new Date().toISOString(),
    }
  ],
  contextRefs: [],
  isLoading: false,
  
  sendMessage: (text, contextRefs = []) => {
    if (!text.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
      contextRefs,
    };
    
    set(state => ({ 
      messages: [...state.messages, userMessage],
      isLoading: true
    }));
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: generateAIResponse(text, get().contextRefs),
        sender: 'ai',
        timestamp: new Date().toISOString(),
        contextRefs: get().contextRefs.map(e => e.id),
        referencedContent: get().contextRefs.length > 0,
      };
      
      set(state => ({ 
        messages: [...state.messages, aiMessage],
        isLoading: false
      }));
    }, 1000);
    
    // In production, this would call the OpenAI API:
    // const response = await fetch('/api/ai', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     message: text,
    //     pinnedEntities: get().contextRefs,
    //     mode: campaignMode, // You would get this from the campaign store
    //   }),
    // });
    // const data = await response.json();
    // set(state => ({ 
    //   messages: [...state.messages, data.message],
    //   isLoading: false
    // }));
  },
  
  addContextRef: (entity) => {
    if (get().contextRefs.some(e => e.id === entity.id)) return;
    set(state => ({ contextRefs: [...state.contextRefs, entity] }));
  },
  
  removeContextRef: (entityId) => {
    set(state => ({
      contextRefs: state.contextRefs.filter(e => e.id !== entityId)
    }));
  },
  
  clearContextRefs: () => {
    set({ contextRefs: [] });
  },
  
  clearMessages: () => {
    set({ 
      messages: [{
        id: 'system-1',
        text: 'Chat history cleared.',
        sender: 'system',
        timestamp: new Date().toISOString()
      }]
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
    clearContextRefs,
    clearMessages
  } = useChatStore();
  
  return {
    messages,
    contextRefs,
    isLoading,
    sendMessage,
    addContextRef,
    removeContextRef,
    clearContextRefs,
    clearMessages
  };
}; 