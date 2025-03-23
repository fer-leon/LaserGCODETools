import GCodeParser, { GCodePath, GCodeCommand } from "./GCodeParser";

interface CorrectionOptions {
  coefficient: number;  // Correction factor (e.g., 0 to 0.99)
  axis: 'X' | 'Y';      // Axis to correct based on segment orientation
}

class GCodeCorrector {
  /**
   * Applies a speed correction based on segment orientation.
   * For axis 'X': horizontal segments get 0 correction; vertical get maximum.
   * For axis 'Y': vertical segments get 0 correction; horizontal get maximum.
   */
  applyCorrection(gcode: string, options: CorrectionOptions) {
    const parser = new GCodeParser();
    parser.parseGCode(gcode);
    
    // Get original paths from parser
    const originalPaths = parser.getPaths();
    
    // Use copies of paths to apply correction
    const correctedPaths: GCodePath[] = [];
    const correctionFactors: number[] = [];
    
    // Build corrected GCODE output
    let correctedGCode = '';
    const originalLines = gcode.split('\n');
    let currentLineIndex = 0;
    
    originalPaths.forEach((path, i) => {
      // Do not adjust rapid moves
      if (path.isRapid) {
        correctedPaths.push({ ...path });
        correctionFactors.push(0);
        if (path.command && path.command.lineNumber !== undefined) {
          while (currentLineIndex <= path.command.lineNumber) {
            correctedGCode += originalLines[currentLineIndex] + '\n';
            currentLineIndex++;
          }
        }
        return;
      }
      
      // Compute absolute differences
      const dx = Math.abs(path.end.x - path.start.x);
      const dy = Math.abs(path.end.y - path.start.y);
      let orientationFactor = 0;
      if (dx + dy > 0) {
        if (options.axis === 'X') {
          orientationFactor = dy / (dx + dy); // horizontal: 0, vertical: 1
        } else {
          orientationFactor = dx / (dx + dy); // vertical: 0, horizontal: 1
        }
      }
      
      // Effective correction is factor times coefficient
      const effectiveCorrection = options.coefficient * orientationFactor;
      correctionFactors.push(effectiveCorrection);
      
      // Adjust the feedrate: original * (1 - effectiveCorrection)
      const originalFeedrate = path.feedrate || 0;
      const correctedFeedrate = originalFeedrate * (1 - effectiveCorrection);
      
      // Create a new path copy with corrected feedrate
      correctedPaths.push({
        ...path,
        feedrate: correctedFeedrate,
      });
      
      if (path.command && path.command.lineNumber !== undefined) {
        // Copy lines until the command line
        while (currentLineIndex < path.command.lineNumber) {
          correctedGCode += originalLines[currentLineIndex] + '\n';
          currentLineIndex++;
        }
        
        // Modify command line to substitute the feedrate
        const line = originalLines[currentLineIndex];
        if (path.command.params.F !== undefined) {
          // Replace existing F parameter
          const correctedLine = line.replace(/F\d+(\.\d+)?/, `F${Math.round(correctedFeedrate)}`);
          correctedGCode += correctedLine + '\n';
        } else {
          // Append feedrate if missing
          const commentIndex = line.indexOf(';');
          if (commentIndex >= 0) {
            correctedGCode += line.substring(0, commentIndex) + ` F${Math.round(correctedFeedrate)} ` + line.substring(commentIndex) + '\n';
          } else {
            correctedGCode += line + ` F${Math.round(correctedFeedrate)}` + '\n';
          }
        }
        currentLineIndex++;
      }
    });
    
    // Append any remaining lines
    while (currentLineIndex < originalLines.length) {
      correctedGCode += originalLines[currentLineIndex] + '\n';
      currentLineIndex++;
    }
    
    return {
      originalPaths,
      correctedPaths,
      correctionFactors,
      correctedGCode
    };
  }
}

export default GCodeCorrector;
