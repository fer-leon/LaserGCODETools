import { GCodePath } from './GCodeParser';

export interface TimeEstimationResult {
  totalTime: number; // Tiempo total en segundos
  rapidTime: number; // Tiempo en movimientos rápidos
  cuttingTime: number; // Tiempo en movimientos de corte
  originalTotalTime?: number; // Tiempo total original (para comparación)
  timeSavings?: number; // Ahorro de tiempo con corrección
}

export class TimeEstimator {
  /**
   * Calcula la distancia entre dos puntos
   */
  private static calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Calcula el tiempo para un segmento de GCODE considerando la aceleración
   * @param distance Distancia en mm
   * @param feedrate Velocidad en mm/min
   * @param acceleration Aceleración en mm/s²
   * @param isRapid Si es un movimiento rápido
   */
  private static calculateSegmentTime(
    distance: number, 
    feedrate: number, 
    acceleration: number, 
    isRapid: boolean
  ): number {
    // Si es movimiento rápido, asumimos velocidad máxima de la máquina
    const effectiveFeedrate = isRapid ? 5000 : feedrate; // mm/min
    
    if (distance <= 0 || effectiveFeedrate <= 0 || acceleration <= 0) {
      return 0;
    }

    // Convertir feedrate de mm/min a mm/s
    const maxVelocity = effectiveFeedrate / 60; // mm/s
    
    // Calcular distancia necesaria para acelerar hasta velocidad máxima
    // Fórmula: d = v²/(2*a)
    const accelerationDistance = Math.pow(maxVelocity, 2) / (2 * acceleration);
    
    // Comprobar si el segmento es suficientemente largo para alcanzar velocidad máxima
    if (distance >= 2 * accelerationDistance) {
      // Caso 1: Suficiente distancia para alcanzar velocidad máxima (trapezoide)
      // Tiempo para acelerar + tiempo a velocidad constante + tiempo para desacelerar
      const accelerationTime = maxVelocity / acceleration;
      const constantVelocityDistance = distance - 2 * accelerationDistance;
      const constantVelocityTime = constantVelocityDistance / maxVelocity;
      
      return 2 * accelerationTime + constantVelocityTime;
    } else {
      // Caso 2: No hay suficiente distancia para alcanzar velocidad máxima (triángulo)
      // La velocidad pico alcanzable es menor que maxVelocity
      // Fórmula: v_peak = sqrt(a * d)
      const peakVelocity = Math.sqrt(acceleration * distance / 2);
      const accelerationTime = peakVelocity / acceleration;
      
      return 2 * accelerationTime;
    }
  }

  /**
   * Estima el tiempo total de ejecución del GCODE
   * @param paths Paths de GCODE
   * @param acceleration Aceleración en mm/s²
   * @param originalPaths Paths originales para comparación (opcional)
   */
  public static estimateTime(
    paths: GCodePath[], 
    acceleration: number,
    originalPaths?: GCodePath[]
  ): TimeEstimationResult {
    let totalTime = 0;
    let rapidTime = 0;
    let cuttingTime = 0;
    
    // Calcular tiempo para cada segmento
    paths.forEach(path => {
      const distance = this.calculateDistance(
        path.start.x, path.start.y, 
        path.end.x, path.end.y
      );
      
      const segmentTime = this.calculateSegmentTime(
        distance,
        path.feedrate || 0,
        acceleration,
        path.isRapid
      );
      
      totalTime += segmentTime;
      
      if (path.isRapid) {
        rapidTime += segmentTime;
      } else {
        cuttingTime += segmentTime;
      }
    });
    
    // Si se proporcionaron paths originales, calcular su tiempo también
    let originalTotalTime = undefined;
    let timeSavings = undefined;
    
    if (originalPaths) {
      let origTime = 0;
      
      originalPaths.forEach(path => {
        const distance = this.calculateDistance(
          path.start.x, path.start.y, 
          path.end.x, path.end.y
        );
        
        const segmentTime = this.calculateSegmentTime(
          distance,
          path.feedrate || 0,
          acceleration,
          path.isRapid
        );
        
        origTime += segmentTime;
      });
      
      originalTotalTime = origTime;
      timeSavings = Math.max(0, origTime - totalTime);
    }
    
    return {
      totalTime,
      rapidTime,
      cuttingTime,
      originalTotalTime,
      timeSavings
    };
  }
  
  /**
   * Formatea un tiempo en segundos a una cadena legible
   * @param seconds Tiempo en segundos
   */
  public static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)} segundos`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} min ${remainingSeconds.toFixed(0)} seg`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours} h ${remainingMinutes} min`;
    }
  }
}
