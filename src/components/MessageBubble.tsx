import React from 'react';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    entities?: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  return (
    <div className="message-bubble">
      <div className="message-header">
        <span className="sender">{message.sender}</span>
        <span className="timestamp">{message.timestamp}</span>
      </div>
      <div className="message-content">
        {message.content.split(/(@[^\s]+)/).map((part, index) => {
          if (part.startsWith('@')) {
            const entityName = part.slice(1);
            const entity = message.entities?.find(e => e.name === entityName);
            return entity ? (
              <span key={index} className={`entity-reference ${entity.type.toLowerCase()}`}>
                {part}
              </span>
            ) : (
              part
            );
          }
          return part;
        })}
      </div>
    </div>
  );
};

export default MessageBubble; 