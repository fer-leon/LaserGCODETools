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
  margin: number; // Usar este valor para el margen
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
      margin,
      correctionAxis = 'X'
    } = config;

    // Validate configuration
    this.validateConfig(xAxis, yAxis, fixedPower, fixedSpeed);

    // Pre-calculate values used multiple times
    const xSteps = xAxis.steps;
    const ySteps = yAxis.steps;
    const xIncrement = xSteps > 1 ? (xAxis.maxValue - xAxis.minValue) / (xSteps - 1) : 0;
    const yIncrement = ySteps > 1 ? (yAxis.maxValue - yAxis.minValue) / (ySteps - 1) : 0;
    
    // Calculate matrix total size
    const totalWidth = xSteps * (squareSize + spacing) - spacing;
    const totalHeight = ySteps * (squareSize + spacing) - spacing;
    
    // Build header
    const gcodeLines: string[] = [
      `;Laser Test Pattern Generator`,
      `;Fernando León 2025`,
      `;X Axis: ${xAxis.parameterType} from ${xAxis.minValue} to ${xAxis.maxValue} in ${xSteps} steps`,
      `;Y Axis: ${yAxis.parameterType} from ${yAxis.minValue} to ${yAxis.maxValue} in ${ySteps} steps`,
      `; Bounds: X${margin} Y${margin} to X${margin + totalWidth} Y${margin + totalHeight}\n`
    ];
    
    // Add fixed parameter info
    if (fixedPower !== undefined) {
      gcodeLines.push(`;Fixed Power: ${fixedPower}%`);
    }
    
    if (fixedSpeed !== undefined) {
      gcodeLines.push(`;Fixed Speed: ${fixedSpeed} units/min`);
    }
    
    // Add correction info if needed
    if (xAxis.parameterType === 'correction' || yAxis.parameterType === 'correction') {
      gcodeLines.push(`;Correction Axis: ${correctionAxis} (axis with lower efficiency)`);
    }
    
    gcodeLines.push(`;Square Size: ${squareSize}mm, Spacing: ${spacing}mm\n`);
    
    // Initial setup
    gcodeLines.push(
      `G00G17G40G21G54 ; Initial setup - rapid positioning, XY plane, tool comp cancel, mm units, coord system 1`,
      `G90 ; Absolute positioning`,
      `M5 ; Laser off`,
      `G0X0Y0 ; Move to origin\n`
    );

    // Create squares for each combination of values
    this.generateSquares(
      gcodeLines,
      xAxis,
      yAxis,
      xIncrement,
      yIncrement,
      xSteps,
      ySteps,
      margin,
      squareSize,
      spacing,
      fixedPower,
      fixedSpeed,
      correctionAxis
    );
    
    // Add axis labels
    this.addAxisLabels(gcodeLines, xAxis, yAxis, squareSize, spacing, xSteps, ySteps);
    
    // Return to origin
    gcodeLines.push(
      `G0X0Y0 ; Return to origin`,
      `M5 ; Ensure laser is off`
    );
    
    return gcodeLines.join('\n');
  }

  /**
   * Validates the configuration parameters
   */
  private static validateConfig(
    xAxis: AxisConfig,
    yAxis: AxisConfig,
    fixedPower?: number,
    fixedSpeed?: number
  ): void {
    if (xAxis.parameterType === yAxis.parameterType) {
      throw new Error(`Cannot use the same parameter (${xAxis.parameterType}) on both axes`);
    }

    if (xAxis.parameterType !== 'power' && yAxis.parameterType !== 'power' && fixedPower === undefined) {
      throw new Error('Fixed power must be provided if power is not on any axis');
    }
    
    if (xAxis.parameterType !== 'speed' && yAxis.parameterType !== 'speed' && fixedSpeed === undefined) {
      throw new Error('Fixed speed must be provided if speed is not on any axis');
    }
  }

  /**
   * Generates all squares in the test pattern
   */
  private static generateSquares(
    gcodeLines: string[],
    xAxis: AxisConfig,
    yAxis: AxisConfig,
    xIncrement: number,
    yIncrement: number,
    xSteps: number,
    ySteps: number,
    margin: number,
    squareSize: number,
    spacing: number,
    fixedPower?: number,
    fixedSpeed?: number,
    correctionAxis: 'X' | 'Y' = 'X'
  ): void {
    for (let y = 0; y < ySteps; y++) {
      const yValue = yAxis.minValue + (yIncrement * y);
      
      for (let x = 0; x < xSteps; x++) {
        const xValue = xAxis.minValue + (xIncrement * x);
        
        // Determine values for this square
        const power = this.calculateParameterValue('power', xAxis, yAxis, xValue, yValue, fixedPower!);
        const speed = this.calculateParameterValue('speed', xAxis, yAxis, xValue, yValue, fixedSpeed!);
        const correction = this.calculateParameterValue('correction', xAxis, yAxis, xValue, yValue, 0);
        
        // Calculate position
        const xPos = margin + x * (squareSize + spacing);
        const yPos = margin + y * (squareSize + spacing);
        
        // Convert power to normalized value (0-1000)
        const normalizedPower = Math.round(power * 10);
        
        // Add comments with parameter values
        this.addSquareComments(gcodeLines, x, y, xAxis, yAxis, xValue, yValue, power, speed);
        
        // Generate square
        this.drawSquare(gcodeLines, xPos, yPos, squareSize, normalizedPower, speed, correction, correctionAxis);
      }
    }
  }

  /**
   * Calculate the value for a specific parameter based on axes configuration
   */
  private static calculateParameterValue(
    parameterType: TestParameterType,
    xAxis: AxisConfig,
    yAxis: AxisConfig,
    xValue: number,
    yValue: number,
    defaultValue: number
  ): number {
    if (xAxis.parameterType === parameterType) return xValue;
    if (yAxis.parameterType === parameterType) return yValue;
    return defaultValue;
  }

  /**
   * Add parameter comments for a square
   */
  private static addSquareComments(
    gcodeLines: string[],
    x: number,
    y: number,
    xAxis: AxisConfig,
    yAxis: AxisConfig,
    xValue: number,
    yValue: number,
    power: number,
    speed: number
  ): void {
    let comment = `; Square at X${x}Y${y}: `;
    
    if (xAxis.parameterType === 'power') comment += `Power-X=${Math.round(xValue)}%, `;
    if (yAxis.parameterType === 'power') comment += `Power-Y=${Math.round(yValue)}%, `;
    if (xAxis.parameterType === 'speed') comment += `Speed-X=${Math.round(xValue)}, `;
    if (yAxis.parameterType === 'speed') comment += `Speed-Y=${Math.round(yValue)}, `;
    if (xAxis.parameterType === 'correction') comment += `Correction-X=${xValue.toFixed(2)}, `;
    if (yAxis.parameterType === 'correction') comment += `Correction-Y=${yValue.toFixed(2)}, `;
    
    comment += `Final: Speed=${Math.round(speed)}, Power=${Math.round(power)}%`;
    gcodeLines.push(comment);
  }

  /**
   * Draws a square with the given parameters
   */
  private static drawSquare(
    gcodeLines: string[],
    xPos: number,
    yPos: number,
    squareSize: number,
    normalizedPower: number,
    speed: number,
    correction: number,
    correctionAxis: 'X' | 'Y'
  ): void {
    gcodeLines.push(
      `G0X${xPos}Y${yPos} ; Move to start position`,
      `M7 ; Air assist on`,
      `M4S${normalizedPower} ; Set laser power`
    );
    
    // Pre-calculate corners
    const right = xPos + squareSize;
    const top = yPos + squareSize;
    
    // Bottom edge - X direction (affected by Y correction)
    const isHorizontalCorrected = correctionAxis === 'Y';
    const isVerticalCorrected = correctionAxis === 'X';
    
    // Draw the 4 sides of the square with appropriate corrections
    const bottomSpeed = speed * (1 - (isHorizontalCorrected ? correction : 0));
    gcodeLines.push(`G1X${right}Y${yPos}F${Math.round(bottomSpeed)} ; Bottom edge (horizontal)`);
    
    const rightSpeed = speed * (1 - (isVerticalCorrected ? correction : 0));
    gcodeLines.push(`G1X${right}Y${top}F${Math.round(rightSpeed)} ; Right edge (vertical)`);
    
    const topSpeed = speed * (1 - (isHorizontalCorrected ? correction : 0));
    gcodeLines.push(`G1X${xPos}Y${top}F${Math.round(topSpeed)} ; Top edge (horizontal)`);
    
    const leftSpeed = speed * (1 - (isVerticalCorrected ? correction : 0));
    gcodeLines.push(`G1X${xPos}Y${yPos}F${Math.round(leftSpeed)} ; Left edge (vertical)`);
    
    gcodeLines.push(
      `M5 ; Laser off`,
      `M9 ; Air assist off\n`
    );
  }
  
  /**
   * Adds label comments for the axes
   */
  private static addAxisLabels(
    gcodeLines: string[],
    xAxis: AxisConfig,
    yAxis: AxisConfig,
    squareSize: number,
    spacing: number,
    xSteps: number, 
    ySteps: number
  ): void {
    // X-axis labels
    gcodeLines.push(`\n; X-axis labels (${xAxis.parameterType})`);
    const xIncrement = xSteps > 1 ? (xAxis.maxValue - xAxis.minValue) / (xSteps - 1) : 0;
    
    for (let x = 0; x < xSteps; x++) {
      const value = xAxis.minValue + xIncrement * x;
      const xCenter = x * (squareSize + spacing) + squareSize / 2;
      
      let labelText = this.formatLabelText(xAxis.parameterType, value);
      gcodeLines.push(`; X-Label at X=${xCenter} Y=-${spacing/2}: ${labelText}`);
    }
    
    // Y-axis labels
    gcodeLines.push(`\n; Y-axis labels (${yAxis.parameterType})`);
    const yIncrement = ySteps > 1 ? (yAxis.maxValue - yAxis.minValue) / (ySteps - 1) : 0;
    
    for (let y = 0; y < ySteps; y++) {
      const value = yAxis.minValue + yIncrement * y;
      const yCenter = y * (squareSize + spacing) + squareSize / 2;
      
      let labelText = this.formatLabelText(yAxis.parameterType, value);
      gcodeLines.push(`; Y-Label at X=-${spacing/2} Y=${yCenter}: ${labelText}`);
    }
  }
  
  /**
   * Format label text based on parameter type
   */
  private static formatLabelText(parameterType: TestParameterType, value: number): string {
    switch(parameterType) {
      case 'power': return `${Math.round(value)}%`;
      case 'speed': return `${Math.round(value)}`;
      case 'correction': return value.toFixed(2);
      default: return `${value}`;
    }
  }
}

export default TestPatternGenerator;
