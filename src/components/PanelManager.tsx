import React, { useState, useCallback, useEffect } from 'react';
import Panel, { PanelProps } from './Panel';
import './Panel.css';
import './PanelManager.css';

export interface PanelInfo extends Omit<PanelProps, 'children' | 'onMinimize' | 'onGridPositionChange'> {
  content: React.ReactNode;
  isVisible: boolean;
  gridX?: number;
  gridY?: number;
  gridWidth?: number;
  gridHeight?: number;
}

interface GridItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PanelManagerProps {
  panels: PanelInfo[];
  onPanelVisibilityChange?: (panelId: string, isVisible: boolean) => void;
  onPanelPositionChange?: (panelId: string, x: number, y: number, width: number, height: number) => void;
  gridCols?: number;
  gridRows?: number;
  cellSize?: number;
  gap?: number;
  spacing?: number;
  snapToGrid?: boolean;
}

const PanelManager: React.FC<PanelManagerProps> = ({
  panels: initialPanels,
  onPanelVisibilityChange,
  onPanelPositionChange,
  gridCols = 12,
  gridRows = 12,
  cellSize = 100,
  gap = 8,
  spacing = 1,
  snapToGrid = true
}) => {
  const [panels, setPanels] = useState<PanelInfo[]>(initialPanels);
  const [minimizedPanels, setMinimizedPanels] = useState<string[]>([]);
  const [layout, setLayout] = useState<GridItem[]>([]);

  // Initialize layout from initial panels
  useEffect(() => {
    const initialLayout = initialPanels.map(panel => ({
      id: panel.id,
      x: panel.gridX || 0,
      y: panel.gridY || 0,
      width: panel.gridWidth || 2,
      height: panel.gridHeight || 2
    }));
    setLayout(initialLayout);
  }, [initialPanels]);

  const handleMinimize = useCallback((id: string) => {
    setMinimizedPanels(prev => [...prev, id]);
    if (onPanelVisibilityChange) {
      onPanelVisibilityChange(id, false);
    }
  }, [onPanelVisibilityChange]);

  const handleRestore = useCallback((id: string) => {
    setMinimizedPanels(prev => prev.filter(panelId => panelId !== id));
    if (onPanelVisibilityChange) {
      onPanelVisibilityChange(id, true);
    }
  }, [onPanelVisibilityChange]);

  // Check if a cell is occupied by any panel
  const isCellOccupied = useCallback((x: number, y: number, panelId: string) => {
    return layout
      .filter(item => item.id !== panelId && !minimizedPanels.includes(item.id))
      .some(item => 
        x >= item.x && x < item.x + item.width && 
        y >= item.y && y < item.y + item.height
      );
  }, [layout, minimizedPanels]);

  // Check if a rectangle area is free
  const isAreaFree = useCallback((x: number, y: number, width: number, height: number, panelId: string) => {
    // Check grid boundaries
    if (x < 0 || y < 0 || x + width > gridCols || y + height > gridRows) {
      return false;
    }
    
    // Check each cell in the rectangle
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        if (isCellOccupied(x + i, y + j, panelId)) {
          return false;
        }
      }
    }
    
    return true;
  }, [isCellOccupied, gridCols, gridRows]);

  // Find the nearest valid position for a panel
  const findNearestValidPosition = useCallback((
    panelId: string, 
    desiredX: number, 
    desiredY: number, 
    width: number, 
    height: number
  ) => {
    // Try the desired position first
    if (isAreaFree(desiredX, desiredY, width, height, panelId)) {
      return { x: desiredX, y: desiredY };
    }
    
    // Define search boundaries
    const maxSearchDistance = Math.max(gridCols, gridRows);
    
    // Search in expanding circles
    for (let distance = 1; distance <= maxSearchDistance; distance++) {
      // Try positions in a square around the desired location
      for (let offsetX = -distance; offsetX <= distance; offsetX++) {
        for (let offsetY = -distance; offsetY <= distance; offsetY++) {
          // Only check positions on the perimeter of the square
          if (
            Math.abs(offsetX) === distance || 
            Math.abs(offsetY) === distance
          ) {
            const testX = desiredX + offsetX;
            const testY = desiredY + offsetY;
            
            if (isAreaFree(testX, testY, width, height, panelId)) {
              return { x: testX, y: testY };
            }
          }
        }
      }
    }
    
    // Fallback: Try to find any free area
    for (let x = 0; x <= gridCols - width; x++) {
      for (let y = 0; y <= gridRows - height; y++) {
        if (isAreaFree(x, y, width, height, panelId)) {
          return { x, y };
        }
      }
    }
    
    // Last resort: Keep the current position
    const currentPosition = layout.find(item => item.id === panelId);
    return currentPosition ? { x: currentPosition.x, y: currentPosition.y } : { x: 0, y: 0 };
  }, [isAreaFree, layout, gridCols, gridRows]);

  const handleGridPositionChange = useCallback((id: string, x: number, y: number, width: number, height: number) => {
    // Ensure dimensions are within grid boundaries
    const adjustedWidth = Math.min(width, gridCols);
    const adjustedHeight = Math.min(height, gridRows);
    
    // Find a valid position for the panel
    const validPosition = findNearestValidPosition(id, x, y, adjustedWidth, adjustedHeight);
    
    // Update the layout
    const newLayout = layout.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          x: validPosition.x, 
          y: validPosition.y, 
          width: adjustedWidth, 
          height: adjustedHeight 
        };
      }
      return item;
    });
    
    setLayout(newLayout);
    
    if (onPanelPositionChange) {
      onPanelPositionChange(id, validPosition.x, validPosition.y, adjustedWidth, adjustedHeight);
    }
  }, [layout, gridCols, gridRows, findNearestValidPosition, onPanelPositionChange]);

  const allPanelsMinimized = panels.length > 0 && minimizedPanels.length === panels.length;

  return (
    <div className="panel-manager-container">
      <div 
        className={`panel-grid ${allPanelsMinimized ? 'all-minimized' : ''}`}
        style={{
          display: allPanelsMinimized ? 'none' : 'grid',
          gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`,
          gap: `${gap}px`,
        }}
      >
        {panels.map(panel => {
          if (minimizedPanels.includes(panel.id)) return null;
          
          // Find panel in layout
          const panelLayout = layout.find(item => item.id === panel.id);
          
          if (!panelLayout) return null;
          
          return (
            <Panel
              key={panel.id}
              {...panel}
              gridX={panelLayout.x}
              gridY={panelLayout.y}
              gridWidth={panelLayout.width}
              gridHeight={panelLayout.height}
              onMinimize={handleMinimize}
              onGridPositionChange={handleGridPositionChange}
            >
              {panel.content}
            </Panel>
          );
        })}
      </div>
      
      {minimizedPanels.length > 0 && (
        <div className={`minimized-panels-tray ${allPanelsMinimized ? 'all-minimized' : ''}`}>
          {panels
            .filter(panel => minimizedPanels.includes(panel.id))
            .map(panel => (
              <div 
                key={panel.id} 
                className="minimized-panel-tab"
                onClick={() => handleRestore(panel.id)}
              >
                <span className="restore-icon">+</span>
                {panel.title}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default PanelManager; 