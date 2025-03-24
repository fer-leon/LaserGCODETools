import { GCodePath } from './GCodeParser';

export interface TimeEstimationResult {
  totalTime: number; // Tiempo total en segundos
  rapidTime: number; // Tiempo en movimientos rápidos
  cuttingTime: number; // Tiempo en movimientos de corte
  originalTotalTime?: number; // Tiempo total original (para comparación)
  timeSavings?: number; // Ahorro de tiempo con corrección
}

export class TimeEstimator {
  // Ángulo mínimo para considerar un cambio significativo de dirección
  private static readonly MIN_DIRECTION_CHANGE_ANGLE = 10 * (Math.PI / 180); // 10 grados en radianes
  // Factor de suavizado para junctions (0-1)
  private static readonly JUNCTION_DEVIATION = 0.05;

  /**
   * Calcula la distancia entre dos puntos
   */
  private static calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Calcula el vector unitario de dirección
   */
  private static calculateDirection(x1: number, y1: number, x2: number, y2: number): { x: number, y: number } {
    const distance = this.calculateDistance(x1, y1, x2, y2);
    if (distance === 0) return { x: 0, y: 0 };
    return {
      x: (x2 - x1) / distance,
      y: (y2 - y1) / distance
    };
  }

  /**
   * Calcula el ángulo entre dos vectores de dirección
   */
  private static calculateAngle(dir1: { x: number, y: number }, dir2: { x: number, y: number }): number {
    const dotProduct = dir1.x * dir2.x + dir1.y * dir2.y;
    return Math.acos(Math.min(Math.max(dotProduct, -1), 1));
  }

  /**
   * Calcula la velocidad máxima en la unión entre dos segmentos
   */
  private static calculateJunctionVelocity(
    prevDirection: { x: number, y: number },
    nextDirection: { x: number, y: number },
    prevFeedrate: number,
    nextFeedrate: number,
    acceleration: number
  ): number {
    // Convertir feedrates de mm/min a mm/s
    const prevVelocity = prevFeedrate / 60;
    const nextVelocity = nextFeedrate / 60;
    
    // Calcular el ángulo entre los dos segmentos
    const angle = this.calculateAngle(prevDirection, nextDirection);
    
    // Si el ángulo es casi 0, no es necesario reducir velocidad
    if (angle < this.MIN_DIRECTION_CHANGE_ANGLE) {
      return Math.min(prevVelocity, nextVelocity);
    }
    
    // A mayor ángulo, menor velocidad en la unión
    // Fórmula basada en el concepto de "centripetal acceleration"
    const cosAngle = Math.cos(angle);
    const junctionDeviation = this.JUNCTION_DEVIATION;
    
    // Velocidad de unión considerando la aceleración centrípeta
    // v_junction = sqrt(a * r), donde r es el radio y a es la aceleración
    const junctionVelocity = Math.sqrt(
      acceleration * junctionDeviation / (1 - cosAngle)
    );
    
    // Limitar la velocidad de unión al mínimo de la velocidad anterior y siguiente
    return Math.min(junctionVelocity, prevVelocity, nextVelocity);
  }

  /**
   * Calcula el tiempo para un segmento considerando velocidad de entrada/salida
   * @param distance Distancia en mm
   * @param feedrate Velocidad en mm/min
   * @param acceleration Aceleración en mm/s²
   * @param entryVelocity Velocidad al entrar al segmento en mm/s
   * @param exitVelocity Velocidad al salir del segmento en mm/s
   * @param isRapid Si es un movimiento rápido
   */
  private static calculateSegmentTimeWithJunction(
    distance: number, 
    feedrate: number, 
    acceleration: number,
    entryVelocity: number,
    exitVelocity: number,
    isRapid: boolean
  ): number {
    // Si es movimiento rápido, asumimos velocidad máxima de la máquina
    const effectiveFeedrate = isRapid ? 5000 : feedrate; // mm/min
    
    if (distance <= 0 || effectiveFeedrate <= 0 || acceleration <= 0) {
      return 0;
    }

    // Convertir feedrate de mm/min a mm/s
    const maxVelocity = effectiveFeedrate / 60; // mm/s
    
    // Limitar las velocidades de entrada y salida a la velocidad máxima
    const v_entry = Math.min(entryVelocity, maxVelocity);
    const v_exit = Math.min(exitVelocity, maxVelocity);
    
    // Calcular la distancia necesaria para acelerar de v_entry a maxVelocity
    // d_accel = (v_max² - v_entry²) / (2 * a)
    const accelDistance = (Math.pow(maxVelocity, 2) - Math.pow(v_entry, 2)) / (2 * acceleration);
    
    // Calcular la distancia necesaria para desacelerar de maxVelocity a v_exit
    // d_decel = (v_max² - v_exit²) / (2 * a)
    const decelDistance = (Math.pow(maxVelocity, 2) - Math.pow(v_exit, 2)) / (2 * acceleration);
    
    // Comprobar si hay suficiente distancia para alcanzar velocidad máxima
    if (accelDistance + decelDistance <= distance) {
      // Caso 1: Hay suficiente distancia para alcanzar velocidad máxima (trapezoide)
      // Tiempo para acelerar de v_entry a maxVelocity
      const accelTime = (maxVelocity - v_entry) / acceleration;
      // Tiempo para desacelerar de maxVelocity a v_exit
      const decelTime = (maxVelocity - v_exit) / acceleration;
      // Distancia recorrida a velocidad constante
      const constDistance = distance - accelDistance - decelDistance;
      // Tiempo a velocidad constante
      const constTime = constDistance / maxVelocity;
      
      return accelTime + constTime + decelTime;
    } else {
      // Caso 2: No hay suficiente distancia para alcanzar velocidad máxima (triángulo)
      // Calcular la velocidad pico alcanzable
      // Fórmula derivada de: d = (v_peak² - v_entry²)/(2*a) + (v_peak² - v_exit²)/(2*a)
      const vPeakSquared = (2 * acceleration * distance + Math.pow(v_entry, 2) + Math.pow(v_exit, 2)) / 2;
      
      if (vPeakSquared <= 0) {
        // Caso extremo - no hay suficiente distancia incluso para el triángulo
        return distance / ((v_entry + v_exit) / 2);
      }
      
      const vPeak = Math.sqrt(vPeakSquared);
      
      // Tiempo para acelerar de v_entry a vPeak
      const accelTime = (vPeak - v_entry) / acceleration;
      // Tiempo para desacelerar de vPeak a v_exit
      const decelTime = (vPeak - v_exit) / acceleration;
      
      return accelTime + decelTime;
    }
  }

  /**
   * Estima el tiempo total de ejecución del GCODE considerando velocidades de unión
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
    
    // Si no hay paths, devolver resultado vacío
    if (paths.length === 0) {
      return { totalTime: 0, rapidTime: 0, cuttingTime: 0 };
    }
    
    // Calcular tiempo para cada segmento teniendo en cuenta las junctions
    for (let i = 0; i < paths.length; i++) {
      const currentPath = paths[i];
      const nextPath = i < paths.length - 1 ? paths[i + 1] : null;
      const prevPath = i > 0 ? paths[i - 1] : null;
      
      const distance = this.calculateDistance(
        currentPath.start.x, currentPath.start.y, 
        currentPath.end.x, currentPath.end.y
      );
      
      // Si la distancia es cero, saltar este segmento
      if (distance === 0) continue;
      
      // Convertir feedrate a mm/s
      const currentFeedrate = (currentPath.feedrate || 0) / 60;
      const isRapid = currentPath.isRapid;
      
      // Calcular dirección del segmento actual
      const currentDirection = this.calculateDirection(
        currentPath.start.x, currentPath.start.y,
        currentPath.end.x, currentPath.end.y
      );
      
      // Determinar velocidad de entrada
      let entryVelocity = 0; // Por defecto, empezamos desde cero
      
      if (prevPath) {
        const prevDirection = this.calculateDirection(
          prevPath.start.x, prevPath.start.y,
          prevPath.end.x, prevPath.end.y
        );
        
        const prevFeedrate = prevPath.feedrate || 0;
        const currentFeedrateInMMperMin = currentPath.feedrate || 0;
        
        // Cambio de movimiento rápido a corte o viceversa siempre implica parar
        if (prevPath.isRapid !== currentPath.isRapid) {
          entryVelocity = 0;
        } else {
          // Calcular velocidad de unión
          entryVelocity = this.calculateJunctionVelocity(
            prevDirection, 
            currentDirection, 
            prevFeedrate, 
            currentFeedrateInMMperMin, 
            acceleration
          );
        }
      }
      
      // Determinar velocidad de salida
      let exitVelocity = 0; // Por defecto, terminamos en cero
      
      if (nextPath) {
        const nextDirection = this.calculateDirection(
          nextPath.start.x, nextPath.start.y,
          nextPath.end.x, nextPath.end.y
        );
        
        const nextFeedrate = nextPath.feedrate || 0;
        const currentFeedrateInMMperMin = currentPath.feedrate || 0;
        
        // Cambio de movimiento rápido a corte o viceversa siempre implica parar
        if (nextPath.isRapid !== currentPath.isRapid) {
          exitVelocity = 0;
        } else {
          // Calcular velocidad de unión
          exitVelocity = this.calculateJunctionVelocity(
            currentDirection, 
            nextDirection, 
            currentFeedrateInMMperMin, 
            nextFeedrate, 
            acceleration
          );
        }
      }
      
      // Calcular tiempo del segmento
      const segmentTime = this.calculateSegmentTimeWithJunction(
        distance,
        currentPath.feedrate || 0,
        acceleration,
        entryVelocity,
        exitVelocity,
        isRapid
      );
      
      totalTime += segmentTime;
      
      if (isRapid) {
        rapidTime += segmentTime;
      } else {
        cuttingTime += segmentTime;
      }
    }
    
    // Si se proporcionaron paths originales, calcular su tiempo también
    let originalTotalTime = undefined;
    let timeSavings = undefined;
    
    if (originalPaths && originalPaths.length > 0) {
      const originalEstimation = this.estimateTime(originalPaths, acceleration);
      originalTotalTime = originalEstimation.totalTime;
      timeSavings = Math.max(0, originalTotalTime - totalTime);
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
      return `${seconds.toFixed(1)} seconds`;
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
