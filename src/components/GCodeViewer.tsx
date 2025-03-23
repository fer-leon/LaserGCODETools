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
    bbox: ReturnType<GCodeParser['getBoundingBox']>,
    centroid: ReturnType<GCodeParser['getCentroid']>
  } | null>(null);

  // Store initial view settings for reset functionality
  const initialViewRef = useRef<{ scale: number; offset: { x: number; y: number } } | null>(null);

  // Parse GCODE only when content changes
  useEffect(() => {
    if (!gcodeContent) {
      parsedDataRef.current = null;
      initialViewRef.current = null;
      return;
    }

    const parser = new GCodeParser();
    parser.parseGCode(gcodeContent);
    parsedDataRef.current = {
      paths: parser.getPaths(),
      bbox: parser.getBoundingBox(),
      centroid: parser.getCentroid()
    };
    
    // Reset view when new content is loaded
    const canvas = canvasRef.current;
    if (canvas) {
      const { bbox, centroid } = parsedDataRef.current;
      
      // Fijo: establecer escala al 50% (0.5) del tamaño real
      const fixedScale = 0.5;
      
      // Calcular también la escala que ajustaría el dibujo entero en el canvas
      const padding = 20;
      const xRange = bbox.max.x - bbox.min.x;
      const yRange = bbox.max.y - bbox.min.y;
      
      const xScale = (canvas.width - 2 * padding) / (xRange || 1);
      const yScale = (canvas.height - 2 * padding) / (yRange || 1);
      const fitScale = Math.min(xScale, yScale);
      
      // Usar el mayor entre la escala fija y la escala de ajuste
      const newScale = Math.max(fixedScale, fitScale * 0.9);
      
      // CORREGIDO: Para ser coherente con la transformación al renderizar
      const newOffsetX = canvas.width / 2 - centroid.x * newScale;
      const newOffsetY = canvas.height / 2 + centroid.y * newScale - canvas.height;
      
      // Store initial view settings
      initialViewRef.current = {
        scale: newScale,
        offset: { x: newOffsetX, y: newOffsetY }
      };
      
      setScale(newScale);
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
    
    // Draw axes with arrows (CAD style)
    // Helper function to draw an arrow
    const drawArrow = (fromX: number, fromY: number, toX: number, toY: number, color: string, text?: string) => {
      const headLength = 10; // length of arrow head in pixels
      const headAngle = Math.PI / 6; // 30 degrees angle for arrow head
      
      // Calculate the angle of the line
      const angle = Math.atan2(toY - fromY, toX - fromX);
      
      // Draw the line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Draw the arrow head
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle - headAngle),
        toY - headLength * Math.sin(angle - headAngle)
      );
      ctx.lineTo(
        toX - headLength * Math.cos(angle + headAngle),
        toY - headLength * Math.sin(angle + headAngle)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      
      // Draw text label if provided
      if (text) {
        ctx.font = '12px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, toX + 15 * Math.cos(angle), toY + 15 * Math.sin(angle));
      }
    };
    
    // Get origin position in canvas coordinates
    const originX = offset.x;
    const originY = canvas.height - offset.y;
    
    // Draw X axis with arrow
    const xAxisLength = Math.min(150, canvas.width - originX - 20); // Limit length to available space
    drawArrow(
      originX, originY,
      originX + xAxisLength, originY,
      '#E74C3C', // Red for X axis
      'X'
    );
    
    // Draw Y axis with arrow
    const yAxisLength = Math.min(150, originY - 20); // Limit length to available space
    drawArrow(
      originX, originY,
      originX, originY - yAxisLength,
      '#2ECC71', // Green for Y axis
      'Y'
    );
    
    // Draw paths
    paths.forEach(path => {
      ctx.beginPath();
      
      // Transform coordinates to canvas space
      // Corregido: Invertimos el eje Y para la visualización correcta
      const startX = path.start.x * scale + offset.x;
      const startY = canvas.height - (path.start.y * scale + offset.y); // Invertimos Y
      const endX = path.end.x * scale + offset.x;
      const endY = canvas.height - (path.end.y * scale + offset.y); // Invertimos Y
      
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
      const newScale = Math.max(0.1, scale * delta); // Limitar el zoom mínimo a 0.1
      
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

  // Reset view button handler - simplified to restore initial view exactly
  const handleReset = () => {
    if (!initialViewRef.current) return;
    
    // Simply restore the initial scale and offset values
    setScale(initialViewRef.current.scale);
    setOffset(initialViewRef.current.offset);
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
