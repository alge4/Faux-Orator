import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../hooks/useChat';
import { Entity } from '../hooks/useCampaign';
import { DMAssistantAgent } from '../ai-agents/DMAssistantAgent';
import './ChatInterface.css';

interface ChatInterfaceProps {
  availableEntities?: Entity[];
  onEntityClick?: (entity: Entity) => void;
  mode?: 'planning' | 'running' | 'review';
}

// MessageBubble subcomponent
const MessageBubble: React.FC<{
  message: any;
  onEntityClick?: (entity: Entity) => void;
}> = ({ message, onEntityClick }) => {
  const className = `message ${message.sender}-message`;
  
  // Function to render message content with entity references
  const renderContent = (content: string) => {
    if (!message.contextRefs?.length) {
      return <p>{content}</p>;
    }

    // Split content and highlight entity references
    const parts = content.split(/(\[\[.*?\]\])/g);
    return (
      <p>
        {parts.map((part, i) => {
          if (part.startsWith('[[') && part.endsWith(']]')) {
            const entityName = part.slice(2, -2);
            return (
              <span 
                key={i}
                className="entity-reference"
                onClick={() => {
                  const entity = message.entities?.find((e: Entity) => e.name === entityName);
                  if (entity && onEntityClick) {
                    onEntityClick(entity);
                  }
                }}
              >
                {entityName}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <div className={className}>
      {renderContent(message.text)}
      {message.timestamp && (
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  availableEntities = [], 
  onEntityClick,
  mode = 'running'
}) => {
  const { 
    messages, 
    sendMessage, 
    isLoading,
    contextRefs,
    addContextRef,
    removeContextRef 
  } = useChatStore();
  
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmAssistant = useRef<DMAssistantAgent | null>(null);

  // Initialize DM Assistant
  useEffect(() => {
    dmAssistant.current = new DMAssistantAgent({
      sessionId: Date.now().toString(), // You might want to pass this from props
      campaignId: 'current-campaign-id', // You might want to pass this from props
      userId: 'current-user-id', // You might want to pass this from props
      timestamp: new Date().toISOString()
    });
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !dmAssistant.current) return;

    const userMessage = input;
    setInput('');

    // Send message through chat store
    sendMessage(userMessage, contextRefs.map(ref => ref.id));

    try {
      // Get response from DM Assistant
      const response = await dmAssistant.current.process({
        type: mode,
        message: userMessage,
        context: {
          pinnedEntities: contextRefs,
          currentMode: mode,
          sessionHistory: messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }))
        }
      });

      if (response.success) {
        // Send AI response through chat store
        sendMessage(response.message, response.data?.context?.recentEntities?.map((e: any) => e.id) || []);
      } else {
        sendMessage("I apologize, but I encountered an error processing your request. Please try again.", []);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      sendMessage("I apologize, but something went wrong. Please try again.", []);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h3>Campaign Assistant</h3>
        {contextRefs.length > 0 && (
          <div className="context-badges">
            {contextRefs.map(entity => (
              <span 
                key={entity.id} 
                className="context-badge"
                title={`${entity.type}: ${entity.content.description?.substring(0, 50)}...`}
              >
                {entity.name}
                <button 
                  className="remove-context" 
                  onClick={() => removeContextRef(entity.id)}
                  aria-label={`Remove ${entity.name} from context`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="messages-container">
        {messages.map(message => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            onEntityClick={onEntityClick}
          />
        ))}
        {isLoading && (
          <div className="message ai-message">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your DM Assistant..."
          rows={1}
          aria-label="Chat input"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
}; 