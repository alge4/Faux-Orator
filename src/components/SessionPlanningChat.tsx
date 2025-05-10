import React, { useState, useEffect, useRef } from 'react';
import { 
  ChatSuggestion, 
  EntityReference, 
  SessionPlan 
} from '../types/sessionPlanning';
import { sessionPlanningService } from '../services/SessionPlanningService';
import { PlanningAgent } from '../ai-agents/PlanningAgent';
import { v4 as uuidv4 } from 'uuid';
import './SessionPlanningChat.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: ChatSuggestion[];
}

interface SessionPlanningChatProps {
  campaignId: string;
  userId: string;
  compact?: boolean;
}

const SessionPlanningChat: React.FC<SessionPlanningChatProps> = ({ 
  campaignId, 
  userId,
  compact = false 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pinnedEntities, setPinnedEntities] = useState<EntityReference[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const planningAgent = useRef<PlanningAgent | null>(null);

  // Initialize planning context and agent
  useEffect(() => {
    const initPlanning = async () => {
      try {
        // Initialize session planning context
        const newSessionId = await sessionPlanningService.initPlanningContext(campaignId);
        setSessionId(newSessionId);
        
        // Initialize planning agent
        planningAgent.current = new PlanningAgent({
          sessionId: newSessionId,
          campaignId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        // Add welcome message
        const welcomeMessage = compact 
          ? 'What would you like to plan for your session?'
          : 'Welcome to Session Planning! I can help you design your next D&D session. What would you like to plan today?';
        
        setMessages([
          {
            id: uuidv4(),
            role: 'assistant',
            content: welcomeMessage,
            timestamp: new Date().toISOString(),
            suggestions: [
              {
                type: 'encounter',
                content: 'Create a new session plan',
                relatedEntities: []
              },
              {
                type: 'npc_interaction',
                content: 'Suggest NPCs for my next session',
                relatedEntities: []
              }
            ]
          }
        ]);
      } catch (error) {
        console.error("Error initializing planning session:", error);
        setMessages([
          {
            id: uuidv4(),
            role: 'assistant',
            content: 'Sorry, there was an error initializing the planning session. Please try again.',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    };
    
    if (campaignId && userId) {
      initPlanning();
    }
  }, [campaignId, userId, compact]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Check if the planning agent and session ID are initialized
      if (!sessionId || !planningAgent.current) {
        throw new Error("Planning session not initialized properly");
      }
      
      // Process the message with planning agent
      let response;
      try {
        response = await planningAgent.current.process({
          type: 'session',
          details: {
            prompt: input,
            campaignId
          }
        });
      } catch (agentError) {
        console.error("Error in planning agent:", agentError);
        throw new Error("Failed to process your request. The planning agent encountered an error.");
      }
      
      // Generate suggestions
      let suggestions: ChatSuggestion[] = [];
      try {
        suggestions = await sessionPlanningService.getSuggestions(
          sessionId, 
          input
        );
      } catch (suggestionsError) {
        console.error("Error getting suggestions:", suggestionsError);
        // Continue without suggestions rather than failing completely
      }
      
      // If planning generated a session plan, update it
      if (response.data && 'objectives' in response.data) {
        setSessionPlan(response.data as SessionPlan);
      }
      
      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        suggestions
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message with helpful information
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: error instanceof Error 
          ? `Sorry, I encountered an error: ${error.message}` 
          : 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        suggestions: [{
          type: "encounter",
          content: "Try asking a simpler question about your campaign.",
          relatedEntities: []
        }]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Pin an entity to the context
  const handlePinEntity = async (entity: EntityReference) => {
    if (!sessionId || !planningAgent.current) return;
    
    // Pin entity in planning service
    sessionPlanningService.pinEntity(sessionId, entity.id);
    
    // Also pin in agent for persistence
    await planningAgent.current.pinEntity(entity.id);
    
    // Update UI
    setPinnedEntities(prev => [...prev, entity]);
  };

  // Add a filter to the context
  const handleAddFilter = async (filter: string) => {
    if (!sessionId || !planningAgent.current) return;
    
    // Add filter in planning service
    sessionPlanningService.addFilter(sessionId, filter);
    
    // Also add in agent for persistence
    await planningAgent.current.addFilter(filter);
    
    // Update UI
    setActiveFilters(prev => [...prev, filter]);
  };

  // Render suggestions as clickable chips
  const renderSuggestions = (suggestions?: ChatSuggestion[]) => {
    if (!suggestions || suggestions.length === 0) return null;
    
    return (
      <div className="suggestions-container">
        {suggestions.map((suggestion, index) => (
          <div 
            key={index} 
            className="suggestion-chip"
            onClick={() => setInput(suggestion.content)}
          >
            {suggestion.content.length > 50 
              ? `${suggestion.content.substring(0, 50)}...` 
              : suggestion.content}
          </div>
        ))}
      </div>
    );
  };

  // Render chat messages
  const renderMessages = () => {
    return messages.map(message => (
      <div 
        key={message.id} 
        className={`message-container ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
      >
        <div className="message-header">
          <span className="message-role">{message.role === 'user' ? 'You' : 'Assistant'}</span>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="message-content">{message.content}</div>
        {renderSuggestions(message.suggestions)}
      </div>
    ));
  };

  // Render pinned entities
  const renderPinnedEntities = () => {
    if (pinnedEntities.length === 0) {
      return <div className="empty-pinned">No pinned entities</div>;
    }
    
    return pinnedEntities.map(entity => (
      <div key={entity.id} className="pinned-entity">
        <span className="entity-type">{entity.type}</span>
        <span className="entity-name">{entity.name}</span>
        <button 
          className="unpin-button"
          onClick={() => {
            if (sessionId) {
              sessionPlanningService.unpinEntity(sessionId, entity.id);
              setPinnedEntities(prev => prev.filter(e => e.id !== entity.id));
            }
          }}
        >
          Unpin
        </button>
      </div>
    ));
  };

  // Render active filters
  const renderActiveFilters = () => {
    if (activeFilters.length === 0) {
      return <div className="empty-filters">No active filters</div>;
    }
    
    return activeFilters.map((filter, index) => (
      <div key={index} className="active-filter">
        <span className="filter-name">{filter}</span>
        <button 
          className="remove-filter-button"
          onClick={() => {
            if (sessionId) {
              sessionPlanningService.removeFilter(sessionId, filter);
              setActiveFilters(prev => prev.filter(f => f !== filter));
            }
          }}
        >
          Remove
        </button>
      </div>
    ));
  };

  return (
    <div className={`session-planning-container ${compact ? 'compact-mode' : ''}`}>
      {/* Left Column - Chat Panel */}
      <div className="chat-panel">
        <div className="messages-container">
          {renderMessages()}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your planning question or idea..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading}
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
        
        <div className="quick-buttons">
          <button onClick={() => setInput('Create a new session plan for')}>
            Create Session
          </button>
          <button onClick={() => setInput('Suggest an encounter with')}>
            Encounter
          </button>
          {!compact && (
            <button onClick={() => setInput('How would this NPC react to')}>
              NPC Reaction
            </button>
          )}
        </div>
      </div>
      
      {/* Only show these panels if not in compact mode */}
      {!compact && (
        <>
          {/* Center Column - Session Plan Preview */}
          <div className="session-plan-preview">
            <h3>Session Plan</h3>
            {sessionPlan ? (
              <div className="plan-details">
                <h4>{sessionPlan.title}</h4>
                <div className="plan-summary">{sessionPlan.summary}</div>
                
                <h5>Objectives</h5>
                <ul className="objectives-list">
                  {sessionPlan.objectives.map((objective, index) => (
                    <li key={index}>{objective}</li>
                  ))}
                </ul>
                
                <h5>Story Beats</h5>
                <div className="story-beats">
                  {sessionPlan.storyBeats.map(beat => (
                    <div key={beat.id} className={`story-beat ${beat.type}`}>
                      <div className="beat-type">{beat.type}</div>
                      <div className="beat-description">{beat.description}</div>
                      <div className="beat-duration">{beat.expectedDuration} min</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-plan">
                No session plan yet. Start chatting to create one!
              </div>
            )}
          </div>
          
          {/* Right Column - Context Panel */}
          <div className="context-panel">
            <div className="pinned-entities-section">
              <h4>Pinned Entities</h4>
              {renderPinnedEntities()}
            </div>
            
            <div className="active-filters-section">
              <h4>Active Filters</h4>
              {renderActiveFilters()}
              <input
                type="text"
                placeholder="Add a filter..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    handleAddFilter(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SessionPlanningChat; 