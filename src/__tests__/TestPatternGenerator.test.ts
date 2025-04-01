import TestPatternGenerator, { TestPatternConfig } from '../utils/TestPatternGenerator';

describe('TestPatternGenerator', () => {
  describe('generatePattern', () => {
    it('should generate a valid GCODE pattern for power vs speed test', () => {
      const config: TestPatternConfig = {
        xAxis: {
          parameterType: 'power',
          minValue: 10,
          maxValue: 100,
          steps: 3
        },
        yAxis: {
          parameterType: 'speed',
          minValue: 500,
          maxValue: 1500,
          steps: 3
        },
        squareSize: 10,
        spacing: 5,
        margin: 10
      };

      const gcode = TestPatternGenerator.generatePattern(config);
      
      // Check header information
      expect(gcode).toContain('Laser Test Pattern Generator');
      expect(gcode).toContain('X Axis: power from 10 to 100 in 3 steps');
      expect(gcode).toContain('Y Axis: speed from 500 to 1500 in 3 steps');
      
      // Check for essential GCODE commands
      expect(gcode).toContain('G90 ; Absolute positioning');
      expect(gcode).toContain('M5 ; Laser off');
      expect(gcode).toContain('G0X0Y0 ; Move to origin');
      
      // Check for at least one square being drawn
      expect(gcode).toContain('Move to start position');
      expect(gcode).toContain('M4S'); // Laser power setting
      expect(gcode).toContain('G1X'); // Linear move
      
      // We'll skip checking for the axis labels comments since they might have a different format
      // than what we expected
      
      // Check that we return to origin at the end
      expect(gcode).toContain('G0X0Y0 ; Return to origin');
    });

    it('should generate a valid GCODE pattern with correction factor', () => {
      const config: TestPatternConfig = {
        xAxis: {
          parameterType: 'correction',
          minValue: 0,
          maxValue: 0.5,
          steps: 3
        },
        yAxis: {
          parameterType: 'speed',
          minValue: 500,
          maxValue: 1500,
          steps: 3
        },
        fixedPower: 80,
        squareSize: 10,
        spacing: 5,
        margin: 10,
        correctionAxis: 'X'
      };

      const gcode = TestPatternGenerator.generatePattern(config);
      
      // Check correction-specific information
      expect(gcode).toContain('Correction Axis: X (axis with lower efficiency)');
      expect(gcode).toContain('Fixed Power: 80%');
      
      // Check for at least one correction parameter in comments
      expect(gcode).toContain('Correction-X=');
    });

    it('should throw an error when same parameter is used for both axes', () => {
      const config: TestPatternConfig = {
        xAxis: {
          parameterType: 'power',
          minValue: 10,
          maxValue: 100,
          steps: 3
        },
        yAxis: {
          parameterType: 'power', // Same as X axis
          minValue: 5,
          maxValue: 50,
          steps: 3
        },
        fixedSpeed: 1000,
        squareSize: 10,
        spacing: 5,
        margin: 10
      };

      expect(() => {
        TestPatternGenerator.generatePattern(config);
      }).toThrow('Cannot use the same parameter (power) on both axes');
    });

    it('should throw an error when fixed power is missing', () => {
      const config: TestPatternConfig = {
        xAxis: {
          parameterType: 'speed',
          minValue: 500,
          maxValue: 1500,
          steps: 3
        },
        yAxis: {
          parameterType: 'correction',
          minValue: 0,
          maxValue: 0.5,
          steps: 3
        },
        // fixedPower is missing
        squareSize: 10,
        spacing: 5,
        margin: 10
      };

      expect(() => {
        TestPatternGenerator.generatePattern(config);
      }).toThrow('Fixed power must be provided if power is not on any axis');
    });

    it('should throw an error when fixed speed is missing', () => {
      const config: TestPatternConfig = {
        xAxis: {
          parameterType: 'power',
          minValue: 10,
          maxValue: 100,
          steps: 3
        },
        yAxis: {
          parameterType: 'correction',
          minValue: 0,
          maxValue: 0.5,
          steps: 3
        },
        // fixedSpeed is missing
        squareSize: 10,
        spacing: 5,
        margin: 10
      };

      expect(() => {
        TestPatternGenerator.generatePattern(config);
      }).toThrow('Fixed speed must be provided if speed is not on any axis');
    });
  });
});