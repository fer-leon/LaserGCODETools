import React, { useState, useEffect } from 'react';
import GCodeViewer from '../components/GCodeViewer';
import TestPatternForm from '../components/TestPatternForm';
import TestPatternGenerator, { TestParameterType } from '../utils/TestPatternGenerator';

// Tipo para la leyenda de color
type ColorLegendType = 'power' | 'speed' | 'correction';

// Interface for settings to be saved in localStorage
interface TestGeneratorSettings {
  // X Axis
  xParameterType: TestParameterType;
  xMinValue: number;
  xMaxValue: number;
  xSteps: number;
  
  // Y Axis
  yParameterType: TestParameterType;
  yMinValue: number;
  yMaxValue: number;
  ySteps: number;
  
  // Fixed values
  fixedPower: number;
  fixedSpeed: number;
  
  // Geometry
  squareSize: number;
  spacing: number;
  margin: number;
  
  // Color legend
  colorLegend: ColorLegendType;
  
  // Correction axis
  correctionAxis: 'X' | 'Y';
  
  // File name
  fileName: string;
}

// Storage key for localStorage
const STORAGE_KEY = 'laserGcodeTools_testGeneratorSettings';

const TestGeneratorPage: React.FC = () => {
  // Initialize state with default values
  // We'll load from localStorage in a useEffect
  const [xParameterType, setXParameterType] = useState<TestParameterType>('speed');
  const [xMinValue, setXMinValue] = useState<number>(100);
  const [xMaxValue, setXMaxValue] = useState<number>(3000);
  const [xSteps, setXSteps] = useState<number>(5);
  
  const [yParameterType, setYParameterType] = useState<TestParameterType>('power');
  const [yMinValue, setYMinValue] = useState<number>(5);
  const [yMaxValue, setYMaxValue] = useState<number>(100);
  const [ySteps, setYSteps] = useState<number>(5);
  
  const [fixedPower, setFixedPower] = useState<number>(80);
  const [fixedSpeed, setFixedSpeed] = useState<number>(1000);
  
  const [squareSize, setSquareSize] = useState<number>(10);
  const [spacing, setSpacing] = useState<number>(5);
  const [margin, setMargin] = useState<number>(10);
  
  const [generatedGCode, setGeneratedGCode] = useState<string>('');
  const [fileName, setFileName] = useState<string>('laser_test_pattern.gcode');
  
  const [colorLegend, setColorLegend] = useState<ColorLegendType>('power');
  
  const [correctionAxis, setCorrectionAxis] = useState<'X' | 'Y'>('X');
  
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  
  // Set isSettingsLoaded to track if we've loaded settings
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  // Function to save settings to localStorage
  const saveSettingsToStorage = () => {
    // Only save if we've already loaded settings (to prevent overwriting with defaults)
    if (!isSettingsLoaded) {
      return;
    }
    
    const settings: TestGeneratorSettings = {
      xParameterType,
      xMinValue,
      xMaxValue,
      xSteps,
      yParameterType,
      yMinValue,
      yMaxValue, 
      ySteps,
      fixedPower,
      fixedSpeed,
      squareSize,
      spacing,
      margin,
      colorLegend,
      correctionAxis,
      fileName
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log('Settings saved to localStorage');
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  };
  
  // Load settings from localStorage when component mounts
  useEffect(() => {
    console.log('Loading settings from localStorage');
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const settings: TestGeneratorSettings = JSON.parse(savedSettings);
        console.log('Found saved settings:', settings);
        
        // Apply saved settings
        setXParameterType(settings.xParameterType);
        setXMinValue(settings.xMinValue);
        setXMaxValue(settings.xMaxValue);
        setXSteps(settings.xSteps);
        
        setYParameterType(settings.yParameterType);
        setYMinValue(settings.yMinValue);
        setYMaxValue(settings.yMaxValue);
        setYSteps(settings.ySteps);
        
        setFixedPower(settings.fixedPower);
        setFixedSpeed(settings.fixedSpeed);
        
        setSquareSize(settings.squareSize);
        setSpacing(settings.spacing);
        setMargin(settings.margin);
        
        setColorLegend(settings.colorLegend);
        setCorrectionAxis(settings.correctionAxis);
        setFileName(settings.fileName);
      } else {
        console.log('No saved settings found, using defaults');
      }
      
      // Mark settings as loaded
      setIsSettingsLoaded(true);
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      setIsSettingsLoaded(true); // Still mark as loaded to allow saving
    }
  }, []);
  
  // Save settings to localStorage whenever they change
  useEffect(() => {
    saveSettingsToStorage();
  }, [
    xParameterType, xMinValue, xMaxValue, xSteps,
    yParameterType, yMinValue, yMaxValue, ySteps,
    fixedPower, fixedSpeed,
    squareSize, spacing, margin,
    colorLegend, correctionAxis, fileName,
    isSettingsLoaded // Only save after settings have been loaded
  ]);

  // Handle parameter type change with validation
  const handleXParameterTypeChange = (newType: TestParameterType) => {
    if (newType === yParameterType) {
      // If same as Y, swap them
      setYParameterType(xParameterType);
    }
    setXParameterType(newType);
    
    // Set appropriate default values based on parameter type
    if (newType === 'power') {
      setXMinValue(5);
      setXMaxValue(100);
      // If power was previously a fixed value, use it as the min/max range
      if (needsFixedPower() && fixedPower) {
        const rangeFactor = 0.4; // 40% range around fixed value
        const minVal = Math.max(5, Math.round(fixedPower * (1 - rangeFactor)));
        const maxVal = Math.min(100, Math.round(fixedPower * (1 + rangeFactor)));
        setXMinValue(minVal);
        setXMaxValue(maxVal);
      }
    } else if (newType === 'speed') {
      setXMinValue(100);
      setXMaxValue(3000);
      // If speed was previously a fixed value, use it as the min/max range
      if (needsFixedSpeed() && fixedSpeed) {
        const rangeFactor = 0.4; // 40% range around fixed value
        const minVal = Math.max(100, Math.round(fixedSpeed * (1 - rangeFactor)));
        const maxVal = Math.round(fixedSpeed * (1 + rangeFactor));
        setXMinValue(minVal);
        setXMaxValue(maxVal);
      }
    } else if (newType === 'correction') {
      setXMinValue(0);
      setXMaxValue(0.5);
    }
  };
  
  const handleYParameterTypeChange = (newType: TestParameterType) => {
    if (newType === xParameterType) {
      // If same as X, swap them
      setXParameterType(yParameterType);
    }
    setYParameterType(newType);
    
    // Set appropriate default values based on parameter type
    if (newType === 'power') {
      setYMinValue(5);
      setYMaxValue(100);
      // If power was previously a fixed value, use it as the min/max range
      if (needsFixedPower() && fixedPower) {
        const rangeFactor = 0.4; // 40% range around fixed value
        const minVal = Math.max(5, Math.round(fixedPower * (1 - rangeFactor)));
        const maxVal = Math.min(100, Math.round(fixedPower * (1 + rangeFactor)));
        setYMinValue(minVal);
        setYMaxValue(maxVal);
      }
    } else if (newType === 'speed') {
      setYMinValue(100);
      setYMaxValue(3000);
      // If speed was previously a fixed value, use it as the min/max range
      if (needsFixedSpeed() && fixedSpeed) {
        const rangeFactor = 0.4; // 40% range around fixed value
        const minVal = Math.max(100, Math.round(fixedSpeed * (1 - rangeFactor)));
        const maxVal = Math.round(fixedSpeed * (1 + rangeFactor));
        setYMinValue(minVal);
        setYMaxValue(maxVal);
      }
    } else if (newType === 'correction') {
      setYMinValue(0);
      setYMaxValue(0.5);
    }
  };
  
  // Helper function to determine if fixed values are needed
  const needsFixedPower = () => xParameterType !== 'power' && yParameterType !== 'power';
  const needsFixedSpeed = () => xParameterType !== 'speed' && yParameterType !== 'speed';

  // Función para determinar si la corrección está seleccionada en algún eje
  const isCorrectionEnabled = () => {
    return xParameterType === 'correction' || yParameterType === 'correction';
  };

  // Generate GCODE when parameters change
  useEffect(() => {
    try {
      const config = {
        xAxis: {
          parameterType: xParameterType,
          minValue: xMinValue,
          maxValue: xMaxValue,
          steps: xSteps
        },
        yAxis: {
          parameterType: yParameterType,
          minValue: yMinValue,
          maxValue: yMaxValue,
          steps: ySteps
        },
        fixedPower: needsFixedPower() ? fixedPower : undefined,
        fixedSpeed: needsFixedSpeed() ? fixedSpeed : undefined,
        squareSize,
        spacing,
        correctionAxis // Pasar el eje de corrección al generador
      };
      
      console.log('Generating pattern with config:', config); // Debug log
      
      const gcode = TestPatternGenerator.generatePattern(config);
      setGeneratedGCode(gcode);
      
    } catch (error) {
      console.error('Error generating pattern:', error);
      setGeneratedGCode(`; Error generating pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [
    xParameterType, xMinValue, xMaxValue, xSteps,
    yParameterType, yMinValue, yMaxValue, ySteps,
    fixedPower, fixedSpeed,
    squareSize, spacing, margin,
    correctionAxis // Agregar como dependencia
  ]);

  // Function to download GCODE file
  const downloadGCode = async () => {
    try {
      // If we're in Electron context, use the Electron API
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        setSaveMessage({
          type: 'error',
          text: 'Error: Electron API not available'
        });
        return;
      }

      // Call the save file method
      const result = await electronAPI.saveFile(generatedGCode, fileName);
      
      if (result.success) {
        setSaveMessage({
          type: 'success',
          text: `Test pattern saved successfully`
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
          <h1 className="text-xl font-bold text-blue-700">Test Pattern Generator</h1>
          
          {/* Display save message if present */}
          {saveMessage && (
            <div 
              className={`p-2 text-xs rounded text-center
                ${saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : ''}
                ${saveMessage.type === 'error' ? 'bg-red-100 text-red-800' : ''}
                ${saveMessage.type === 'info' ? 'bg-blue-100 text-blue-800' : ''}
              `}
            >
              {saveMessage.text}
            </div>
          )}
        </div>

      <div className="flex-1 min-h-0 grid grid-cols-4 gap-3">
        {/* Left panel - Configuration */}
        <div className="col-span-1 flex flex-col space-y-3 overflow-hidden">
          <TestPatternForm
            // X Axis
            xParameterType={xParameterType}
            xMinValue={xMinValue}
            xMaxValue={xMaxValue}
            xSteps={xSteps}
            onXParameterTypeChange={handleXParameterTypeChange}
            onXMinValueChange={setXMinValue}
            onXMaxValueChange={setXMaxValue}
            onXStepsChange={setXSteps}
            
            // Y Axis
            yParameterType={yParameterType}
            yMinValue={yMinValue}
            yMaxValue={yMaxValue}
            ySteps={ySteps}
            onYParameterTypeChange={handleYParameterTypeChange}
            onYMinValueChange={setYMinValue}
            onYMaxValueChange={setYMaxValue}
            onYStepsChange={setYSteps}
            
            // Fixed values
            fixedPower={fixedPower}
            fixedSpeed={fixedSpeed}
            onFixedPowerChange={setFixedPower}
            onFixedSpeedChange={setFixedSpeed}
            
            // Geometry
            squareSize={squareSize}
            spacing={spacing}
            margin={margin}
            onSquareSizeChange={setSquareSize}
            onSpacingChange={setSpacing}
            onMarginChange={setMargin}
            
            // Color legend
            colorLegend={colorLegend}
            onColorLegendChange={setColorLegend}
            
            // Correction Axis
            correctionAxis={correctionAxis}
            onCorrectionAxisChange={setCorrectionAxis}
            isCorrectionEnabled={isCorrectionEnabled()}
            
            // File
            fileName={fileName}
            onFileNameChange={setFileName}
            
            // Actions
            onSave={downloadGCode}
          />
          
          {/* Button to save */}
          {generatedGCode && (
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <button
                onClick={downloadGCode}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded flex items-center justify-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-sm">Save Test Pattern</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Right panel - Viewer */}
        <div className="col-span-3 bg-white rounded-lg shadow-sm overflow-hidden border">
          {generatedGCode ? (
            <GCodeViewer 
              gcodeContent={generatedGCode} 
              colorMode="pattern"
              patternLegendType={colorLegend}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Configure parameters to generate a test pattern
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestGeneratorPage;
