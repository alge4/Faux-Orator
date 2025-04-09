import React, { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage } from '../hooks/useChat';
import { Entity } from '../hooks/useCampaign';
import './ChatInterface.css';

type ChatInterfaceProps = {
  availableEntities?: Entity[];
  onEntityClick?: (entityId: string) => void;
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  availableEntities = [],
  onEntityClick
}) => {
  const { messages, contextRefs, isLoading, sendMessage, addContextRef, removeContextRef } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };
  
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
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your AI assistant..."
          rows={1}
          className="chat-input"
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
      
      {availableEntities.length > 0 && (
        <div className="entities-drawer">
          <div className="entities-drawer-header">
            <h4>Available References</h4>
          </div>
          <div className="entities-list">
            {availableEntities.map(entity => (
              <div 
                key={entity.id}
                className="entity-item"
                onClick={() => addContextRef(entity)}
              >
                <span className={`entity-type ${entity.type.toLowerCase()}`}>
                  {entity.type}
                </span>
                <span className="entity-name">{entity.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// MessageBubble component to display a single message
const MessageBubble: React.FC<{ 
  message: ChatMessage; 
  onEntityClick?: (entityId: string) => void;
}> = ({ message, onEntityClick }) => {
  // Format markdown-style entity references as links
  const formatMessage = (text: string) => {
    // This is a simplified version - in a real app you'd use a markdown library
    // and properly parse entity references
    
    // Replace **Entity Name** with styled spans
    const formatted = text.replace(
      /\*\*(.*?)\*\*/g, 
      '<span class="entity-reference">$1</span>'
    );
    
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: formatted }} 
        className="message-text"
      />
    );
  };
  
  return (
    <div className={`message ${message.sender}-message ${message.referencedContent ? 'has-refs' : ''}`}>
      {formatMessage(message.text)}
      {message.sender === 'ai' && message.timestamp && (
        <div className="message-timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}; 