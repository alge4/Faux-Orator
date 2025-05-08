import React, { useRef, useState, useEffect } from 'react';
import { Entity, EntityRelationshipDisplay } from '../types/entities';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import './NetworkView.css';

// Define a type for our stylesheet that isn't tied to cytoscape's complex type system
type StylesheetElement = {
  selector: string;
  style: Record<string, string | number | boolean>;
};

// Let's simplify and not fight TypeScript - remove the StyleSheet custom type entirely
interface NetworkViewProps {
  entities?: Entity[];
  relationships?: EntityRelationshipDisplay[];
  onEntitySelect?: (entityId: string) => void;
}

const NetworkView: React.FC<NetworkViewProps> = ({ 
  entities = [],
  relationships = [],
  onEntitySelect
}) => {
  // Add debugging statement
  console.log('NetworkView received entities:', entities.length, entities);
  console.log('NetworkView received relationships:', relationships.length, relationships);
  
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [showEmptyState, setShowEmptyState] = useState(true);

  // Update the network when entities or relationships change
  useEffect(() => {
    console.log('NetworkView: entities/relationships dependencies changed');
    console.log('NetworkView: entities length:', entities?.length);
    console.log('NetworkView: relationships length:', relationships?.length);
    
    // Determine if we should show the empty state
    if (!entities || entities.length === 0) {
      console.log('NetworkView: No entities available, showing empty state');
      setShowEmptyState(true);
      return;
    }
    
    // If we have entities, don't show the empty state
    setShowEmptyState(false);
    
    // Process entities and relationships to create the graph
    const graphElements: cytoscape.ElementDefinition[] = [];
    
    console.log('NetworkView: Processing entities for graph...');
    // Add nodes for entities
    entities.forEach(entity => {
      console.log(`NetworkView: Adding entity node: ${entity.id} (${entity.name})`);
      graphElements.push({
        data: {
          id: entity.id,
          label: entity.name,
          type: entity.type,
          nodeType: 'entity'
        }
      });
    });
    
    // No longer adding a campaign node or connecting entities to it
    
    // Add edges for relationships
    if (relationships && relationships.length > 0) {
      console.log('NetworkView: Processing relationships for graph...');
      relationships.forEach(rel => {
        console.log(`NetworkView: Adding relationship edge: ${rel.id} (${rel.source.name} → ${rel.target.name})`);
        graphElements.push({
          data: {
            id: rel.id,
            source: rel.source.id,
            target: rel.target.id,
            label: rel.relationship_type,
            edgeType: 'relationship',
            strength: rel.strength,
            bidirectional: rel.bidirectional
          }
        });
      });
    }
    
    console.log('NetworkView: Generating network elements with:', {
      entityCount: entities.length,
      relationshipCount: relationships.length
    });
    
    // Set the elements state to update the graph
    setElements(graphElements);
    
    console.log('NetworkView: Generated network elements:', {
      nodeCount: graphElements.filter(el => !el.data.source).length,
      edgeCount: graphElements.filter(el => !!el.data.source).length
    });
  }, [entities, relationships]);

  // Cytoscape style with our custom type
  const cytoscapeStyle: StylesheetElement[] = [
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
    // Styles for each entity type
    {
      selector: 'node[type="npc"]',
      style: {
        'background-color': '#e74c3c'
      }
    },
    {
      selector: 'node[type="location"]',
      style: {
        'background-color': '#3498db'
      }
    },
    {
      selector: 'node[type="faction"]',
      style: {
        'background-color': '#2ecc71'
      }
    },
    {
      selector: 'node[type="item"]',
      style: {
        'background-color': '#f39c12'
      }
    },
    // Edge styles
    {
      selector: 'edge[bidirectional=true]',
      style: {
        'target-arrow-shape': 'triangle',
        'source-arrow-shape': 'triangle'
      }
    },
    {
      selector: 'edge[bidirectional=false]',
      style: {
        'target-arrow-shape': 'triangle'
      }
    }
  ];

  // Handle node tap/click
  const handleNodeTap = (event: cytoscape.EventObject) => {
    const node = event.target;
    if (onEntitySelect) {
      onEntitySelect(node.id());
    }
  };
  
  // Set up Cytoscape instance when it's mounted
  const handleCytoscapeCreated = (cy: cytoscape.Core) => {
    cyRef.current = cy;
    
    // Set up event handlers
    cy.on('tap', 'node', handleNodeTap);
    
    // Set up layout
    cy.layout({ name: 'cose' }).run();
  };

  return (
    <div className="network-view">
      {showEmptyState ? (
        <div className="network-empty-state">
          <p>Create your first entity to start building your campaign's network graph.</p>
        </div>
      ) : (
        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%' }}
          stylesheet={cytoscapeStyle}
          layout={{ name: 'cose', fit: true }}
          cy={handleCytoscapeCreated}
        />
      )}
    </div>
  );
};

export default NetworkView; 