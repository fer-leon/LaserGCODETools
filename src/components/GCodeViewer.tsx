import React, { useEffect, useRef, useState, useCallback } from 'react';
import GCodeParser from '../utils/GCodeParser';

interface GCodeViewerProps {
  gcodeContent: string | null;
}

const GCodeViewer: React.FC<GCodeViewerProps> = ({ gcodeContent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Store parsed data in a ref to avoid re-parsing on every render
  const parsedDataRef = useRef<{
    paths: ReturnType<GCodeParser['getPaths']>,
    bbox: ReturnType<GCodeParser['getBoundingBox']>
  } | null>(null);

  // Parse GCODE only when content changes
  useEffect(() => {
    if (!gcodeContent) {
      parsedDataRef.current = null;
      return;
    }

    const parser = new GCodeParser();
    parser.parseGCode(gcodeContent);
    parsedDataRef.current = {
      paths: parser.getPaths(),
      bbox: parser.getBoundingBox()
    };
    
    // Reset view when new content is loaded
    const canvas = canvasRef.current;
    if (canvas) {
      const bbox = parsedDataRef.current.bbox;
      const padding = 20;
      const xRange = bbox.max.x - bbox.min.x;
      const yRange = bbox.max.y - bbox.min.y;
      
      const xScale = (canvas.width - 2 * padding) / (xRange || 1);
      const yScale = (canvas.height - 2 * padding) / (yRange || 1);
      
      const newScale = Math.min(xScale, yScale);
      setScale(newScale);
      
      const newOffsetX = padding - bbox.min.x * newScale + (canvas.width - xRange * newScale) / 2;
      const newOffsetY = padding - bbox.min.y * newScale + (canvas.height - yRange * newScale) / 2;
      setOffset({ x: newOffsetX, y: newOffsetY });
    }
  }, [gcodeContent]);

  // Create a rendering function that can be called whenever needed
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedDataRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { paths, bbox } = parsedDataRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If no paths, exit
    if (paths.length === 0) return;

    // Render grid - Smaller and more fine-grained
    ctx.strokeStyle = '#f0f0f0'; // Lighter color for minor grid
    ctx.lineWidth = 0.3; // Thinner lines for minor grid
    
    // Draw smaller grid lines first (minor grid)
    const minorGridSize = 1; // 1 unit grid lines
    const gridExtent = 1000; // Extend grid beyond bounding box
    
    const minorGridMinX = Math.floor((bbox.min.x - gridExtent) / minorGridSize) * minorGridSize;
    const minorGridMaxX = Math.ceil((bbox.max.x + gridExtent) / minorGridSize) * minorGridSize;
    const minorGridMinY = Math.floor((bbox.min.y - gridExtent) / minorGridSize) * minorGridSize;
    const minorGridMaxY = Math.ceil((bbox.max.y + gridExtent) / minorGridSize) * minorGridSize;
    
    // Only draw minor grid lines when zoomed in enough
    if (scale > 0.5) {
      // Draw minor grid
      for (let x = minorGridMinX; x <= minorGridMaxX; x += minorGridSize) {
        ctx.beginPath();
        const canvasX = x * scale + offset.x;
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, canvas.height);
        ctx.stroke();
      }
      
      for (let y = minorGridMinY; y <= minorGridMaxY; y += minorGridSize) {
        ctx.beginPath();
        const canvasY = canvas.height - (y * scale + offset.y);
        ctx.moveTo(0, canvasY);
        ctx.lineTo(canvas.width, canvasY);
        ctx.stroke();
      }
    }
    
    // Draw major grid lines (more visible)
    const majorGridSize = 10; // 10 unit grid lines
    ctx.strokeStyle = '#e0e0e0'; // Slightly darker for major grid
    ctx.lineWidth = 0.5;
    
    for (let x = Math.floor(bbox.min.x / majorGridSize) * majorGridSize; x <= Math.ceil(bbox.max.x / majorGridSize) * majorGridSize; x += majorGridSize) {
      ctx.beginPath();
      const canvasX = x * scale + offset.x;
      ctx.moveTo(canvasX, 0);
      ctx.lineTo(canvasX, canvas.height);
      ctx.stroke();
    }
    
    for (let y = Math.floor(bbox.min.y / majorGridSize) * majorGridSize; y <= Math.ceil(bbox.max.y / majorGridSize) * majorGridSize; y += majorGridSize) {
      ctx.beginPath();
      const canvasY = canvas.height - (y * scale + offset.y);
      ctx.moveTo(0, canvasY);
      ctx.lineTo(canvas.width, canvasY);
      ctx.stroke();
    }
    
    // Draw axes with clearly separated lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    // X-axis (horizontal)
    ctx.beginPath();
    const yAxisPos = canvas.height - offset.y; // Y position of X-axis
    ctx.moveTo(0, yAxisPos);
    ctx.lineTo(canvas.width, yAxisPos);
    ctx.stroke();
    
    // Y-axis (vertical)
    ctx.beginPath();
    ctx.moveTo(offset.x, 0);
    ctx.lineTo(offset.x, canvas.height);
    ctx.stroke();
    
    // Draw paths
    paths.forEach(path => {
      ctx.beginPath();
      
      // Transform coordinates to canvas space
      const startX = path.start.x * scale + offset.x;
      const startY = canvas.height - (path.start.y * scale + offset.y); // Flip Y axis
      const endX = path.end.x * scale + offset.x;
      const endY = canvas.height - (path.end.y * scale + offset.y); // Flip Y axis
      
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      
      // Set line style based on rapid vs cutting move
      if (path.isRapid) {
        ctx.strokeStyle = '#ff0000'; // Red for rapid moves
        ctx.setLineDash([5, 3]); // Dashed line for rapid moves
      } else {
        ctx.strokeStyle = '#0000ff'; // Blue for cutting moves
        ctx.setLineDash([]); // Solid line for cutting moves
      }
      
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
    });
  }, [scale, offset]);

  // Re-render when scale or offset change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, scale, offset]);

  // Handle canvas resize and event setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas to fill container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        renderCanvas(); // Redraw after resize
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Handle zoom via wheel
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Calculate zoom centered on mouse position
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Compute scale change
      const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom in or out
      const newScale = scale * delta;
      
      // Adjust offset to zoom centered on mouse position
      const newOffsetX = mouseX - (mouseX - offset.x) * delta;
      const newOffsetY = mouseY - (mouseY - offset.y) * delta;
      
      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    };

    // Handle pan via mouse drag
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault(); // Prevent default browser drag behaviors
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Update offset (note: for y-axis we invert the direction because canvas 
      // is flipped compared to our GCODE coordinates)
      setOffset(prev => ({ 
        x: prev.x + dx, 
        y: prev.y - dy  // Invert Y direction
      }));
      
      // Update drag start position for next move
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Prevent context menu on right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [scale, offset, renderCanvas, isDragging]);

  // Reset view button handler
  const handleReset = () => {
    if (!parsedDataRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const bbox = parsedDataRef.current.bbox;
    
    const padding = 20;
    const xRange = bbox.max.x - bbox.min.x;
    const yRange = bbox.max.y - bbox.min.y;
    
    const xScale = (canvas.width - 2 * padding) / (xRange || 1);
    const yScale = (canvas.height - 2 * padding) / (yRange || 1);
    
    const newScale = Math.min(xScale, yScale);
    setScale(newScale);
    
    const newOffsetX = padding - bbox.min.x * newScale + (canvas.width - xRange * newScale) / 2;
    const newOffsetY = padding - bbox.min.y * newScale + (canvas.height - yRange * newScale) / 2;
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  return (
    <div className="w-full h-full relative">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-grab"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
      <div className="absolute bottom-1 right-1 bg-white p-0.5 rounded shadow">
        <div className="flex space-x-1">
          <button 
            className="bg-gray-200 hover:bg-gray-300 rounded px-1.5 py-0.5 text-xs"
            onClick={() => setScale(prev => prev * 1.1)}
          >
            +
          </button>
          <button 
            className="bg-gray-200 hover:bg-gray-300 rounded px-1.5 py-0.5 text-xs"
            onClick={() => setScale(prev => prev * 0.9)}
          >
            -
          </button>
          <button 
            className="bg-gray-200 hover:bg-gray-300 rounded px-1.5 py-0.5 text-xs"
            onClick={handleReset}
          >
            R
          </button>
        </div>
      </div>
    </div>
  );
};

export default GCodeViewer;
