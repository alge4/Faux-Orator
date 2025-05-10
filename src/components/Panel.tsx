import React, { useState, useRef, useEffect } from 'react';
import './Panel.css';

export interface PanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onMinimize?: (id: string) => void;
  gridX?: number;
  gridY?: number;
  gridWidth?: number;
  gridHeight?: number;
  onGridPositionChange?: (id: string, x: number, y: number, width: number, height: number) => void;
  width?: string | number;
  height?: string | number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  showGridInfo?: boolean;
  cellSize?: number;
}

const Panel: React.FC<PanelProps> = ({
  id,
  title,
  children,
  onMinimize,
  gridX = 0,
  gridY = 0,
  gridWidth = 2,
  gridHeight = 2,
  onGridPositionChange,
  width,
  height,
  minWidth = 200,
  maxWidth = 800,
  minHeight = 100,
  maxHeight = 1000,
  defaultWidth = 300,
  defaultHeight = 300,
  resizable = true,
  draggable = true,
  showGridInfo = true,
  cellSize = 100
}) => {
  const [currentWidth, setCurrentWidth] = useState<number>(defaultWidth);
  const [currentHeight, setCurrentHeight] = useState<number>(defaultHeight);
  const [isResizingWidth, setIsResizingWidth] = useState<boolean>(false);
  const [isResizingHeight, setIsResizingHeight] = useState<boolean>(false);
  const [isResizingCorner, setIsResizingCorner] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [position, setPosition] = useState({ x: gridX, y: gridY });
  const [size, setSize] = useState({ width: gridWidth, height: gridHeight });
  const [showInfo, setShowInfo] = useState<boolean>(false);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startGridPosRef = useRef({ x: 0, y: 0 });
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  // Toggle grid info on right-click
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowInfo(!showInfo);
  };

  // Handle dragging the panel header to move it
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (!draggable || e.button !== 0) return; // Only proceed for left-click
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startGridPosRef.current = { x: position.x, y: position.y };
  };

  const handleMouseMove = (e: MouseEvent) => {
    // Handle resizing
    if (isResizingWidth || isResizingCorner) {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      setCurrentWidth(newWidth);
      
      // Update grid width
      const newGridWidth = Math.max(1, Math.round(newWidth / cellSize));
      if (newGridWidth !== size.width) {
        setSize(prev => ({ ...prev, width: newGridWidth }));
        if (onGridPositionChange) {
          onGridPositionChange(id, position.x, position.y, newGridWidth, size.height);
        }
      }
    }
    
    if (isResizingHeight || isResizingCorner) {
      const delta = e.clientY - startYRef.current;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + delta));
      setCurrentHeight(newHeight);
      
      // Update grid height
      const newGridHeight = Math.max(1, Math.round(newHeight / cellSize));
      if (newGridHeight !== size.height) {
        setSize(prev => ({ ...prev, height: newGridHeight }));
        if (onGridPositionChange) {
          onGridPositionChange(id, position.x, position.y, size.width, newGridHeight);
        }
      }
    }
    
    // Handle dragging
    if (isDragging) {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      
      // Convert pixel movement to grid cells
      const gridDeltaX = Math.round(deltaX / cellSize);
      const gridDeltaY = Math.round(deltaY / cellSize);
      
      const newGridX = Math.max(0, startGridPosRef.current.x + gridDeltaX);
      const newGridY = Math.max(0, startGridPosRef.current.y + gridDeltaY);
      
      if (newGridX !== position.x || newGridY !== position.y) {
        setPosition({ x: newGridX, y: newGridY });
        if (onGridPositionChange) {
          onGridPositionChange(id, newGridX, newGridY, size.width, size.height);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizingWidth(false);
    setIsResizingHeight(false);
    setIsResizingCorner(false);
    setIsDragging(false);
  };

  const handleMouseDownRight = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only proceed for left-click
    e.preventDefault();
    setIsResizingWidth(true);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
  };

  const handleMouseDownBottom = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only proceed for left-click
    e.preventDefault();
    setIsResizingHeight(true);
    startYRef.current = e.clientY;
    startHeightRef.current = currentHeight;
  };

  const handleMouseDownCorner = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only proceed for left-click
    e.preventDefault();
    setIsResizingCorner(true);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startWidthRef.current = currentWidth;
    startHeightRef.current = currentHeight;
  };

  useEffect(() => {
    if (isResizingWidth || isResizingHeight || isResizingCorner || isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingWidth, isResizingHeight, isResizingCorner, isDragging]);

  // Update local state if props change
  useEffect(() => {
    setPosition({ x: gridX, y: gridY });
    setSize({ width: gridWidth, height: gridHeight });
  }, [gridX, gridY, gridWidth, gridHeight]);

  return (
    <div 
      className={`panel ${isDragging ? 'dragging' : ''}`}
      ref={panelRef}
      style={{ 
        width: width || `${currentWidth}px`,
        height: height || `${currentHeight}px`,
        minWidth: minWidth ? `${minWidth}px` : undefined,
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
        minHeight: minHeight ? `${minHeight}px` : undefined,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        gridColumn: `${position.x + 1} / span ${size.width}`,
        gridRow: `${position.y + 1} / span ${size.height}`,
      }}
      onContextMenu={handleRightClick}
    >
      <div 
        className="panel-header"
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="panel-title">{title}</div>
        <div className="panel-actions">
          {showGridInfo && (
            <div className="panel-grid-info">
              {position.x},{position.y} ({size.width}×{size.height})
            </div>
          )}
          {onMinimize && (
            <button 
              className="panel-action-button" 
              onClick={() => onMinimize(id)}
              title="Minimize"
            >
              −
            </button>
          )}
        </div>
      </div>
      <div className="panel-content">
        {children}
      </div>
      {showInfo && (
        <div className="panel-info-overlay">
          <div className="grid-info-content">
            <div className="grid-info-row">Position: ({position.x}, {position.y})</div>
            <div className="grid-info-row">Size: {size.width} × {size.height} cells</div>
            <div className="grid-info-row">Width: {currentWidth}px</div>
            <div className="grid-info-row">Height: {currentHeight}px</div>
          </div>
        </div>
      )}
      {resizable && (
        <>
          <div 
            className="panel-resizer-right" 
            onMouseDown={handleMouseDownRight}
          />
          <div 
            className="panel-resizer-bottom" 
            onMouseDown={handleMouseDownBottom}
          />
          <div 
            className="panel-resizer-corner" 
            onMouseDown={handleMouseDownCorner}
          />
        </>
      )}
    </div>
  );
};

export default Panel; 