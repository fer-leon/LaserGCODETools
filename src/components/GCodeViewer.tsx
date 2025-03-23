import React, { useEffect, useRef, useState, useCallback } from 'react';
import GCodeParser from '../utils/GCodeParser';

interface GCodeViewerProps {
  gcodeContent: string | null;
}

// Interfaz para el registro de la línea seleccionada
interface HighlightedLine {
  index: number;
  path: ReturnType<GCodeParser['getPaths']>[0];
  position: { x: number, y: number }; // Posición del cursor para el tooltip
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

  // Estado para la línea resaltada
  const [highlightedLine, setHighlightedLine] = useState<HighlightedLine | null>(null);

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
    paths.forEach((path, index) => {
      ctx.beginPath();
      
      // Transform coordinates to canvas space
      // Corregido: Invertimos el eje Y para la visualización correcta
      const startX = path.start.x * scale + offset.x;
      const startY = canvas.height - (path.start.y * scale + offset.y); // Invertimos Y
      const endX = path.end.x * scale + offset.x;
      const endY = canvas.height - (path.end.y * scale + offset.y); // Invertimos Y
      
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      
      // Determine if this is the highlighted line
      const isHighlighted = highlightedLine?.index === index;
      
      // Set line style based on rapid vs cutting move and highlight state
      if (isHighlighted) {
        // Highlighted path style
        ctx.strokeStyle = path.isRapid ? '#ff6666' : '#6666ff'; // Brighter colors
        ctx.lineWidth = 3.0; // Thicker line
        ctx.setLineDash(path.isRapid ? [5, 3] : []); // Maintain dash for rapid moves
      } else {
        // Normal path style
        ctx.strokeStyle = path.isRapid ? '#ff0000' : '#0000ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash(path.isRapid ? [5, 3] : []);
      }
      
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
    });
  }, [scale, offset, highlightedLine]);

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

  // Add mousemove event to detect lines under cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedDataRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Don't detect lines while dragging
        setHighlightedLine(null);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const { paths } = parsedDataRef.current;
      
      // Find closest line to mouse cursor
      let closestLine: HighlightedLine | null = null;
      let closestDistance = 5; // Minimum distance threshold in pixels
      
      paths.forEach((path, index) => {
        // Convert path coordinates to canvas space
        const startX = path.start.x * scale + offset.x;
        const startY = canvas.height - (path.start.y * scale + offset.y);
        const endX = path.end.x * scale + offset.x;
        const endY = canvas.height - (path.end.y * scale + offset.y);
        
        // Calculate distance from mouse to line
        const distance = distanceToLine(mouseX, mouseY, startX, startY, endX, endY);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestLine = {
            index,
            path,
            position: { x: mouseX, y: mouseY }
          };
        }
      });
      
      // Update highlighted line
      setHighlightedLine(closestLine);
      
      // Update cursor style
      canvas.style.cursor = closestLine ? 'pointer' : 'grab';
    };

    const handleMouseOut = () => {
      setHighlightedLine(null);
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseout', handleMouseOut);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseout', handleMouseOut);
    };
  }, [scale, offset, isDragging, parsedDataRef]);

  // Reset view button handler - simplified to restore initial view exactly
  const handleReset = () => {
    if (!initialViewRef.current) return;
    
    // Simply restore the initial scale and offset values
    setScale(initialViewRef.current.scale);
    setOffset(initialViewRef.current.offset);
  };

  // Calculate distance from point to line segment
  const distanceToLine = (x: number, y: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) { // line is not a point
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Format coordinates for display
  const formatCoordinate = (value: number) => value.toFixed(2);

  // Función para mostrar la velocidad correctamente
  const formatFeedrate = (path: ReturnType<GCodeParser['getPaths']>[0]) => {
    if (path.isRapid) {
      return 'Máxima (G0)';
    }
    
    // Si es un movimiento de corte (G1), siempre tiene una velocidad
    // Puede ser de esta línea específica o heredada de comandos anteriores
    return `${formatCoordinate(path.feedrate || 0)} unidades/min`;
  };

  return (
    <div className="w-full h-full relative">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : (highlightedLine ? 'pointer' : 'grab') }}
      />
      {highlightedLine && (
        <div 
          className="absolute bg-black bg-opacity-75 text-white p-2 rounded shadow-lg text-xs z-10 pointer-events-none"
          style={{
            left: highlightedLine.position.x + 10,
            top: highlightedLine.position.y + 10
          }}
        >
          <div>
            <span className="font-semibold">Tipo:</span> {highlightedLine.path.isRapid ? 'Movimiento rápido' : 'Corte'}
          </div>
          <div>
            <span className="font-semibold">Inicio:</span> X:{formatCoordinate(highlightedLine.path.start.x)} Y:{formatCoordinate(highlightedLine.path.start.y)}
          </div>
          <div>
            <span className="font-semibold">Fin:</span> X:{formatCoordinate(highlightedLine.path.end.x)} Y:{formatCoordinate(highlightedLine.path.end.y)}
          </div>
          <div>
            <span className="font-semibold">Distancia:</span> {formatCoordinate(
              Math.sqrt(
                Math.pow(highlightedLine.path.end.x - highlightedLine.path.start.x, 2) +
                Math.pow(highlightedLine.path.end.y - highlightedLine.path.start.y, 2)
              )
            )} unidades
          </div>
          {/* Velocidad mejorada */}
          <div>
            <span className="font-semibold">Velocidad:</span> {formatFeedrate(highlightedLine.path)}
          </div>
          {/* Mostrar comando original */}
          {highlightedLine.path.command && (
            <div>
              <span className="font-semibold">Comando:</span> {highlightedLine.path.command.code}
              {Object.entries(highlightedLine.path.command.params).map(([key, value]) => 
                ` ${key}${value}`
              )}
            </div>
          )}
          {/* Mostrar comentario si existe */}
          {highlightedLine.path.command?.comment && (
            <div>
              <span className="font-semibold">Comentario:</span> {highlightedLine.path.command.comment}
            </div>
          )}
        </div>
      )}
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
