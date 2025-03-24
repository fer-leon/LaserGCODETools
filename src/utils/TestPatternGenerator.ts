/**
 * Utility class for generating laser test patterns
 */
export type TestParameterType = 'power' | 'speed' | 'correction';

export interface AxisConfig {
  parameterType: TestParameterType;
  minValue: number;
  maxValue: number;
  steps: number;
}

export interface TestPatternConfig {
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  fixedPower?: number; // Fixed power if not on any axis
  fixedSpeed?: number; // Fixed speed if not on any axis
  squareSize: number;
  spacing: number;
  correctionAxis?: 'X' | 'Y'; // Eje al que se aplica la corrección
}

export class TestPatternGenerator {
  /**
   * Generates a GCODE test pattern for laser calibration
   */
  static generatePattern(config: TestPatternConfig): string {
    const {
      xAxis,
      yAxis,
      fixedPower,
      fixedSpeed,
      squareSize,
      spacing,
      correctionAxis = 'X' // Valor por defecto: X
    } = config;

    // Validate configuration
    if (xAxis.parameterType === yAxis.parameterType) {
      throw new Error(`Cannot use the same parameter (${xAxis.parameterType}) on both axes`);
    }

    // Check for required fixed values
    if (xAxis.parameterType !== 'power' && yAxis.parameterType !== 'power' && fixedPower === undefined) {
      throw new Error('Fixed power must be provided if power is not on any axis');
    }
    if (xAxis.parameterType !== 'speed' && yAxis.parameterType !== 'speed' && fixedSpeed === undefined) {
      throw new Error('Fixed speed must be provided if speed is not on any axis');
    }

    let gcode = `;Laser Test Pattern Generator\n`;
    gcode += `;X Axis: ${xAxis.parameterType} from ${xAxis.minValue} to ${xAxis.maxValue} in ${xAxis.steps} steps\n`;
    gcode += `;Y Axis: ${yAxis.parameterType} from ${yAxis.minValue} to ${yAxis.maxValue} in ${yAxis.steps} steps\n`;
    
    // Add fixed parameter info to GCODE header
    if (fixedPower !== undefined) {
      gcode += `;Fixed Power: ${fixedPower}%\n`;
    }
    if (fixedSpeed !== undefined) {
      gcode += `;Fixed Speed: ${fixedSpeed} units/min\n`;
    }
    
    // Agregar información sobre el eje de corrección si se usa corrección
    if (xAxis.parameterType === 'correction' || yAxis.parameterType === 'correction') {
      gcode += `;Correction Axis: ${correctionAxis} (axis with lower efficiency)\n`;
    }
    
    gcode += `;Square Size: ${squareSize}mm, Spacing: ${spacing}mm\n\n`;
    
    // Initial configuration
    gcode += `G21 ; Set units to millimeters\n`;
    gcode += `G90 ; Absolute positioning\n`;
    gcode += `M5 ; Laser off\n`;
    gcode += `G0 X0 Y0 ; Move to origin\n\n`;

    // Calculate increments for each axis
    const xIncrement = (xAxis.maxValue - xAxis.minValue) / (xAxis.steps - 1 || 1);
    const yIncrement = (yAxis.maxValue - yAxis.minValue) / (yAxis.steps - 1 || 1);
    
    // Calculate matrix total size
    const totalWidth = xAxis.steps * (squareSize + spacing) - spacing;
    const totalHeight = yAxis.steps * (squareSize + spacing) - spacing;
    
    // Add outer rectangle to mark test area
    gcode += `; Outer rectangle to mark the test area\n`;
    gcode += `G0 X-${spacing} Y-${spacing} ; Move to start position\n`;
    
    // Use max power for drawing the border
    const borderPower = (xAxis.parameterType === 'power' ? xAxis.maxValue : 
                         (yAxis.parameterType === 'power' ? yAxis.maxValue : 
                         (fixedPower || 80)));
    
    // Use max speed for drawing the border or a reasonable value
    const borderSpeed = (xAxis.parameterType === 'speed' ? xAxis.maxValue : 
                         (yAxis.parameterType === 'speed' ? yAxis.maxValue : 
                         (fixedSpeed || 3000)));
    
    // Convertir porcentaje (0-100) a valor S (0-1000)
    gcode += `M3 S${Math.round(borderPower * 10)} ; Set border power\n`;
    gcode += `G1 X${totalWidth + spacing} Y-${spacing} F${borderSpeed} ; Draw bottom edge\n`;
    gcode += `G1 X${totalWidth + spacing} Y${totalHeight + spacing} ; Draw right edge\n`;
    gcode += `G1 X-${spacing} Y${totalHeight + spacing} ; Draw top edge\n`;
    gcode += `G1 X-${spacing} Y-${spacing} ; Draw left edge\n`;
    gcode += `M5 ; Laser off\n\n`;

    // Create squares for each combination of values
    for (let y = 0; y < yAxis.steps; y++) {
      const yValue = yAxis.minValue + (yIncrement * y);
      
      for (let x = 0; x < xAxis.steps; x++) {
        const xValue = xAxis.minValue + (xIncrement * x);
        
        // Determine the specific values for this square
        let power: number, speed: number, correction: number = 0;
        
        // Set power
        if (xAxis.parameterType === 'power') power = xValue;
        else if (yAxis.parameterType === 'power') power = yValue;
        else power = fixedPower!;
        
        // Set speed
        if (xAxis.parameterType === 'speed') speed = xValue;
        else if (yAxis.parameterType === 'speed') speed = yValue;
        else speed = fixedSpeed!;
        
        // Set correction (only if it's being tested)
        if (xAxis.parameterType === 'correction') correction = xValue;
        else if (yAxis.parameterType === 'correction') correction = yValue;
        
        // Calculate position of this square
        const xPos = x * (squareSize + spacing);
        const yPos = y * (squareSize + spacing);
        
        // Convert power from percentage to S value (0-1000)
        const normalizedPower = Math.round(power * 10);
        
        // Add description comment
        gcode += `; Square at X${x}Y${y}: `;
        if (xAxis.parameterType === 'power') gcode += `Power-X=${Math.round(xValue)}%, `;
        if (yAxis.parameterType === 'power') gcode += `Power-Y=${Math.round(yValue)}%, `;
        if (xAxis.parameterType === 'speed') gcode += `Speed-X=${Math.round(xValue)}, `;
        if (yAxis.parameterType === 'speed') gcode += `Speed-Y=${Math.round(yValue)}, `;
        if (xAxis.parameterType === 'correction') gcode += `Correction-X=${xValue.toFixed(2)}, `;
        if (yAxis.parameterType === 'correction') gcode += `Correction-Y=${yValue.toFixed(2)}, `;
        gcode += `Final: Speed=${Math.round(speed)}, Power=${Math.round(power)}%\n`;
        
        // Draw the square with orientation-based correction
        gcode += `G0 X${xPos} Y${yPos} ; Move to start position\n`;
        gcode += `M3 S${normalizedPower} ; Set laser power\n`;
        
        // Applied orientation and correction as follows:
        // - Horizontal moves: affected by Y axis correction
        // - Vertical moves: affected by X axis correction

        // Bottom horizontal edge - X direction
        let orientationFactor = correctionAxis === 'Y' ? 1 : 0; // Y axis affects horizontal moves
        let correctedSpeed = speed * (1 - correction * orientationFactor);
        gcode += `G1 X${xPos + squareSize} Y${yPos} F${Math.round(correctedSpeed)} ; Bottom edge (horizontal)\n`;
        
        // Right vertical edge - Y direction
        orientationFactor = correctionAxis === 'X' ? 1 : 0; // X axis affects vertical moves
        correctedSpeed = speed * (1 - correction * orientationFactor);
        gcode += `G1 X${xPos + squareSize} Y${yPos + squareSize} F${Math.round(correctedSpeed)} ; Right edge (vertical)\n`;
        
        // Top horizontal edge - X direction
        orientationFactor = correctionAxis === 'Y' ? 1 : 0; // Y axis affects horizontal moves
        correctedSpeed = speed * (1 - correction * orientationFactor);
        gcode += `G1 X${xPos} Y${yPos + squareSize} F${Math.round(correctedSpeed)} ; Top edge (horizontal)\n`;
        
        // Left vertical edge - Y direction
        orientationFactor = correctionAxis === 'X' ? 1 : 0; // X axis affects vertical moves
        correctedSpeed = speed * (1 - correction * orientationFactor);
        gcode += `G1 X${xPos} Y${yPos} F${Math.round(correctedSpeed)} ; Left edge (vertical)\n`;
        
        gcode += `M5 ; Laser off\n\n`;
      }
    }
    
    // Add axis labels
    this.addAxisLabels(gcode, xAxis, yAxis, squareSize, spacing);
    
    // Return to origin
    gcode += `G0 X0 Y0 ; Return to origin\n`;
    gcode += `M5 ; Ensure laser is off\n`;
    
    return gcode;
  }
  
  /**
   * Adds label comments for the axes
   */
  private static addAxisLabels(
    gcode: string,
    xAxis: AxisConfig,
    yAxis: AxisConfig,
    squareSize: number,
    spacing: number
  ): string {
    // Add X-axis labels
    gcode += `\n; X-axis labels (${xAxis.parameterType})\n`;
    for (let x = 0; x < xAxis.steps; x++) {
      const value = xAxis.minValue + ((xAxis.maxValue - xAxis.minValue) / (xAxis.steps - 1 || 1)) * x;
      const xCenter = x * (squareSize + spacing) + squareSize / 2;
      
      let labelText = '';
      if (xAxis.parameterType === 'power') labelText = `${Math.round(value)}%`;
      else if (xAxis.parameterType === 'speed') labelText = `${Math.round(value)}`;
      else if (xAxis.parameterType === 'correction') labelText = value.toFixed(2);
      
      gcode += `; X-Label at X=${xCenter} Y=-${spacing/2}: ${labelText}\n`;
    }
    
    // Add Y-axis labels
    gcode += `\n; Y-axis labels (${yAxis.parameterType})\n`;
    for (let y = 0; y < yAxis.steps; y++) {
      const value = yAxis.minValue + ((yAxis.maxValue - yAxis.minValue) / (yAxis.steps - 1 || 1)) * y;
      const yCenter = y * (squareSize + spacing) + squareSize / 2;
      
      let labelText = '';
      if (yAxis.parameterType === 'power') labelText = `${Math.round(value)}%`;
      else if (yAxis.parameterType === 'speed') labelText = `${Math.round(value)}`;
      else if (yAxis.parameterType === 'correction') labelText = value.toFixed(2);
      
      gcode += `; Y-Label at X=-${spacing/2} Y=${yCenter}: ${labelText}\n`;
    }
    
    return gcode;
  }
}

export default TestPatternGenerator;
