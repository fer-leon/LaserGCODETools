import React, { useEffect, useRef, useState, useCallback } from 'react';
import GCodeParser, { GCodePath } from '../utils/GCodeParser';

interface GCodeViewerProps {
  // Props originales
  gcodeContent?: string | null;
  
  // Props de corrección
  customPaths?: GCodePath[] | null;
  originalPaths?: GCodePath[] | null;
  correctionFactors?: number[] | null;
  customBbox?: { min: { x: number, y: number }, max: { x: number, y: number } } | null;
  customCentroid?: { x: number, y: number } | null;
  
  // Opciones de visualización
  colorMode?: 'default' | 'correction';
  showOriginal?: boolean;
  title?: string;
}

const GCodeViewer: React.FC<GCodeViewerProps> = ({ 
  gcodeContent,
  customPaths,
  originalPaths,
  correctionFactors,
  customBbox,
  customCentroid,
  colorMode = 'default',
  showOriginal = false,
  title
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showOriginalToggle, setShowOriginalToggle] = useState(showOriginal);
  
  // Store parsed data in a ref to avoid re-parsing on every render
  const parsedDataRef = useRef<{
    paths: GCodePath[],
    bbox: ReturnType<GCodeParser['getBoundingBox']>,
    centroid: ReturnType<GCodeParser['getCentroid']>
  } | null>(null);

  // Store initial view settings for reset functionality
  const initialViewRef = useRef<{ scale: number; offset: { x: number; y: number } } | null>(null);

  // Estado para la línea resaltada
  const [highlightedLine, setHighlightedLine] = useState<{
    index: number;
    path: GCodePath;
    position: { x: number, y: number };
  } | null>(null);

  // Parse GCODE or use custom paths
  useEffect(() => {
    // Si tenemos paths personalizados, usamos esos
    if (customPaths && customBbox && customCentroid) {
      parsedDataRef.current = {
        paths: customPaths,
        bbox: customBbox,
        centroid: customCentroid
      };
    } 
    // Si tenemos gcodeContent, parseamos el contenido
    else if (gcodeContent) {
      const parser = new GCodeParser();
      parser.parseGCode(gcodeContent);
      parsedDataRef.current = {
        paths: parser.getPaths(),
        bbox: parser.getBoundingBox(),
        centroid: parser.getCentroid()
      };
    } 
    // Si no tenemos ni paths ni gcodeContent, limpiamos los datos
    else {
      parsedDataRef.current = null;
      initialViewRef.current = null;
      return;
    }
    
    // Reset view when new content is loaded
    const canvas = canvasRef.current;
    if (canvas && parsedDataRef.current) {
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
  }, [gcodeContent, customPaths, customBbox, customCentroid]);

  // Función para dibujar la leyenda de colores para la corrección
  const drawCorrectionLegend = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    if (colorMode !== 'correction') return;
    
    const width = 100;
    const height = 15;
    
    // Modificado el gradiente: Azul a Rojo
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, 'rgb(0, 0, 255)'); // Azul - sin corrección
    gradient.addColorStop(1, 'rgb(255, 0, 0)'); // Rojo - máxima corrección
    
    // Draw gradient rectangle
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Draw text labels
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('0%', x, y + height + 12);
    ctx.fillText('100%', x + width, y + height + 12);
    ctx.fillText('Reducción de velocidad', x + width/2, y + height + 24);
  };

  // Función para mostrar la velocidad correctamente, considerando correcciones
  const formatFeedrate = (path: GCodePath, index?: number) => {
    if (path.isRapid) {
      return 'Máxima (G0)';
    }
    
    let feedrateValue = path.feedrate || 0;
    let originalValue: number | undefined;
    
    // Si estamos en modo corrección y tenemos el índice, mostramos la velocidad original y corregida
    if (colorMode === 'correction' && correctionFactors && originalPaths && typeof index === 'number') {
      originalValue = originalPaths[index]?.feedrate || 0;
    }
    
    if (originalValue !== undefined && originalValue !== feedrateValue) {
      return `${formatCoordinate(feedrateValue)} unidades/min (original: ${formatCoordinate(originalValue)})`;
    } else {
      return `${formatCoordinate(feedrateValue)} unidades/min`;
    }
  };

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

    // Renderizar la cuadrícula - dos niveles de detalle
    // Cuadrícula principal (unidades grandes)
    const majorGridSize = 10; // Cada 10 unidades
    ctx.strokeStyle = '#e0e0e0'; // Gris claro para la cuadrícula principal
    ctx.lineWidth = 0.5;
    
    // Calcular el rango de la cuadrícula para extenderse más allá del bounding box
    const gridExtent = 100; // Extender la cuadrícula más allá del bbox
    
    // Grid X - líneas verticales principales
    for (let x = Math.floor((bbox.min.x - gridExtent) / majorGridSize) * majorGridSize; 
         x <= Math.ceil((bbox.max.x + gridExtent) / majorGridSize) * majorGridSize; 
         x += majorGridSize) {
      ctx.beginPath();
      const canvasX = x * scale + offset.x;
      ctx.moveTo(canvasX, 0);
      ctx.lineTo(canvasX, canvas.height);
      ctx.stroke();
    }
    
    // Grid Y - líneas horizontales principales
    for (let y = Math.floor((bbox.min.y - gridExtent) / majorGridSize) * majorGridSize; 
         y <= Math.ceil((bbox.max.y + gridExtent) / majorGridSize) * majorGridSize; 
         y += majorGridSize) {
      ctx.beginPath();
      const canvasY = canvas.height - (y * scale + offset.y);
      ctx.moveTo(0, canvasY);
      ctx.lineTo(canvas.width, canvasY);
      ctx.stroke();
    }
    
    // Cuadrícula secundaria (unidades pequeñas) - solo visible con zoom
    if (scale > 0.5) {
      const minorGridSize = 1; // Cada unidad
      ctx.strokeStyle = '#f3f3f3'; // Gris más claro para cuadrícula secundaria
      ctx.lineWidth = 0.3;
      
      // Grid X - líneas verticales secundarias
      for (let x = Math.floor((bbox.min.x - gridExtent) / minorGridSize) * minorGridSize; 
           x <= Math.ceil((bbox.max.x + gridExtent) / minorGridSize) * minorGridSize; 
           x += minorGridSize) {
        // Solo dibujar si no es una línea de cuadrícula principal
        if (x % majorGridSize !== 0) {
          ctx.beginPath();
          const canvasX = x * scale + offset.x;
          ctx.moveTo(canvasX, 0);
          ctx.lineTo(canvasX, canvas.height);
          ctx.stroke();
        }
      }
      
      // Grid Y - líneas horizontales secundarias
      for (let y = Math.floor((bbox.min.y - gridExtent) / minorGridSize) * minorGridSize; 
           y <= Math.ceil((bbox.max.y + gridExtent) / minorGridSize) * minorGridSize; 
           y += minorGridSize) {
        // Solo dibujar si no es una línea de cuadrícula principal
        if (y % majorGridSize !== 0) {
          ctx.beginPath();
          const canvasY = canvas.height - (y * scale + offset.y);
          ctx.moveTo(0, canvasY);
          ctx.lineTo(canvas.width, canvasY);
          ctx.stroke();
        }
      }
    }
    
    // Dibujar ejes y origen con flechas estilo CAD
    // Función para dibujar una flecha
    const drawArrow = (fromX: number, fromY: number, toX: number, toY: number, color: string, text?: string) => {
      const headLength = 10; // Longitud de la punta de la flecha
      const headAngle = Math.PI / 6; // 30 grados para la punta
      
      // Calcular el ángulo de la línea
      const angle = Math.atan2(toY - fromY, toX - fromX);
      
      // Dibujar la línea
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Dibujar la punta de la flecha
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
      
      // Dibujar texto si se proporciona
      if (text) {
        ctx.font = '14px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Posición del texto ligeramente desplazada de la punta
        ctx.fillText(text, 
          toX + 15 * Math.cos(angle), 
          toY + 15 * Math.sin(angle)
        );
      }
    };
    
    // Obtener posición del origen en coordenadas del canvas
    const originX = offset.x; // Posición X del origen en el canvas
    const originY = canvas.height - offset.y; // Posición Y del origen en el canvas
    
    // Dibujar eje X (rojo, típico en CAD)
    const xAxisLength = Math.min(120, canvas.width - originX - 20); // Limitar la longitud
    drawArrow(
      originX, originY, 
      originX + xAxisLength, originY,
      '#E74C3C', // Rojo para eje X
      'X'
    );
    
    // Dibujar eje Y (verde, típico en CAD)
    const yAxisLength = Math.min(120, originY - 20); // Limitar la longitud
    drawArrow(
      originX, originY,
      originX, originY - yAxisLength,
      '#2ECC71', // Verde para eje Y
      'Y'
    );
    
    // Dibujar un pequeño círculo en el origen
    ctx.beginPath();
    ctx.arc(originX, originY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#333333';
    ctx.fill();
    
    // Si estamos en modo corrección y tenemos factores, dibujamos la leyenda
    if (colorMode === 'correction' && correctionFactors) {
      // Cambio: Posición Y aumentada de 20 a 50 para bajar la leyenda
      drawCorrectionLegend(ctx, canvas.width - 120, 50);
    }
    
    // Dibujar los paths originales en gris si showOriginal es true y tenemos originalPaths
    if (showOriginalToggle && originalPaths) {
      originalPaths.forEach(path => {
        ctx.beginPath();
        
        // Transform coordinates to canvas space
        const startX = path.start.x * scale + offset.x;
        const startY = canvas.height - (path.start.y * scale + offset.y);
        const endX = path.end.x * scale + offset.x;
        const endY = canvas.height - (path.end.y * scale + offset.y);
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        
        ctx.strokeStyle = '#aaaaaa'; // Gris para los paths originales
        ctx.lineWidth = 1;
        ctx.setLineDash(path.isRapid ? [5, 3] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
    
    // Draw paths
    paths.forEach((path, index) => {
      ctx.beginPath();
      
      // Transform coordinates to canvas space
      const startX = path.start.x * scale + offset.x;
      const startY = canvas.height - (path.start.y * scale + offset.y);
      const endX = path.end.x * scale + offset.x;
      const endY = canvas.height - (path.end.y * scale + offset.y);
      
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      
      // Determinar el estilo según el modo de color
      const isHighlighted = highlightedLine?.index === index;
      
      if (colorMode === 'correction' && correctionFactors) {
        // Coloreado basado en el factor de corrección
        const correctionFactor = correctionFactors[index] || 0;
        
        if (path.isRapid) {
          // Movimientos rápidos ahora en verde
          ctx.strokeStyle = '#2ECC71'; // Verde para movimientos rápidos
          ctx.setLineDash([5, 3]);
        } else {
          // Interpolación de color: azul (sin corrección) a rojo (máxima corrección)
          const r = Math.floor(0 * (1 - correctionFactor) + 255 * correctionFactor);
          const g = Math.floor(0 * (1 - correctionFactor) + 0 * correctionFactor);
          const b = Math.floor(255 * (1 - correctionFactor) + 0 * correctionFactor);
          ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.setLineDash([]);
        }
        
        ctx.lineWidth = 2;
      } else {
        // Coloración normal
        if (isHighlighted) {
          // Highlighted path style - también usando verde para movimientos rápidos
          ctx.strokeStyle = path.isRapid ? '#66CC66' : '#6666ff'; // Verde brillante o azul brillante
          ctx.lineWidth = 3.0; // Thicker line
        } else {
          // Normal path style - Verde para rápidos, azul para corte
          ctx.strokeStyle = path.isRapid ? '#2ECC71' : '#0000ff';
          ctx.lineWidth = 1.5;
        }
        
        ctx.setLineDash(path.isRapid ? [5, 3] : []);
      }
      
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [scale, offset, highlightedLine, colorMode, correctionFactors, showOriginalToggle, originalPaths]);

  // Re-render when scale or offset change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

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
      let closestLine: {
        index: number;
        path: GCodePath;
        position: { x: number, y: number };
      } | null = null;
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

  // Reset view button handler
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

  return (
    <div className="w-full h-full relative">
      {title && (
        <div className="absolute top-0 left-0 right-0 text-center text-xs font-semibold py-1 bg-gray-100 bg-opacity-75">
          {title}
        </div>
      )}
      
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
          {/* Información de velocidad mejorada mostrando original vs corregida */}
          <div>
            <span className="font-semibold">Velocidad:</span> {formatFeedrate(highlightedLine.path, highlightedLine.index)}
          </div>
          {/* Información adicional para el modo corrección */}
          {colorMode === 'correction' && correctionFactors && (
            <div>
              <span className="font-semibold">Reducción de velocidad:</span> {
                (correctionFactors[highlightedLine.index] * 100).toFixed(1)
              }%
            </div>
          )}
          {/* Información del comando */}
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
