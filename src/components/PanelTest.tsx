import React, { useState } from 'react';
import PanelManager, { PanelInfo } from './PanelManager';

const PanelTest: React.FC = () => {
  const [panels, setPanels] = useState<PanelInfo[]>([
    {
      id: 'panel1',
      title: 'World Graph',
      content: <div className="demo-content">
        <h3>World Graph</h3>
        <p>Visualize connections between characters, locations, and plot elements.</p>
        <div className="graph-preview">
          <div className="graph-node">Elminster</div>
          <div className="graph-connector">↔</div>
          <div className="graph-node">Waterdeep</div>
          <div className="graph-connector">↔</div>
          <div className="graph-node">Lord's Alliance</div>
        </div>
        <div className="graph-preview" style={{ marginTop: "20px" }}>
          <div className="graph-node">Zhentarim</div>
          <div className="graph-connector">↔</div>
          <div className="graph-node">Black Network</div>
          <div className="graph-connector">↔</div>
          <div className="graph-node">Manshoon</div>
        </div>
        <div className="graph-preview" style={{ marginTop: "20px" }}>
          <div className="graph-node location">Neverwinter</div>
          <div className="graph-connector">→</div>
          <div className="graph-node event">Volcanic Eruption</div>
          <div className="graph-connector">→</div>
          <div className="graph-node faction">Lord Protector's Forces</div>
        </div>
        <div className="graph-preview" style={{ marginTop: "20px" }}>
          <div className="graph-node npc">Drizzt Do'Urden</div>
          <div className="graph-connector">↔</div>
          <div className="graph-node faction">Companions of the Hall</div>
          <div className="graph-connector">↔</div>
          <div className="graph-node location">Icewind Dale</div>
        </div>
      </div>,
      isVisible: true,
      gridX: 0,
      gridY: 0,
      gridWidth: 6,
      gridHeight: 8
    },
    {
      id: 'panel2',
      title: 'DM Assistant',
      content: <div className="demo-content">
        <h3>DM Assistant</h3>
        <p>Get help running your game with AI assistance. Plan sessions, generate NPCs, create encounters and more.</p>
        
        <div className="assistant-tabs">
          <div className="tab active">Chat</div>
          <div className="tab">Session Planner</div>
          <div className="tab">NPCs</div>
          <div className="tab">Encounters</div>
        </div>
        
        <div className="assistant-content">
          <div className="assistant-chat-view">
            <div className="assistant-preview">
              <div className="message user">Plan a session involving a stolen artifact from Waterdeep</div>
              <div className="message assistant">
                <strong>Session Outline: The Vanished Relic</strong>
                <h4>Setup</h4>
                <p>The Open Lord of Waterdeep has announced that a powerful artifact has been stolen from the Blackstaff Tower. The city is on high alert, and the party is approached to help investigate.</p>
                
                <h4>Key NPCs</h4>
                <ul>
                  <li><strong>Laeral Silverhand</strong> - Open Lord of Waterdeep, concerned about city stability</li>
                  <li><strong>Vajra Safahr</strong> - The Blackstaff, embarrassed about the breach</li>
                  <li><strong>Ferg Understone</strong> - Dwarven fence with information about the thief</li>
                </ul>
                
                <h4>Scene Progression</h4>
                <ol>
                  <li>Meeting with Waterdeep officials to learn about the theft</li>
                  <li>Investigation in the Dock Ward to find Ferg</li>
                  <li>Chase through the sewers after the thief's accomplice</li>
                  <li>Final confrontation in an abandoned temple</li>
                </ol>
                
                <h4>Possible Complications</h4>
                <ul>
                  <li>The Xanathar Guild is also looking for the artifact</li>
                  <li>The artifact is slowly corrupting its holder</li>
                  <li>City Watch suspects one of the players was involved</li>
                </ul>
              </div>
              
              <div className="message user">How would a dragon react to flattery?</div>
              <div className="message assistant">A dragon might be momentarily amused by flattery, but most ancient dragons are cunning enough to recognize manipulation. However, their vanity might make them susceptible to especially clever compliments about their specific achievements or unique qualities.</div>
              
              <div className="message user">Create a quick tavern encounter</div>
              <div className="message assistant">
                <strong>The Silver Tankard Tavern</strong>
                <p>As your players enter, they notice:</p>
                <ul>
                  <li>A dwarven bard telling exaggerated tales of adventure</li>
                  <li>Two hooded figures in the corner exchanging a small package</li>
                  <li>The innkeeper arguing with a merchant about a delivery</li>
                </ul>
                <p>A fight breaks out when a half-orc accuses one of the patrons of cheating at cards. Players can intervene or watch the chaos unfold.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="assistant-input">
          <textarea placeholder="Ask a question or request assistance..."></textarea>
          <button className="send-button">Send</button>
        </div>
      </div>,
      isVisible: true,
      gridX: 6,
      gridY: 0,
      gridWidth: 6,
      gridHeight: 8
    }
  ]);

  const handlePanelVisibilityChange = (id: string, isVisible: boolean) => {
    console.log(`Panel ${id} visibility changed to ${isVisible}`);
  };

  const handlePanelPositionChange = (id: string, x: number, y: number, width: number, height: number) => {
    console.log(`Panel ${id} position changed to x:${x}, y:${y}, width:${width}, height:${height}`);
    setPanels(prev => 
      prev.map(panel => 
        panel.id === id 
          ? { ...panel, gridX: x, gridY: y, gridWidth: width, gridHeight: height } 
          : panel
      )
    );
  };

  return (
    <div className="panel-test-container">
      <h1>Faux-Orator Panel System</h1>
      <p>Drag panel headers to move panels. Resize by dragging edges and corners.</p>
      <ul className="instructions">
        <li>Panels automatically snap to grid squares</li>
        <li>Each panel can occupy multiple grid cells</li>
        <li>Panels maintain rectangular shapes</li>
        <li>Smart collision detection prevents overlapping</li>
      </ul>
      <div className="panel-test-grid">
        <PanelManager 
          panels={panels} 
          onPanelVisibilityChange={handlePanelVisibilityChange}
          onPanelPositionChange={handlePanelPositionChange}
          gridCols={12}
          gridRows={8}
          cellSize={100}
          gap={8}
        />
      </div>
      <style jsx>{`
        .panel-test-container {
          padding: 20px;
          max-width: 1300px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        h1 {
          color: #1a365d;
          margin-bottom: 8px;
        }
        
        .instructions {
          margin-bottom: 20px;
          padding-left: 20px;
        }
        
        .instructions li {
          margin-bottom: 5px;
          color: #4a5568;
        }
        
        .panel-test-grid {
          height: 850px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background-color: #f5f5f5;
          margin-top: 20px;
        }
        
        .demo-content {
          padding: 10px;
          height: 100%;
          overflow: auto;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          color: #444;
        }
        
        .demo-content h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #2c5282;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }

        .assistant-tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 12px;
        }

        .tab {
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          font-weight: 500;
          color: #718096;
        }

        .tab.active {
          color: #3182ce;
          border-bottom-color: #3182ce;
        }

        .tab:hover:not(.active) {
          color: #4a5568;
          background-color: #f7fafc;
        }

        .assistant-content {
          flex: 1;
          overflow: auto;
          margin-bottom: 10px;
        }

        .assistant-input {
          display: flex;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
        }

        .assistant-input textarea {
          flex: 1;
          min-height: 40px;
          padding: 8px 12px;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          resize: none;
          font-family: inherit;
        }

        .send-button {
          margin-left: 8px;
          padding: 0 16px;
          background-color: #3182ce;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .send-button:hover {
          background-color: #2c5282;
        }
        
        .plan-preview, .graph-preview, .assistant-preview {
          background: rgba(0,0,0,0.03);
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }
        
        .plan-item {
          padding: 5px;
          margin-bottom: 5px;
          border-left: 3px solid #4299e1;
          padding-left: 10px;
          background: rgba(66, 153, 225, 0.1);
        }
        
        .graph-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .graph-node {
          background: #ebf8ff;
          border: 1px solid #bee3f8;
          padding: 5px 10px;
          border-radius: 20px;
          margin: 5px;
        }

        .graph-node.npc {
          background: #e9f5e9;
          border-color: #c6e5c6;
        }

        .graph-node.location {
          background: #fff5eb;
          border-color: #fed7aa;
        }

        .graph-node.faction {
          background: #edf2ff;
          border-color: #c3dafe;
        }

        .graph-node.event {
          background: #fae8e8;
          border-color: #fed7d7;
        }
        
        .graph-connector {
          color: #4299e1;
          font-size: 20px;
          margin: 0 5px;
        }
        
        .message {
          padding: 8px 12px;
          margin-bottom: 8px;
          border-radius: 8px;
        }
        
        .message.user {
          background: #ebf8ff;
          align-self: flex-end;
          margin-left: 20px;
        }
        
        .message.assistant {
          background: #e6fffa;
          align-self: flex-start;
          margin-right: 20px;
        }

        .message ul, .message ol {
          margin: 8px 0;
          padding-left: 20px;
        }

        .message p {
          margin: 6px 0;
        }

        .message strong {
          color: #2c5282;
        }

        .message h4 {
          margin: 12px 0 5px 0;
          color: #4a5568;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default PanelTest; 