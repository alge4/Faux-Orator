import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from '../MessageBubble';
import './ChatInterface.css';

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit - adjust as needed
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / (1024 * 1024); // For display purposes

interface AssistantChat {
  id: string;
  campaign_id: string;
  mode: 'planning' | 'running' | 'review';
  context: Record<string, any>;
  last_interaction: string;
}

interface Attachment {
  id: string;
  message_id: string;
  campaign_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  content_preview?: string;
  created_at: string;
}

interface Message {
  id: string;
  campaign_id: string;
  user_id: string;
  content: string;
  mode: 'planning' | 'running' | 'review';
  entities: Entity[];
  is_ai_response: boolean;
  assistant_chat_id?: string;
  has_attachments: boolean;
  attachments?: Attachment[];
  created_at: string;
}

interface ChatInterfaceProps {
  mode: 'planning' | 'running' | 'review';
  messages: Message[];
  onSendMessage: (message: string, files?: File[], assistantChatId?: string) => void;
  availableEntities: Entity[];
  isTyping: boolean;
  campaignId: string;
  userId: string;
  isAIAssistant?: boolean;
  assistantChat?: AssistantChat;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  mode,
  messages,
  onSendMessage,
  availableEntities,
  isTyping,
  campaignId,
  userId,
  isAIAssistant = false,
  assistantChat
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEntityList, setShowEntityList] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || attachments.length > 0) {
      onSendMessage(input, attachments.length > 0 ? attachments : undefined, assistantChat?.id);
      setInput('');
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    // Check for PDF files and warn the user
    const pdfFiles = files.filter(file => 
      file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );
    
    if (pdfFiles.length > 0) {
      alert('PDF support is temporarily disabled. Please use Word (.docx) or Markdown (.md) files instead.');
    }
    
    const validFiles = files.filter(file => {
      // Remove PDF from valid file types
      const isValidType = 
                         file.type === 'text/markdown' ||
                         file.name.endsWith('.md') ||
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         file.name.endsWith('.docx');
      const isValidSize = file.size <= MAX_FILE_SIZE;
      
      if (!isValidSize) {
        alert(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
      }
      
      return isValidType && isValidSize;
    });

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  // Filter messages to only show those relevant to the current assistant chat
  const filteredMessages = messages.filter(msg => 
    !isAIAssistant || 
    (isAIAssistant && msg.assistant_chat_id === assistantChat?.id)
  );

  return (
    <div 
      className={`chat-interface ${isAIAssistant ? 'ai-assistant' : ''} ${mode}-mode`}
      onDragEnter={handleDrag}
    >
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
        {filteredMessages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
            isCurrentUser={message.user_id === userId}
          />
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
        {dragActive && (
          <div 
            className="drag-overlay"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            Drop files here
          </div>
        )}
        
        {attachments.length > 0 && (
          <div className="attachment-preview">
            {attachments.map((file, index) => (
              <div key={index} className="attachment-item">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="remove-attachment"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            className="chat-input"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".md,.docx,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            className="file-input"
            id="file-input"
          />
          <label htmlFor="file-input" className="file-input-label">
            📎
          </label>
          <button
            type="submit"
            disabled={!input.trim() && attachments.length === 0}
            className="send-button"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface; 