import React, { useRef, useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Entity, EntityRelationshipDisplay } from '../types/entities';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import './NetworkView.css';

// Error boundary to catch errors in the Cytoscape component
class CytoscapeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CytoscapeErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Define a type for our stylesheet
type StylesheetElement = {
  selector: string;
  style: Record<string, string | number | boolean>;
};

interface NetworkViewProps {
  entities?: Entity[];
  relationships?: EntityRelationshipDisplay[];
  onEntitySelect?: (entityId: string) => void;
}

type ViewMode = 'graph' | 'list';

const NetworkView: React.FC<NetworkViewProps> = ({ 
  entities = [],
  relationships = [],
  onEntitySelect
}) => {
  console.log('NetworkView received entities:', entities.length);
  console.log('NetworkView received relationships:', relationships.length);
  
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]);
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const cyRef = useRef<cytoscape.Core | null>(null);

  // Create elements for Cytoscape
  useEffect(() => {
    try {
      if (!entities || entities.length === 0) {
        setShowEmptyState(true);
        setElements([]);
        return;
      }

      setShowEmptyState(false);
      
      // Build graph elements
      const graphElements: cytoscape.ElementDefinition[] = [];
      
      // Add nodes
      const validEntities = entities.filter(e => e && e.id && e.name);
      validEntities.forEach(entity => {
        graphElements.push({
          data: {
            id: entity.id,
            label: entity.name,
            type: entity.type,
            nodeType: 'entity'
          }
        });
      });
      
      // Add edges
      if (relationships && relationships.length > 0) {
        const validRelationships = relationships.filter(
          r => r && r.id && r.source && r.source.id && r.target && r.target.id
        );
        
        validRelationships.forEach(rel => {
          // Make sure both source and target entities exist
          const sourceExists = validEntities.some(e => e.id === rel.source.id);
          const targetExists = validEntities.some(e => e.id === rel.target.id);
          
          if (sourceExists && targetExists) {
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
          }
        });
      }
      
      setElements(graphElements);
    } catch (error) {
      console.error('Error creating network elements:', error);
      setHasError(true);
    }
  }, [entities, relationships]);

  // Force layout recalculation when elements change or component mounts
  useEffect(() => {
    if (cyRef.current && elements.length > 0 && viewMode === 'graph') {
      // First immediate layout calculation
      try {
        console.log('NetworkView: Initial layout calculation');
        cyRef.current.layout({ 
          name: 'cose',
          animate: true,
          nodeDimensionsIncludeLabels: true,
          randomize: true,
          componentSpacing: 100,
          nodeRepulsion: function(node: any) { return 2048; },
          idealEdgeLength: function(edge: any) { return 128; }
        }).run();
      } catch (err) {
        console.error('Error in initial layout:', err);
      }
      
      // Second delayed layout to ensure container sizes are set
      setTimeout(() => {
        if (cyRef.current) {
          console.log('NetworkView: Delayed layout recalculation');
          try {
            // Check if the container has dimensions
            const container = cyRef.current.container();
            if (container) {
              const width = container.clientWidth;
              const height = container.clientHeight;
              console.log(`NetworkView: Container size: ${width}x${height}`);
              
              if (width > 0 && height > 0) {
                cyRef.current.layout({ 
                  name: 'cose',
                  animate: true,
                  nodeDimensionsIncludeLabels: true,
                  randomize: true,
                  componentSpacing: 100,
                  nodeRepulsion: function(node: any) { return 2048; },
                  idealEdgeLength: function(edge: any) { return 128; }
                }).run();
                
                // Force a fit to the viewport
                cyRef.current.fit();
              } else {
                console.warn('NetworkView: Container has zero dimensions, graph may not display correctly');
              }
            }
          } catch (err) {
            console.error('Error in delayed layout:', err);
          }
        }
      }, 300); // Longer delay to ensure DOM is fully rendered
    }
  }, [elements.length, viewMode]);

  // Define styles
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

  // Safe handle for node selection
  const safeHandleNodeTap = (evt: cytoscape.EventObject) => {
    try {
      if (onEntitySelect && evt.target && evt.target.id) {
        onEntitySelect(evt.target.id());
      }
    } catch (error) {
      console.error('Error handling node tap:', error);
    }
  };

  // Safe initialize cytoscape
  const safeInitializeCytoscape = (cy: cytoscape.Core) => {
    try {
      // Store the reference
      cyRef.current = cy;
      
      // Set up event handlers
      cy.on('tap', 'node', safeHandleNodeTap);
      
      // Run layout
      cy.layout({ 
        name: 'cose',
        animate: true,
        nodeDimensionsIncludeLabels: true,
        randomize: true,
        componentSpacing: 100,
        nodeRepulsion: function(node: any) { return 2048; },
        idealEdgeLength: function(edge: any) { return 128; }
      }).run();
    } catch (error) {
      console.error('Error initializing cytoscape:', error);
      setHasError(true);
    }
  };

  // Toggle between graph and list view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'graph' ? 'list' : 'graph');
  };

  // Handle entity selection from list view
  const handleEntityClick = (entityId: string) => {
    if (onEntitySelect) {
      onEntitySelect(entityId);
    }
  };

  // Error fallback UI
  const errorFallback = (
    <div className="network-error">
      <p>There was an error loading the network graph. Please try refreshing the page or use the list view.</p>
    </div>
  );

  // Empty state UI
  if (showEmptyState) {
    return (
      <div className="network-view">
        <div className="network-empty-state">
          <p>Create your first entity to start building your campaign's network graph.</p>
        </div>
      </div>
    );
  }

  // List view of entities
  const renderListView = () => {
    return (
      <div className="network-list-view">
        <div className="entity-section">
          <h3>Entities</h3>
          <div className="entity-list">
            {entities.map(entity => (
              <div 
                key={entity.id} 
                className={`entity-item entity-${entity.type}`}
                onClick={() => handleEntityClick(entity.id)}
              >
                <div className="entity-icon"></div>
                <div className="entity-name">{entity.name}</div>
                <div className="entity-type">{entity.type}</div>
              </div>
            ))}
          </div>
        </div>
        
        {relationships && relationships.length > 0 && (
          <div className="relationship-section">
            <h3>Relationships</h3>
            <div className="relationship-list">
              {relationships.map(rel => (
                <div key={rel.id} className="relationship-item">
                  <span className={`entity-badge entity-${rel.source.type}`}>{rel.source.name}</span>
                  <span className="relationship-type">
                    {rel.bidirectional ? '⟷' : '→'} {rel.relationship_type}
                  </span>
                  <span className={`entity-badge entity-${rel.target.type}`}>{rel.target.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Graph view with error boundary
  const renderGraphView = () => {
    return (
      <CytoscapeErrorBoundary fallback={errorFallback}>
        {elements.length > 0 && (
          <CytoscapeComponent
            elements={elements}
            style={{ width: '100%', height: '100%' }}
            stylesheet={cytoscapeStyle}
            layout={{ name: 'cose', fit: true }}
            cy={safeInitializeCytoscape}
          />
        )}
      </CytoscapeErrorBoundary>
    );
  };

  // If there's an error in the graph view, default to list view
  if (hasError && viewMode === 'graph') {
    setViewMode('list');
  }

  return (
    <div className="network-view">
      <div className="network-view-controls">
        <button 
          onClick={toggleViewMode}
          className={`view-toggle-button ${viewMode}`}
        >
          {viewMode === 'graph' ? 'Switch to List View' : 'Switch to Graph View'}
        </button>
      </div>
      
      {viewMode === 'graph' ? renderGraphView() : renderListView()}
    </div>
  );
};

export default NetworkView; 