import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from '../MessageBubble';
import './ChatInterface.css';

interface ChatInterfaceProps {
  mode: 'planning' | 'running' | 'review';
  messages: any[];
  onSendMessage: (message: string) => void;
  availableEntities: Entity[];
  isTyping: boolean;
  campaignId?: string;
  userId?: string;
  isAIAssistant?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  mode,
  messages,
  onSendMessage,
  availableEntities,
  isTyping,
  campaignId,
  userId,
  isAIAssistant = false
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEntityList, setShowEntityList] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'planning':
        return 'Campaign Planning';
      case 'running':
        return 'Active Session';
      case 'review':
        return 'Session Review';
      default:
        return 'Chat';
    }
  };

  return (
    <div className={`chat-interface ${isAIAssistant ? 'ai-assistant' : ''} ${mode}-mode`}>
      <div className="chat-header">
        <h2>{getModeTitle()}</h2>
        {availableEntities && (
          <button
            className="entity-toggle"
            onClick={() => setShowEntityList(!showEntityList)}
            aria-label="Toggle entity list"
          >
            {showEntityList ? 'Hide Entities' : 'Show Entities'}
          </button>
        )}
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isTyping && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showEntityList && availableEntities && (
        <div className="entity-list">
          <h3>Available Entities</h3>
          <div className="entity-grid">
            {availableEntities.map((entity) => (
              <button
                key={entity.id}
                className={`entity-chip ${entity.type.toLowerCase()}`}
                onClick={() => {
                  setInput((prev) => `${prev}@${entity.name} `);
                }}
              >
                {entity.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          rows={1}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="send-button"
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface; 