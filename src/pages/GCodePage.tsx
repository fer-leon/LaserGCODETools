import React, { useState, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import GCodeViewer from '../components/GCodeViewer';
import CorrectionControls from '../components/CorrectionControls';
import TimeEstimationConfig from '../components/TimeEstimationConfig';
import GCodeCorrector from '../utils/GCodeCorrector';
import GCodeParser from '../utils/GCodeParser';
import { TimeEstimator, TimeEstimationResult } from '../utils/TimeEstimator';

const GCodePage: React.FC = () => {
  const [gcodeContent, setGcodeContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  // States for correction
  const [correctionCoefficient, setCorrectionCoefficient] = useState<number>(0.5);
  const [correctionAxis, setCorrectionAxis] = useState<'X' | 'Y'>('X');
  
  // State to show original or corrected
  const [viewMode, setViewMode] = useState<'original' | 'corrected'>('corrected');
  const [showComparison, setShowComparison] = useState<boolean>(true);
  
  // State for time estimation
  const [acceleration, setAcceleration] = useState<number>(500); // 500 mm/s² by default
  const [timeEstimation, setTimeEstimation] = useState<TimeEstimationResult | null>(null);
  
  // States for correction results
  const [correctionResult, setCorrectionResult] = useState<{
    originalPaths: ReturnType<GCodeParser['getPaths']> | null;
    correctedPaths: ReturnType<GCodeParser['getPaths']> | null;
    correctionFactors: number[] | null;
    bbox: ReturnType<GCodeParser['getBoundingBox']> | null;
    centroid: ReturnType<GCodeParser['getCentroid']> | null;
  }>({
    originalPaths: null,
    correctedPaths: null,
    correctionFactors: null,
    bbox: null,
    centroid: null
  });

  // New state for corrected GCODE content
  const [correctedGCodeContent, setCorrectedGCodeContent] = useState<string | null>(null);
  
  // New state for save message
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleFileLoaded = (content: string, name: string) => {
    setGcodeContent(content);
    setFileName(name);
    // Clear old messages when a new file is loaded
    setSaveMessage(null);
  };

  // Apply correction when gcode, coefficient or axis changes
  useEffect(() => {
    if (!gcodeContent) {
      setCorrectionResult({
        originalPaths: null,
        correctedPaths: null,
        correctionFactors: null,
        bbox: null,
        centroid: null
      });
      setTimeEstimation(null);
      setCorrectedGCodeContent(null);
      return;
    }

    // Parse to get bbox and centroid
    const parser = new GCodeParser();
    parser.parseGCode(gcodeContent);
    const bbox = parser.getBoundingBox();
    const centroid = parser.getCentroid();
    const originalPaths = parser.getPaths();

    // Apply correction
    const corrector = new GCodeCorrector();
    const result = corrector.applyCorrection(gcodeContent, {
      coefficient: correctionCoefficient,
      axis: correctionAxis
    });

    setCorrectionResult({
      ...result,
      bbox,
      centroid
    });

    // Save corrected GCODE content
    setCorrectedGCodeContent(result.correctedGCode || null);

    // Estimate execution time
    if (result.correctedPaths) {
      const timeResult = TimeEstimator.estimateTime(
        result.correctedPaths, 
        acceleration,
        originalPaths
      );
      setTimeEstimation(timeResult);
    }
  }, [gcodeContent, correctionCoefficient, correctionAxis, acceleration]);

  // Function to save the corrected GCODE file
  const handleSaveFile = async () => {
    if (!correctedGCodeContent) {
      setSaveMessage({
        type: 'error',
        text: 'No corrected content to save'
      });
      return;
    }

    try {
      // Generate a suggested name based on the original file
      const suggestedName = fileName 
        ? `${fileName.split('.').slice(0, -1).join('.')}_corrected.gcode`
        : 'corrected.gcode';

      // Access the Electron API
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        setSaveMessage({
          type: 'error',
          text: 'Error: Electron API not available'
        });
        return;
      }

      // Call the save file method
      const result = await electronAPI.saveFile(correctedGCodeContent, suggestedName);
      
      if (result.success) {
        setSaveMessage({
          type: 'success',
          text: `File saved successfully`
        });
        
        // Clear the message after 3 seconds
        setTimeout(() => {
          setSaveMessage(null);
        }, 3000);
      } else {
        setSaveMessage({
          type: 'error',
          text: `Error saving: ${result.error}`
        });
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setSaveMessage({
        type: 'error',
        text: 'Unexpected error saving file'
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-2">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-blue-700">Laser Axis Correction Tool</h1>
        {fileName && (
          <h2 className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded truncate max-w-xs">
            File: {fileName}
          </h2>
        )}
      </div>
      
      <div className="flex flex-1 min-h-0 space-x-2">
        {/* Left panel: upload and controls */}
        <div className="w-64 flex flex-col space-y-2">
          <FileUploader onFileLoaded={handleFileLoaded} />
          
          {gcodeContent ? (
            <>
              <CorrectionControls 
                coefficient={correctionCoefficient}
                onCoefficientChange={setCorrectionCoefficient}
                axis={correctionAxis}
                onAxisChange={setCorrectionAxis}
              />
              
              <TimeEstimationConfig
                acceleration={acceleration}
                onAccelerationChange={setAcceleration}
              />
              
              {/* Time estimation information */}
              {timeEstimation && (
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <h3 className="text-sm font-semibold mb-2">Time Estimation</h3>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">
                        {TimeEstimator.formatTime(timeEstimation.totalTime)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rapid movements:</span>
                      <span>
                        {TimeEstimator.formatTime(timeEstimation.rapidTime)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cutting movements:</span>
                      <span>
                        {TimeEstimator.formatTime(timeEstimation.cuttingTime)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Button to save corrected file */}
              {viewMode === 'corrected' && correctedGCodeContent && (
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <button
                    onClick={handleSaveFile}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded flex items-center justify-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span className="text-sm">Save Corrected GCODE</span>
                  </button>
                  
                  {/* Success or error message */}
                  {saveMessage && (
                    <div 
                      className={`mt-2 p-2 text-xs rounded text-center
                        ${saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : ''}
                        ${saveMessage.type === 'error' ? 'bg-red-100 text-red-800' : ''}
                        ${saveMessage.type === 'info' ? 'bg-blue-100 text-blue-800' : ''}
                      `}
                    >
                      {saveMessage.text}
                    </div>
                  )}
                </div>
              )}
              
              {/* Controls to change display mode */}
              <div className="p-2 bg-white rounded-lg shadow-sm space-y-2">
                <h3 className="text-sm font-semibold mb-2">Display Options</h3>              
                <div className="flex justify-between space-x-2">
                  <button
                    className={`py-1 px-2 text-xs rounded-md flex-1 ${
                      viewMode === 'original' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setViewMode('original')}
                  >
                    Original
                  </button>
                  <button
                    className={`py-1 px-2 text-xs rounded-md flex-1 ${
                      viewMode === 'corrected' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setViewMode('corrected')}
                  >
                    Corrected
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-2 text-center bg-gray-100 rounded-lg">
              <p className="text-gray-600 text-xs">Load a GCODE file to visualize and apply corrections</p>
            </div>
          )}
        </div>
        
        {/* Main panel: single visualization */}
        <div className="flex-1 flex flex-col min-h-0">
          {gcodeContent ? (
            <div className="flex-1 border border-gray-200 rounded min-h-0">
              {viewMode === 'original' ? (
                <GCodeViewer 
                  gcodeContent={gcodeContent}
                  title="Original GCODE" 
                />
              ) : (
                <GCodeViewer 
                  customPaths={correctionResult.correctedPaths}
                  originalPaths={showComparison ? correctionResult.originalPaths : null}
                  correctionFactors={correctionResult.correctionFactors}
                  customBbox={correctionResult.bbox}
                  customCentroid={correctionResult.centroid}
                  colorMode="correction"
                  showOriginal={showComparison}
                  title="GCODE with Speed Correction"
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-gray-200 rounded">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GCodePage;
