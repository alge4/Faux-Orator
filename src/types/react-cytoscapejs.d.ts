declare module 'react-cytoscapejs' {
  import { FC } from 'react';
  import cytoscape from 'cytoscape';

  interface CytoscapeComponentProps {
    id?: string;
    cy?: (cy: cytoscape.Core) => void;
    style?: React.CSSProperties;
    elements: cytoscape.ElementDefinition[];
    layout?: cytoscape.LayoutOptions;
    stylesheet?: any; // Intentionally any because of complex object structure
    className?: string;
    zoom?: any;
    pan?: any;
    minZoom?: number;
    maxZoom?: number;
    zoomingEnabled?: boolean;
    userZoomingEnabled?: boolean;
    panningEnabled?: boolean;
    userPanningEnabled?: boolean;
    boxSelectionEnabled?: boolean;
    autoungrabify?: boolean;
    autolock?: boolean;
    autounselectify?: boolean;
    autoRefreshLayout?: boolean;
    headless?: boolean;
    hideEdgesOnViewport?: boolean;
    hideLabelsOnViewport?: boolean;
    textureOnViewport?: boolean;
    motionBlur?: boolean;
    motionBlurOpacity?: number;
    wheelSensitivity?: number;
    pixelRatio?: number | 'auto';
  }

  const CytoscapeComponent: FC<CytoscapeComponentProps>;
  export default CytoscapeComponent;
} 