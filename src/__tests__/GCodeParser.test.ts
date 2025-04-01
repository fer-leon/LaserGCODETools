import GCodeParser, { GCodePath } from '../utils/GCodeParser';

describe('GCodeParser', () => {
  let parser: GCodeParser;

  beforeEach(() => {
    parser = new GCodeParser();
  });

  describe('parseGCode', () => {
    it('should parse a simple G-code with movement commands', () => {
      const gcode = `G0 X10 Y10 ; Rapid move
                     G1 X20 Y20 F500 ; Linear move
                     G1 X30 Y20 F500 ; Another linear move`;
      
      parser.parseGCode(gcode);
      const paths = parser.getPaths();
      
      expect(paths.length).toBe(3);
      expect(paths[0].isRapid).toBe(true);
      expect(paths[0].start).toEqual({ x: 0, y: 0 });
      expect(paths[0].end).toEqual({ x: 10, y: 10 });
      
      expect(paths[1].isRapid).toBe(false);
      expect(paths[1].feedrate).toBe(500);
      expect(paths[1].start).toEqual({ x: 10, y: 10 });
      expect(paths[1].end).toEqual({ x: 20, y: 20 });
    });

    it('should handle laser control commands', () => {
      const gcode = `G0 X10 Y10
                     M3 S100 ; Turn on laser
                     G1 X20 Y20 F500
                     M5 ; Turn off laser`;
      
      parser.parseGCode(gcode);
      const paths = parser.getPaths();
      
      expect(paths.length).toBe(2);
      expect(paths[1].laserOn).toBe(true);
      expect(paths[1].power).toBe(100);
    });

    it('should ignore empty lines and comments', () => {
      const gcode = `; Just a comment
                     
                     G0 X10 Y10 ; Move
                     ; Another comment
                     G1 X20 Y20 F500`;
      
      parser.parseGCode(gcode);
      const paths = parser.getPaths();
      
      expect(paths.length).toBe(2);
    });
  });

  describe('getBoundingBox', () => {
    it('should calculate the correct bounding box', () => {
      const gcode = `G0 X10 Y10
                     G1 X20 Y30
                     G1 X-5 Y15`;
      
      parser.parseGCode(gcode);
      const bbox = parser.getBoundingBox();
      
      expect(bbox.min).toEqual({ x: -5, y: 0 });
      expect(bbox.max).toEqual({ x: 20, y: 30 });
    });
  });

  describe('getCentroid', () => {
    it('should calculate the correct centroid', () => {
      const gcode = `G0 X10 Y10
                     G1 X20 Y30
                     G1 X-5 Y15`;
      
      parser.parseGCode(gcode);
      const centroid = parser.getCentroid();
      
      // The centroid calculation is based on unique points, so we need to manually calculate
      // the expected value for verification
      const uniquePoints = [
        { x: 0, y: 0 },   // Start point
        { x: 10, y: 10 }, // First move
        { x: 20, y: 30 }, // Second move
        { x: -5, y: 15 }  // Third move
      ];
      
      const expectedX = uniquePoints.reduce((sum, p) => sum + p.x, 0) / uniquePoints.length;
      const expectedY = uniquePoints.reduce((sum, p) => sum + p.y, 0) / uniquePoints.length;
      
      expect(centroid.x).toBeCloseTo(expectedX, 5);
      expect(centroid.y).toBeCloseTo(expectedY, 5);
    });

    it('should return {0,0} for empty paths', () => {
      const centroid = parser.getCentroid();
      expect(centroid).toEqual({ x: 0, y: 0 });
    });
  });

  describe('convertPowerToPercentage', () => {
    it('should convert S value to percentage correctly', () => {
      expect(GCodeParser.convertPowerToPercentage(100)).toBe(10);
      expect(GCodeParser.convertPowerToPercentage(0)).toBe(0);
      expect(GCodeParser.convertPowerToPercentage(1000)).toBe(100);
    });
  });

  describe('convertPercentageToPower', () => {
    it('should convert percentage to S value correctly', () => {
      expect(GCodeParser.convertPercentageToPower(10)).toBe(26);
      expect(GCodeParser.convertPercentageToPower(0)).toBe(0);
      expect(GCodeParser.convertPercentageToPower(100)).toBe(255);
    });
  });
});