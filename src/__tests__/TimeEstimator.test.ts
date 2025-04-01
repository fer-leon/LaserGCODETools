import { TimeEstimator, TimeEstimationResult } from '../utils/TimeEstimator';
import { GCodePath } from '../utils/GCodeParser';

describe('TimeEstimator', () => {
  describe('estimateTime', () => {
    it('should return zero times for empty paths', () => {
      const result = TimeEstimator.estimateTime([], 800);
      expect(result).toEqual({
        totalTime: 0,
        rapidTime: 0,
        cuttingTime: 0
      });
    });

    it('should correctly estimate time for a simple path', () => {
      const paths: GCodePath[] = [
        {
          start: { x: 0, y: 0 },
          end: { x: 100, y: 0 },
          isRapid: false,
          feedrate: 1000, // 1000mm/min = 16.67mm/s
          laserOn: true
        }
      ];

      const result = TimeEstimator.estimateTime(paths, 800);
      
      // For a 100mm path at 1000mm/min with acceleration from 0 to max speed and back to 0
      // This is a rough approximation as the exact calculation is complex
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.rapidTime).toBe(0);
      expect(result.cuttingTime).toBe(result.totalTime);
    });

    it('should correctly estimate time for rapid moves', () => {
      const paths: GCodePath[] = [
        {
          start: { x: 0, y: 0 },
          end: { x: 100, y: 0 },
          isRapid: true,
          feedrate: 1000,
          laserOn: false
        }
      ];

      const result = TimeEstimator.estimateTime(paths, 800);
      
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.rapidTime).toBe(result.totalTime);
      expect(result.cuttingTime).toBe(0);
    });

    it('should compare original vs modified paths', () => {
      const originalPaths: GCodePath[] = [
        {
          start: { x: 0, y: 0 },
          end: { x: 100, y: 0 },
          isRapid: false,
          feedrate: 1000,
          laserOn: true
        }
      ];

      const modifiedPaths: GCodePath[] = [
        {
          start: { x: 0, y: 0 },
          end: { x: 100, y: 0 },
          isRapid: false,
          feedrate: 2000, // Double the speed
          laserOn: true
        }
      ];

      const result = TimeEstimator.estimateTime(modifiedPaths, 800, originalPaths);
      
      expect(result.originalTotalTime).toBeGreaterThan(result.totalTime);
      expect(result.timeSavings).toBeGreaterThan(0);
    });

    it('should handle zero distances', () => {
      const paths: GCodePath[] = [
        {
          start: { x: 10, y: 10 },
          end: { x: 10, y: 10 }, // Zero distance
          isRapid: false,
          feedrate: 1000,
          laserOn: true
        }
      ];

      const result = TimeEstimator.estimateTime(paths, 800);
      expect(result.totalTime).toBe(0);
    });
  });

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(TimeEstimator.formatTime(30)).toBe('30.0 seconds');
      expect(TimeEstimator.formatTime(59.9)).toBe('59.9 seconds');
    });

    it('should format minutes correctly', () => {
      expect(TimeEstimator.formatTime(60)).toBe('1 min 0 seg');
      expect(TimeEstimator.formatTime(125.6)).toBe('2 min 6 seg');
      expect(TimeEstimator.formatTime(3599)).toBe('59 min 59 seg');
    });

    it('should format hours correctly', () => {
      expect(TimeEstimator.formatTime(3600)).toBe('1 h 0 min');
      expect(TimeEstimator.formatTime(3660)).toBe('1 h 1 min');
      expect(TimeEstimator.formatTime(7200)).toBe('2 h 0 min');
    });
  });
});