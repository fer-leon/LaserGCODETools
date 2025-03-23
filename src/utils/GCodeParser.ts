interface GCodeCommand {
  code: string;
  params: Record<string, number>;
  lineNumber: number;
  comment?: string;
}

interface Point2D {
  x: number;
  y: number;
}

interface GCodePath {
  start: Point2D;
  end: Point2D;
  isRapid: boolean; // G0 commands are rapid movements
}

export class GCodeParser {
  private currentPosition: Point2D = { x: 0, y: 0 };
  private paths: GCodePath[] = [];
  private commands: GCodeCommand[] = [];

  parseGCode(gcode: string): void {
    this.commands = [];
    this.paths = [];
    this.currentPosition = { x: 0, y: 0 };

    const lines = gcode.split('\n');
    
    lines.forEach((line, index) => {
      // Remove comments
      const commentIndex = line.indexOf(';');
      const comment = commentIndex !== -1 ? line.slice(commentIndex + 1).trim() : undefined;
      const cleanLine = commentIndex !== -1 ? line.slice(0, commentIndex).trim() : line.trim();
      
      if (!cleanLine) return; // Skip empty lines
      
      // Parse the command
      const command = this.parseCommand(cleanLine, index, comment);
      if (command) {
        this.commands.push(command);
        this.processCommand(command);
      }
    });
  }

  private parseCommand(line: string, lineNumber: number, comment?: string): GCodeCommand | null {
    // Basic regex to match G/M code and parameters
    const codeMatch = line.match(/^([GM]\d+)/);
    if (!codeMatch) return null;

    const code = codeMatch[1];
    const params: Record<string, number> = {};

    // Match parameters like X10 Y20 Z30, but we'll only use X and Y for 2D
    const paramMatches = line.matchAll(/([XYZIJKF])([+-]?\d*\.?\d+)/g);
    for (const match of paramMatches) {
      params[match[1]] = parseFloat(match[2]);
    }

    return { code, params, lineNumber, comment };
  }

  private processCommand(command: GCodeCommand): void {
    // Handle different G codes
    if (command.code === 'G0' || command.code === 'G1') {
      const newPosition = { ...this.currentPosition };
      
      // Update position with any specified coordinates (only X and Y for 2D)
      if ('X' in command.params) newPosition.x = command.params.X;
      if ('Y' in command.params) newPosition.y = command.params.Y;

      // Create a path from current position to new position
      this.paths.push({
        start: { ...this.currentPosition },
        end: { ...newPosition },
        isRapid: command.code === 'G0'
      });

      // Update current position
      this.currentPosition = newPosition;
    }
    // Add more command handling as needed (G2/G3 for arcs, etc.)
  }

  getPaths(): GCodePath[] {
    return this.paths;
  }

  getCommands(): GCodeCommand[] {
    return this.commands;
  }

  getBoundingBox(): { min: Point2D, max: Point2D } {
    let min = { x: Infinity, y: Infinity };
    let max = { x: -Infinity, y: -Infinity };

    this.paths.forEach(path => {
      // Check start point
      min.x = Math.min(min.x, path.start.x);
      min.y = Math.min(min.y, path.start.y);
      max.x = Math.max(max.x, path.start.x);
      max.y = Math.max(max.y, path.start.y);

      // Check end point
      min.x = Math.min(min.x, path.end.x);
      min.y = Math.min(min.y, path.end.y);
      max.x = Math.max(max.x, path.end.x);
      max.y = Math.max(max.y, path.end.y);
    });

    return { min, max };
  }

  // Nuevo método para calcular el centroide geométrico
  getCentroid(): Point2D {
    if (this.paths.length === 0) {
      return { x: 0, y: 0 };
    }

    // Recolectar todos los puntos únicos (inicio y fin de cada trayecto)
    const pointsMap = new Map<string, Point2D>();
    
    this.paths.forEach(path => {
      // Usar un string como clave para identificar puntos únicos
      // Redondeamos a 4 decimales para evitar problemas de precisión de punto flotante
      const startKey = `${path.start.x.toFixed(4)},${path.start.y.toFixed(4)}`;
      const endKey = `${path.end.x.toFixed(4)},${path.end.y.toFixed(4)}`;
      
      pointsMap.set(startKey, path.start);
      pointsMap.set(endKey, path.end);
    });

    // Convertir el mapa a un array de puntos únicos
    const uniquePoints = Array.from(pointsMap.values());
    
    // Calcular el centroide como el promedio de todos los puntos
    const centroid = { x: 0, y: 0 };
    uniquePoints.forEach(point => {
      centroid.x += point.x;
      centroid.y += point.y;
    });
    
    centroid.x /= uniquePoints.length;
    centroid.y /= uniquePoints.length;
    
    return centroid;
  }
}

export default GCodeParser;
