import React, { useState, useEffect, useRef } from 'react';
import EntityPanel from './EntityPanel';
import './EntityTabsBar.css';

// Icons
const NPCIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const FactionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ItemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);

const QuestIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const EventIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

type TabType = {
  id: string;
  label: string;
  type: string;
  icon: React.ReactNode;
};

// Define tabs
const TABS: TabType[] = [
  { id: 'npcs', label: 'NPCs', type: 'npc', icon: <NPCIcon /> },
  { id: 'locations', label: 'Locations', type: 'location', icon: <LocationIcon /> },
  { id: 'factions', label: 'Factions', type: 'faction', icon: <FactionIcon /> },
  { id: 'items', label: 'Items', type: 'item', icon: <ItemIcon /> },
  { id: 'quests', label: 'Quests', type: 'quest', icon: <QuestIcon /> },
  { id: 'events', label: 'Events', type: 'event', icon: <EventIcon /> },
];

// Interface for entity data
interface EntityData {
  id: string;
  name: string;
  description?: string;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

interface EntityTabsBarProps {
  onSelectTab?: (tabId: string) => void;
  allowSelection?: boolean;
  onExpand?: () => void;
  campaignId: string;
  onEntitySelect?: (entity: EntityData) => void;
}

// Default panel height in pixels - increased to ensure content visibility
const DEFAULT_PANEL_HEIGHT = 250;
// Minimum height the panel can be resized to - increased to prevent cut-off
const MIN_PANEL_HEIGHT = 150;
// Maximum height the panel can be resized to
const MAX_PANEL_HEIGHT = 500;
// Height of the tabs bar itself when not expanded
const TABS_BAR_HEIGHT = 50;

const EntityTabsBar: React.FC<EntityTabsBarProps> = ({ 
  onSelectTab = () => {}, 
  allowSelection = true,
  onExpand = () => {},
  campaignId,
  onEntitySelect = () => {}
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  
  // Load saved panel height from localStorage on component mount
  useEffect(() => {
    const savedHeight = localStorage.getItem('entityPanelHeight');
    if (savedHeight) {
      // Get viewport height to limit panel size
      const viewportHeight = window.innerHeight;
      const maxAllowedHeight = viewportHeight - 20; // Leave 20px buffer
      
      // Limit the saved height to viewport constraints
      const parsedHeight = parseInt(savedHeight, 10);
      const constrainedHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(maxAllowedHeight, parsedHeight));
      
      setPanelHeight(constrainedHeight);
    }
  }, []);
  
  // Handle tab click
  const handleTabClick = (index: number) => {
    if (allowSelection) {
      // If clicking on a different tab when expanded, switch tabs
      if (isExpanded && index !== activeTabIndex) {
        setActiveTabIndex(index);
        onSelectTab(TABS[index].id);
      } 
      // If clicking on the same tab when expanded, collapse
      else if (isExpanded && index === activeTabIndex) {
        setIsExpanded(false);
      } 
      // If not expanded, expand and set the tab
      else {
        setIsExpanded(true);
        setActiveTabIndex(index);
        onSelectTab(TABS[index].id);
        onExpand();
      }
    }
  };
  
  // Handle resize events with proper cleanup
  useEffect(() => {
    // Only set up listeners when actively resizing
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      // Get clientY from either mouse or touch event
      const clientY = 'touches' in e && e.touches.length > 0
        ? e.touches[0].clientY
        : (e as MouseEvent).clientY;
      
      // Calculate new height (invert delta since dragging up should increase height)
      const deltaY = startYRef.current - clientY;
      
      // Get viewport height to limit panel size
      const viewportHeight = window.innerHeight;
      // Small buffer to prevent overflow
      const maxAllowedHeight = viewportHeight - 10; // Small buffer to prevent overflow
      
      // Ensure minimum height is enough to show content
      const minPanelHeight = Math.max(MIN_PANEL_HEIGHT, 200);
      
      // Limit max height to viewport height or MAX_PANEL_HEIGHT, whichever is smaller
      const effectiveMaxHeight = Math.min(MAX_PANEL_HEIGHT, maxAllowedHeight);
      
      // Calculate new height with proper constraints
      const newHeight = Math.max(minPanelHeight, Math.min(effectiveMaxHeight, startHeightRef.current + deltaY));
      
      // Update height
      setPanelHeight(newHeight);
      
      // Update CSS variables directly - accounting for resize handle space
      if (barRef.current) {
        barRef.current.style.setProperty('--panel-height', `${newHeight}px`);
        // Set entity panel height explicitly, accounting for resize handle space
        barRef.current.style.setProperty('--entity-panel-height', `${newHeight - TABS_BAR_HEIGHT - 15}px`);
      }
    };
    
    const handleMouseUp = () => {
      // Save the current panel height to localStorage, not using the state variable 
      // which might be stale due to closure
      if (barRef.current) {
        const currentHeight = barRef.current.style.getPropertyValue('--panel-height');
        if (currentHeight) {
          // Extract the number from the CSS value (removing 'px')
          const heightValue = parseInt(currentHeight, 10);
          if (!isNaN(heightValue)) {
            localStorage.setItem('entityPanelHeight', heightValue.toString());
          }
        }
      }
      setIsResizing(false);
    };
    
    // Add global event listeners for both mouse and touch
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove as any, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    
    // Cleanup function to remove listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing]); // Only depend on isResizing to prevent re-registering on every height change
  
  // Handle start of resize action
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent any default behavior
    
    // Get client Y position from either mouse or touch event
    const clientY = 'touches' in e 
      ? e.touches[0].clientY 
      : (e as React.MouseEvent).clientY;
    
    startYRef.current = clientY;
    startHeightRef.current = panelHeight;
    setIsResizing(true);
  };
  
  // Get the current tab's entity type
  const currentEntityType = TABS[activeTabIndex].type;
  
  // Calculate dynamic styles - ensure the panel extends from bottom upward
  // Add extra height to account for the resize handle
  const expandedStyle = {
    height: `${panelHeight}px`,
    bottom: '0',
    left: '0',
    right: '0',
    // Ensure entity panel gets proper height, accounting for resize handle space
    '--entity-panel-height': `${panelHeight - TABS_BAR_HEIGHT - 15}px`
  };
  
  // Modify the handleWindowResize function to account for resize handle
  const handleWindowResize = () => {
    if (isExpanded) {
      // Adjust panel height if it's now larger than the viewport
      const viewportHeight = window.innerHeight;
      // Small buffer to prevent overflow
      const maxAllowedHeight = viewportHeight - 10;
      
      if (panelHeight > maxAllowedHeight) {
        setPanelHeight(maxAllowedHeight);
        
        // Update CSS variables - no transform needed with column-reverse layout
        if (barRef.current) {
          barRef.current.style.setProperty('--panel-height', `${maxAllowedHeight}px`);
          barRef.current.style.setProperty('--entity-panel-height', `${maxAllowedHeight - TABS_BAR_HEIGHT - 15}px`);
        }
      }
    }
  };
  
  // Add window resize handler to ensure panel stays within bounds when window is resized
  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isExpanded, panelHeight]);
  
  // Add a resize observer to adjust panel height based on content
  useEffect(() => {
    if (!isExpanded || !barRef.current) return;

    // Manually check if content is visible
    const checkContentVisible = () => {
      const entityLists = barRef.current?.querySelectorAll('.entity-list');
      if (entityLists && entityLists.length > 0) {
        const entityList = entityLists[0];
        const cards = entityList.querySelectorAll('.entity-card');
        
        // If we have cards, make sure they're all visible
        if (cards.length > 0) {
          // Get the last card
          const lastCard = cards[cards.length - 1];
          const listRect = entityList.getBoundingClientRect();
          const lastCardRect = lastCard.getBoundingClientRect();
          
          // Check if the last card is partially out of view
          if (lastCardRect.bottom > listRect.bottom) {
            // Need more height - add enough to see the last card plus padding
            const additionalHeightNeeded = lastCardRect.bottom - listRect.bottom + 40;
            setPanelHeight(prevHeight => Math.min(window.innerHeight - 10, prevHeight + additionalHeightNeeded));
            
            if (barRef.current) {
              const newHeight = Math.min(window.innerHeight - 10, panelHeight + additionalHeightNeeded);
              barRef.current.style.setProperty('--panel-height', `${newHeight}px`);
              barRef.current.style.setProperty('--entity-panel-height', `${newHeight - TABS_BAR_HEIGHT}px`);
            }
          }
        }
      }
    };
    
    // Call once after initial render
    setTimeout(checkContentVisible, 300);
    
    // Also set up a ResizeObserver to monitor size changes
    const resizeObserver = new ResizeObserver(() => {
      checkContentVisible();
    });
    
    // Observe the content container
    const entityPanel = barRef.current.querySelector('.entity-panel');
    if (entityPanel) {
      resizeObserver.observe(entityPanel);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [isExpanded, panelHeight]);
  
  return (
    <div 
      className={`entity-tabs-bar ${isExpanded ? 'expanded' : ''} ${isResizing ? 'resizing' : ''}`} 
      ref={barRef}
      style={isExpanded ? expandedStyle : undefined}
    >
      {/* Position the resize handle at the top of the expanded panel */}
      {isExpanded && (
        <div 
          className="resize-handle" 
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart} 
          title="Drag to resize panel"
          style={{ display: 'block', opacity: 1 }}
        >
          {/* Add a visible indicator line */}
          <span style={{ 
            display: 'block', 
            width: '30px', 
            height: '3px', 
            margin: '0 auto',
            backgroundColor: '#a0aec0',
            borderRadius: '2px'
          }}></span>
        </div>
      )}
      
      <div className="tabs-container">
        <div className="tabs" role="tablist">
          {TABS.map((tab, index) => {
            // Create two separate button elements based on active state
            return activeTabIndex === index ? (
              <button
                key={tab.id}
                className="tab active"
                onClick={() => handleTabClick(index)}
                aria-selected="true"
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
              >
                {tab.icon}
                <span className="tab-label">{tab.label}</span>
              </button>
            ) : (
              <button
                key={tab.id}
                className="tab"
                onClick={() => handleTabClick(index)}
                aria-selected="false"
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
              >
                {tab.icon}
                <span className="tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Show EntityPanel when expanded */}
      {isExpanded && (
        <EntityPanel 
          entityType={currentEntityType}
          campaignId={campaignId}
          onSelect={onEntitySelect}
        />
      )}
    </div>
  );
};

export default EntityTabsBar;  