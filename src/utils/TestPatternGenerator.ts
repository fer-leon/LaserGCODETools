/**
 * Utility class for generating laser test patterns
 */
export interface TestPatternConfig {
  minSpeed: number;
  maxSpeed: number;
  minPower: number;
  maxPower: number;
  speedSteps: number;
  powerSteps: number;
  squareSize: number;
  spacing: number;
}

export class TestPatternGenerator {
  /**
   * Generates a GCODE test pattern for laser calibration
   */
  static generatePattern(config: TestPatternConfig): string {
    const {
      minSpeed,
      maxSpeed,
      minPower,
      maxPower,
      speedSteps,
      powerSteps,
      squareSize,
      spacing
    } = config;

    let gcode = `;Laser Test Pattern Generator\n`;
    gcode += `;Speed: ${minSpeed}-${maxSpeed} units/min in ${speedSteps} steps\n`;
    gcode += `;Power: ${minPower}-${maxPower}% in ${powerSteps} steps\n`;
    gcode += `;Square Size: ${squareSize}mm, Spacing: ${spacing}mm\n\n`;
    
    // Configuración inicial
    gcode += `G21 ; Set units to millimeters\n`;
    gcode += `G90 ; Absolute positioning\n`;
    gcode += `M5 ; Laser off\n`;
    gcode += `G0 X0 Y0 ; Move to origin\n\n`;

    // Calcular incrementos
    const speedIncrement = (maxSpeed - minSpeed) / (speedSteps - 1 || 1);
    const powerIncrement = (maxPower - minPower) / (powerSteps - 1 || 1);
    
    // Calcular tamaño total de la matriz
    const totalWidth = speedSteps * (squareSize + spacing) - spacing;
    const totalHeight = powerSteps * (squareSize + spacing) - spacing;
    
    // Añadir un rectángulo exterior para delimitar la prueba
    gcode += `; Outer rectangle to mark the test area\n`;
    gcode += `G0 X-${spacing} Y-${spacing} ; Move to start position\n`;
    gcode += `M3 S${Math.round(maxPower * 2.55)} ; Set max power\n`;
    gcode += `G1 X${totalWidth + spacing} Y-${spacing} F${maxSpeed} ; Draw bottom edge\n`;
    gcode += `G1 X${totalWidth + spacing} Y${totalHeight + spacing} ; Draw right edge\n`;
    gcode += `G1 X-${spacing} Y${totalHeight + spacing} ; Draw top edge\n`;
    gcode += `G1 X-${spacing} Y-${spacing} ; Draw left edge\n`;
    gcode += `M5 ; Laser off\n\n`;

    // Crear cuadrados para cada combinación de velocidad y potencia
    for (let p = 0; p < powerSteps; p++) {
      const power = minPower + (powerIncrement * p);
      const normalizedPower = Math.round(power * 2.55); // Convertir porcentaje (0-100) a valor S (0-255)
      
      for (let s = 0; s < speedSteps; s++) {
        const speed = minSpeed + (speedIncrement * s);
        
        // Posición del cuadrado actual
        const xPos = s * (squareSize + spacing);
        const yPos = p * (squareSize + spacing);
        
        gcode += `; Square at Speed ${Math.round(speed)} units/min, Power ${Math.round(power)}%\n`;
        gcode += `G0 X${xPos} Y${yPos} ; Move to start position\n`;
        gcode += `M3 S${normalizedPower} ; Set laser power\n`;
        
        // Dibujar el cuadrado
        gcode += `G1 X${xPos + squareSize} Y${yPos} F${speed} ; Bottom edge\n`;
        gcode += `G1 X${xPos + squareSize} Y${yPos + squareSize} ; Right edge\n`;
        gcode += `G1 X${xPos} Y${yPos + squareSize} ; Top edge\n`;
        gcode += `G1 X${xPos} Y${yPos} ; Left edge\n`;
        gcode += `M5 ; Laser off\n\n`;
      }
    }
    
    // Volver al origen
    gcode += `G0 X0 Y0 ; Return to origin\n`;
    gcode += `M5 ; Ensure laser is off\n`;
    
    return gcode;
  }
}

export default TestPatternGenerator;
