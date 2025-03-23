import GCodeParser, { GCodePath, GCodeCommand } from "./GCodeParser";

interface CorrectionOptions {
  coefficient: number;  // Factor de corrección (0-1)
  axis: 'X' | 'Y';      // Eje a corregir
}

class GCodeCorrector {
  /**
   * Aplica una corrección de velocidad basada en la posición en un eje específico
   */
  applyCorrection(gcode: string, options: CorrectionOptions) {
    const parser = new GCodeParser();
    parser.parseGCode(gcode);
    
    // Obtener los paths originales
    const originalPaths = parser.getPaths();
    
    // Encontrar el rango del eje seleccionado
    const bbox = parser.getBoundingBox();
    const minPos = options.axis === 'X' ? bbox.min.x : bbox.min.y;
    const maxPos = options.axis === 'X' ? bbox.max.x : bbox.max.y;
    const range = maxPos - minPos;
    
    // Crear copias de los paths para aplicar corrección
    const correctedPaths: GCodePath[] = [];
    const correctionFactors: number[] = [];
    
    // Construir el GCODE corregido
    let correctedGCode = '';
    const originalLines = gcode.split('\n');
    let currentLineIndex = 0;
    
    // Procesar cada path
    originalPaths.forEach((path, i) => {
      // Ignorar movimientos rápidos (G0)
      if (path.isRapid) {
        correctedPaths.push({...path});
        correctionFactors.push(0); // No correction for rapid moves
        
        // Añadir esta línea sin cambios al GCODE corregido
        if (path.command && path.command.lineNumber !== undefined) {
          while (currentLineIndex <= path.command.lineNumber) {
            correctedGCode += originalLines[currentLineIndex] + '\n';
            currentLineIndex++;
          }
        }
        return;
      }
      
      // Calcular posición relativa en el eje (0-1)
      const startPos = options.axis === 'X' ? path.start.x : path.start.y;
      const endPos = options.axis === 'X' ? path.end.x : path.end.y;
      
      // Usar la posición media del segmento
      const midPos = (startPos + endPos) / 2;
      const relativePos = range ? (midPos - minPos) / range : 0;
      
      // Calcular factor de corrección basado en la posición
      // Más cerca a 1.0 significa más reducción en la velocidad
      const correctionFactor = options.coefficient * relativePos;
      correctionFactors.push(correctionFactor);
      
      // Aplicar corrección a la velocidad (feedrate)
      const originalFeedrate = path.feedrate || 0;
      const correctedFeedrate = originalFeedrate * (1 - correctionFactor);
      
      // Crear copia del path con velocidad corregida
      correctedPaths.push({
        ...path,
        feedrate: correctedFeedrate
      });
      
      // Modificar el GCODE para este comando
      if (path.command && path.command.lineNumber !== undefined) {
        // Copiar todas las líneas hasta este comando
        while (currentLineIndex < path.command.lineNumber) {
          correctedGCode += originalLines[currentLineIndex] + '\n';
          currentLineIndex++;
        }
        
        // Ahora estamos en la línea del comando
        const line = originalLines[currentLineIndex];
        
        // Si el comando tiene feedrate (F), reemplazarlo
        if (path.command.params.F !== undefined) {
          // Crear un nuevo comando con la velocidad corregida
          const correctedLine = line.replace(/F\d+(\.\d+)?/, `F${Math.round(correctedFeedrate)}`);
          correctedGCode += correctedLine + '\n';
        } else {
          // Si no tiene F, añadir uno
          const commentIndex = line.indexOf(';');
          if (commentIndex >= 0) {
            // Si hay un comentario, insertar antes del comentario
            correctedGCode += line.substring(0, commentIndex) + 
                             ` F${Math.round(correctedFeedrate)} ` + 
                             line.substring(commentIndex) + '\n';
          } else {
            // Si no hay comentario, añadir al final
            correctedGCode += line + ` F${Math.round(correctedFeedrate)}` + '\n';
          }
        }
        
        currentLineIndex++;
      }
    });
    
    // Añadir el resto de líneas
    while (currentLineIndex < originalLines.length) {
      correctedGCode += originalLines[currentLineIndex] + '\n';
      currentLineIndex++;
    }
    
    return {
      originalPaths,
      correctedPaths,
      correctionFactors,
      correctedGCode
    };
  }
}

export default GCodeCorrector;
