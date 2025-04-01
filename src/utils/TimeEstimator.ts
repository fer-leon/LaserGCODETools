import { GCodePath } from './GCodeParser';

export interface TimeEstimationResult {
  totalTime: number; // Tiempo total en segundos
  rapidTime: number; // Tiempo en movimientos rápidos
  cuttingTime: number; // Tiempo en movimientos de corte
  originalTotalTime?: number; // Tiempo total original (para comparación)
  timeSavings?: number; // Ahorro de tiempo con corrección
}

// Constantes precalculadas para optimizar rendimiento
const DEG_TO_RAD = Math.PI / 180;
const MIN_DIRECTION_CHANGE_ANGLE_RAD = 10 * DEG_TO_RAD; // 10 grados en radianes

export class TimeEstimator {
  // Factor de suavizado para junctions (0-1)
  private static readonly JUNCTION_DEVIATION = 0.05;
  // Velocidad máxima para movimientos rápidos (mm/min)
  private static readonly MAX_RAPID_SPEED = 5000;
  // Precalcular conversión de 60 para evitar divisiones repetidas
  private static readonly MIN_TO_SEC = 1 / 60;

  /**
   * Calcula la distancia entre dos puntos
   */
  private static calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calcula el vector unitario de dirección
   */
  private static calculateDirection(x1: number, y1: number, x2: number, y2: number): { x: number, y: number } {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Retornar vector nulo si la distancia es cero
    if (distance === 0) return { x: 0, y: 0 };
    
    // Vector unitario
    return {
      x: dx / distance,
      y: dy / distance
    };
  }

  /**
   * Calcula el ángulo entre dos vectores de dirección usando el producto escalar
   */
  private static calculateAngle(dir1: { x: number, y: number }, dir2: { x: number, y: number }): number {
    const dotProduct = dir1.x * dir2.x + dir1.y * dir2.y;
    // Limitar el valor entre -1 y 1 para evitar problemas numéricos
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
    const prevVelocity = prevFeedrate * this.MIN_TO_SEC;
    const nextVelocity = nextFeedrate * this.MIN_TO_SEC;
    
    // Calcular el ángulo entre los dos segmentos
    const angle = this.calculateAngle(prevDirection, nextDirection);
    
    // Si el ángulo es casi 0, no es necesario reducir velocidad
    if (angle < MIN_DIRECTION_CHANGE_ANGLE_RAD) {
      return Math.min(prevVelocity, nextVelocity);
    }
    
    // Cálculo optimizado de la velocidad de unión
    const cosAngle = Math.cos(angle);
    const junctionVelocity = Math.sqrt(
      acceleration * this.JUNCTION_DEVIATION / (1 - cosAngle)
    );
    
    // Limitar la velocidad de unión al mínimo de la velocidad anterior y siguiente
    return Math.min(junctionVelocity, prevVelocity, nextVelocity);
  }

  /**
   * Calcula el tiempo para un segmento considerando velocidad de entrada/salida
   */
  private static calculateSegmentTimeWithJunction(
    distance: number, 
    feedrate: number, 
    acceleration: number,
    entryVelocity: number,
    exitVelocity: number,
    isRapid: boolean
  ): number {
    // Si es movimiento rápido, usar velocidad máxima
    const effectiveFeedrate = isRapid ? this.MAX_RAPID_SPEED : feedrate;
    
    // Validaciones rápidas para evitar cálculos innecesarios
    if (distance <= 0 || effectiveFeedrate <= 0 || acceleration <= 0) {
      return 0;
    }

    // Convertir feedrate de mm/min a mm/s
    const maxVelocity = effectiveFeedrate * this.MIN_TO_SEC;
    
    // Limitar las velocidades de entrada y salida a la velocidad máxima
    const v_entry = Math.min(entryVelocity, maxVelocity);
    const v_exit = Math.min(exitVelocity, maxVelocity);
    
    // Precalcular valores utilizados múltiples veces
    const v_max_squared = maxVelocity * maxVelocity;
    const v_entry_squared = v_entry * v_entry;
    const v_exit_squared = v_exit * v_exit;
    const accel_x2 = 2 * acceleration;
    
    // Calcular distancias de aceleración y desaceleración
    const accelDistance = (v_max_squared - v_entry_squared) / accel_x2;
    const decelDistance = (v_max_squared - v_exit_squared) / accel_x2;
    
    // Determinar si hay suficiente distancia para alcanzar velocidad máxima
    if (accelDistance + decelDistance <= distance) {
      // Caso de perfil trapezoidal (alcanza velocidad máxima)
      const accelTime = (maxVelocity - v_entry) / acceleration;
      const decelTime = (maxVelocity - v_exit) / acceleration;
      const constDistance = distance - accelDistance - decelDistance;
      const constTime = constDistance / maxVelocity;
      
      return accelTime + constTime + decelTime;
    } else {
      // Caso de perfil triangular (no alcanza velocidad máxima)
      const vPeakSquared = (accel_x2 * distance + v_entry_squared + v_exit_squared) / 2;
      
      // Caso extremo - distancia muy pequeña
      if (vPeakSquared <= 0) {
        return distance / ((v_entry + v_exit) / 2);
      }
      
      const vPeak = Math.sqrt(vPeakSquared);
      
      // Tiempos de aceleración y desaceleración
      const accelTime = (vPeak - v_entry) / acceleration;
      const decelTime = (vPeak - v_exit) / acceleration;
      
      return accelTime + decelTime;
    }
  }

  /**
   * Estima el tiempo total de ejecución del GCODE considerando velocidades de unión
   */
  public static estimateTime(
    paths: GCodePath[], 
    acceleration: number,
    originalPaths?: GCodePath[]
  ): TimeEstimationResult {
    // Si no hay paths, devolver resultado vacío
    if (!paths.length) {
      return { totalTime: 0, rapidTime: 0, cuttingTime: 0 };
    }
    
    let totalTime = 0;
    let rapidTime = 0;
    let cuttingTime = 0;
    
    // Optimización: Precalcular direcciones y distancias para evitar recálculos
    const directions = new Array(paths.length);
    const distances = new Array(paths.length);
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      directions[i] = this.calculateDirection(
        path.start.x, path.start.y,
        path.end.x, path.end.y
      );
      
      distances[i] = this.calculateDistance(
        path.start.x, path.start.y,
        path.end.x, path.end.y
      );
    }
    
    // Cálculo optimizado del tiempo para cada segmento
    for (let i = 0; i < paths.length; i++) {
      const currentPath = paths[i];
      const distance = distances[i];
      
      // Si la distancia es cero, saltar este segmento
      if (distance === 0) continue;
      
      const isRapid = currentPath.isRapid;
      const feedrate = currentPath.feedrate || 0;
      
      // Determinar velocidad de entrada
      let entryVelocity = 0;
      
      if (i > 0) {
        const prevPath = paths[i - 1];
        
        // Si hay cambio de tipo de movimiento, la velocidad de entrada es cero
        if (prevPath.isRapid !== isRapid) {
          entryVelocity = 0;
        } else {
          // Calcular velocidad de unión con el segmento anterior
          entryVelocity = this.calculateJunctionVelocity(
            directions[i - 1],
            directions[i],
            prevPath.feedrate || 0,
            feedrate,
            acceleration
          );
        }
      }
      
      // Determinar velocidad de salida
      let exitVelocity = 0;
      
      if (i < paths.length - 1) {
        const nextPath = paths[i + 1];
        
        // Si hay cambio de tipo de movimiento, la velocidad de salida es cero
        if (nextPath.isRapid !== isRapid) {
          exitVelocity = 0;
        } else {
          // Calcular velocidad de unión con el segmento siguiente
          exitVelocity = this.calculateJunctionVelocity(
            directions[i],
            directions[i + 1],
            feedrate,
            nextPath.feedrate || 0,
            acceleration
          );
        }
      }
      
      // Calcular tiempo del segmento
      const segmentTime = this.calculateSegmentTimeWithJunction(
        distance,
        feedrate,
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
    let originalTotalTime;
    let timeSavings;
    
    if (originalPaths?.length) {
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
   */
  public static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60); // Usar Math.round en lugar de Math.floor
      return `${minutes} min ${remainingSeconds} seg`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours} h ${remainingMinutes} min`;
    }
  }
}
