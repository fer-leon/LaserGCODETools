import GCodeParser, { GCodePath, Point2D } from './GCodeParser';

interface CorrectionSettings {
  coefficient: number; // 0-1, grado de corrección
  axis: 'X' | 'Y';     // Eje a corregir
}

interface CorrectionResult {
  originalPaths: GCodePath[];
  correctedPaths: GCodePath[];
  correctionFactors: number[]; // Valor de corrección (0-1) para cada línea
}

export class GCodeCorrector {
  private parser: GCodeParser;

  constructor() {
    this.parser = new GCodeParser();
  }

  /**
   * Aplica correcciones al GCODE según los ajustes dados
   */
  applyCorrection(gcode: string, settings: CorrectionSettings): CorrectionResult {
    // Parsear primero el GCODE original
    this.parser.parseGCode(gcode);
    const originalPaths = this.parser.getPaths();
    
    // Crear arrays para almacenar resultados
    const correctedPaths: GCodePath[] = [];
    const correctionFactors: number[] = [];

    // Aplicar corrección a cada línea
    originalPaths.forEach(path => {
      // Calcular la pendiente de la línea
      const dx = path.end.x - path.start.x;
      const dy = path.end.y - path.start.y;
      
      // Evitar división por cero
      if (dx === 0 && dy === 0) {
        // Punto a punto, no se aplica corrección
        correctedPaths.push({...path});
        correctionFactors.push(0);
        return;
      }
      
      // Calcular factor de corrección según la pendiente
      let correctionFactor = 0;
      
      if (settings.axis === 'X') {
        // Para corrección en X, la corrección es proporcional al ángulo con el eje X
        // Una línea horizontal (dy=0) tiene factor 0, una vertical tiene factor 1
        correctionFactor = Math.abs(dy) / (Math.abs(dx) + Math.abs(dy));
      } else {
        // Para corrección en Y, la corrección es proporcional al ángulo con el eje Y
        // Una línea vertical (dx=0) tiene factor 0, una horizontal tiene factor 1
        correctionFactor = Math.abs(dx) / (Math.abs(dx) + Math.abs(dy));
      }
      
      // Aplicar coeficiente de corrección global
      correctionFactor *= settings.coefficient;
      
      // Guardamos el factor para visualización
      correctionFactors.push(correctionFactor);
      
      // Crear una copia del path original
      const correctedPath = {...path};
      
      // Si es un movimiento de corte (no rápido), aplicamos corrección a la velocidad
      if (!path.isRapid && path.feedrate) {
        // Reducir la velocidad según el factor de corrección
        // Cuanto mayor sea el factor de corrección, más se reduce la velocidad
        const reductionFactor = 1 - correctionFactor;
        correctedPath.feedrate = path.feedrate * reductionFactor;
      }
      
      correctedPaths.push(correctedPath);
    });

    return {
      originalPaths,
      correctedPaths,
      correctionFactors
    };
  }

  /**
   * Genera un GCODE nuevo con las correcciones aplicadas
   */
  generateCorrectedGCode(gcode: string, settings: CorrectionSettings): string {
    // Aplicar correcciones
    const { correctedPaths } = this.applyCorrection(gcode, settings);
    
    // Aquí transformaríamos los paths corregidos de nuevo a texto GCODE
    // Esta implementación dependería de la estructura exacta del GCODE original
    
    // Para este ejemplo simplificado, solo devolvemos el GCODE original
    // Una implementación real reconstruiría el GCODE con las velocidades corregidas
    return gcode;
  }
}

export default GCodeCorrector;
