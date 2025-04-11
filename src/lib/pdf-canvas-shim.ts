/**
 * This file provides a shim for the 'canvas' module which pdf.js-extract depends on
 * but is not available in browser environments.
 *
 * It must be imported before pdf.js-extract is used.
 */

if (typeof window !== "undefined") {
  // We're in a browser environment
  const canvasShim = {
    createCanvas: () => {
      const canvas = document.createElement("canvas");
      return canvas;
    },
    // Add any other canvas methods that might be needed
  };

  // Define a global shim that will be used when canvas is required
  (window as any).canvasShim = canvasShim;

  // Override require to return our shim when canvas is requested
  const originalRequire = (window as any).require;
  (window as any).require = function (module: string) {
    if (module === "canvas") {
      return (window as any).canvasShim;
    }
    return originalRequire ? originalRequire(module) : undefined;
  };
}

export default {};
