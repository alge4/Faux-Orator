import React, { useRef, useEffect, useState } from 'react';
import { Entity } from '../hooks/useCampaign';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import './NetworkView.css';

interface NetworkViewProps {
  currentCampaign?: any;
  entities?: Entity[];
  onEntitySelect?: (entityId: string) => void;
}

const NetworkView: React.FC<NetworkViewProps> = ({ 
  currentCampaign, 
  entities = [],
  onEntitySelect
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const cyRef = useRef<cytoscape.Core | null>(null);
  
  // Define colors for different entity types
  const entityColors: Record<string, string> = {
    npc: '#4CAF50',      // Green
    location: '#2196F3',  // Blue
    faction: '#FFC107',   // Amber
    item: '#9C27B0',      // Purple
    quest: '#F44336',     // Red
    event: '#FF9800'      // Orange
  };
  
  // Generate elements for Cytoscape
  const generateElements = () => {
    if (!currentCampaign) return { nodes: [], edges: [] };
    
    const nodes: any[] = [
      // Campaign node
      {
        data: { 
          id: 'campaign', 
          label: currentCampaign.name || 'Campaign',
          type: 'campaign'
        }
      }
    ];
    
    const edges: any[] = [];
    
    // Add entity nodes and their connections to the campaign
    entities.forEach(entity => {
      nodes.push({
        data: {
          id: entity.id,
          label: entity.name,
          type: entity.type,
          description: entity.content.description || '',
        }
      });
      
      // Connect entity to campaign
      edges.push({
        data: {
          id: `campaign-${entity.id}`,
          source: 'campaign',
          target: entity.id,
          type: entity.type
        }
      });
    });
    
    // Add some connections between entities for demonstration
    // In a real app, these would be based on actual relationships
    if (entities.length > 1) {
      const npcs = entities.filter(e => e.type === 'npc');
      const locations = entities.filter(e => e.type === 'location');
      
      // Connect NPCs to locations
      npcs.forEach(npc => {
        if (locations.length > 0) {
          const location = locations[Math.floor(Math.random() * locations.length)];
          edges.push({
            data: {
              id: `${npc.id}-${location.id}`,
              source: npc.id,
              target: location.id,
              type: 'located_at'
            }
          });
        }
      });
      
      // Connect NPCs to other NPCs
      if (npcs.length > 1) {
        for (let i = 0; i < npcs.length - 1; i++) {
          edges.push({
            data: {
              id: `${npcs[i].id}-${npcs[i+1].id}`,
              source: npcs[i].id,
              target: npcs[i+1].id,
              type: 'knows'
            }
          });
        }
      }
    }
    
    return { nodes, edges };
  };
  
  const elements = generateElements();
  
  // Cytoscape style
  const cytoscapeStyle: cytoscape.Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        'label': 'data(label)',
        'color': '#fff',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-outline-width': 2,
        'text-outline-color': '#555',
        'font-size': '12px',
        'width': 40,
        'height': 40
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#ddd',
        'curve-style': 'bezier'
      }
    },
    {
      selector: 'node[type="campaign"]',
      style: {
        'background-color': '#333',
        'width': 60,
        'height': 60,
        'font-weight': 'bold',
        'font-size': '14px'
      }
    },
    // Styles for each entity type
    {
      selector: 'node[type="npc"]',
      style: {
        'background-color': entityColors.npc
      }
    },
    {
      selector: 'node[type="location"]',
      style: {
        'background-color': entityColors.location
      }
    },
    {
      selector: 'node[type="faction"]',
      style: {
        'background-color': entityColors.faction
      }
    },
    {
      selector: 'node[type="item"]',
      style: {
        'background-color': entityColors.item
      }
    },
    {
      selector: 'node[type="quest"]',
      style: {
        'background-color': entityColors.quest
      }
    },
    {
      selector: 'node[type="event"]',
      style: {
        'background-color': entityColors.event
      }
    },
    // Edge type styles
    {
      selector: 'edge[type="located_at"]',
      style: {
        'line-color': '#2196F3',
        'line-style': 'dashed'
      }
    },
    {
      selector: 'edge[type="knows"]',
      style: {
        'line-color': '#4CAF50'
      }
    }
  ];
  
  // Layout options
  const layoutOptions = {
    name: 'concentric',
    fit: true,
    padding: 50,
    startAngle: 3/2 * Math.PI,
    minNodeSpacing: 80,
    concentric: function(node: any) {
      return node.data('type') === 'campaign' ? 2 : 1;
    },
    levelWidth: function() { return 1; }
  };
  
  // Handle zoom in/out
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.1);
      setZoomLevel(cyRef.current.zoom());
    }
  };
  
  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.9);
      setZoomLevel(cyRef.current.zoom());
    }
  };
  
  // Handle Cytoscape reference
  const setCytoRef = (cy: cytoscape.Core) => {
    cyRef.current = cy;
    
    // Initial layout
    cy.layout(layoutOptions as any).run();
    
    // Set initial zoom level
    setZoomLevel(cy.zoom());
    
    // Create a div for tooltips
    let tooltipEl: HTMLDivElement | null = null;
    
    // Add events for node interaction
    cy.on('mouseover', 'node', function(evt) {
      const node = evt.target;
      node.addClass('hover');
      
      // Create tooltip
      if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'cy-tooltip';
        document.body.appendChild(tooltipEl);
      }
      
      // Set tooltip content based on node type
      let tooltipContent = '';
      if (node.data('type') === 'campaign') {
        tooltipContent = `<strong>${node.data('label')}</strong>`;
      } else {
        tooltipContent = `
          <strong>${node.data('label')}</strong><br/>
          <em>${node.data('type')}</em><br/>
          ${node.data('description') ? node.data('description').substring(0, 100) + '...' : 'No description'}
        `;
      }
      
      tooltipEl.innerHTML = tooltipContent;
      
      // Position tooltip near node
      const pos = node.renderedPosition();
      const container = cy.container();
      
      if (container) {
        const rect = container.getBoundingClientRect();
        tooltipEl.style.left = `${rect.left + pos.x + 15}px`;
        tooltipEl.style.top = `${rect.top + pos.y - 15}px`;
        tooltipEl.style.display = 'block';
      }
    });
    
    cy.on('mouseout', 'node', function() {
      // Remove hover class
      cy.nodes().removeClass('hover');
      
      // Hide tooltip
      if (tooltipEl) {
        tooltipEl.style.display = 'none';
      }
    });
    
    // Handle tap/click on nodes
    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      console.log('Selected node:', node.data());
      
      // Add visual feedback for selection
      cy.elements().removeClass('selected');
      node.addClass('selected');
      
      // Call onEntitySelect callback if provided
      if (onEntitySelect && node.id() !== 'campaign') {
        onEntitySelect(node.id());
      }
    });
    
    // Clean up tooltip when component unmounts
    return () => {
      if (tooltipEl && tooltipEl.parentNode) {
        tooltipEl.parentNode.removeChild(tooltipEl);
      }
    };
  };
  
  return (
    <div className="network-view">
      <div className="network-header">
        <h2>World Graph</h2>
        <div className="network-controls">
          <button onClick={handleZoomOut} aria-label="Zoom out">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={handleZoomIn} aria-label="Zoom in">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
        </div>
      </div>
      
      {!currentCampaign ? (
        <div className="no-campaign-message">
          <p>Select a campaign to view its network</p>
        </div>
      ) : entities.length === 0 ? (
        <div className="no-entities-message">
          <p>Create your first entity to start building your campaign's network graph</p>
        </div>
      ) : (
        <div className="network-graph-container">
          <CytoscapeComponent
            elements={[...elements.nodes, ...elements.edges]}
            style={{ width: '100%', height: '100%' }}
            stylesheet={cytoscapeStyle}
            cy={setCytoRef}
          />
          
          <div className="network-legend">
            <div className="legend-title">Entity Types</div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#4CAF50' }}></span>
              <span className="legend-label">NPC</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#2196F3' }}></span>
              <span className="legend-label">Location</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#FFC107' }}></span>
              <span className="legend-label">Faction</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#9C27B0' }}></span>
              <span className="legend-label">Item</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#F44336' }}></span>
              <span className="legend-label">Quest</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#FF9800' }}></span>
              <span className="legend-label">Event</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkView; 