import React, { useState, useEffect, useMemo } from 'react';
import TestPatternForm from '../components/TestPatternForm';
import GCodeViewer from '../components/GCodeViewer';
import TestPatternGenerator, { TestParameterType, TestPatternConfig } from '../utils/TestPatternGenerator';
import GCodeParser from '../utils/GCodeParser';

const TestPatternPage: React.FC = () => {
  // X Axis
  const [xParameterType, setXParameterType] = useState<TestParameterType>('power');
  const [xMinValue, setXMinValue] = useState<number>(10);
  const [xMaxValue, setXMaxValue] = useState<number>(90);
  const [xSteps, setXSteps] = useState<number>(5);
  
  // Y Axis
  const [yParameterType, setYParameterType] = useState<TestParameterType>('speed');
  const [yMinValue, setYMinValue] = useState<number>(500);
  const [yMaxValue, setYMaxValue] = useState<number>(3000);
  const [ySteps, setYSteps] = useState<number>(4);
  
  // Fixed values
  const [fixedPower, setFixedPower] = useState<number>(50); // Default power
  const [fixedSpeed, setFixedSpeed] = useState<number>(1500); // Default speed
  
  // Geometry
  const [squareSize, setSquareSize] = useState<number>(10);
  const [spacing, setSpacing] = useState<number>(2);
  const [margin, setMargin] = useState<number>(5);
  
  // File
  const [fileName, setFileName] = useState<string>('test_pattern.gcode');
  
  // Generated content
  const [gcodeContent, setGcodeContent] = useState<string | null>(null);
  const [generatedPaths, setGeneratedPaths] = useState<ReturnType<GCodeParser['getPaths']> | null>(null);
  const [bbox, setBbox] = useState<ReturnType<GCodeParser['getBoundingBox']> | null>(null);
  const [centroid, setCentroid] = useState<ReturnType<GCodeParser['getCentroid']> | null>(null);
  
  // Color legend
  const [colorLegend, setColorLegend] = useState<'power' | 'speed' | 'correction'>('power');
  
  // Correction axis
  const [correctionAxis, setCorrectionAxis] = useState<'X' | 'Y'>('X');

  // Determinar si hay corrección activa en algún eje
  const isCorrectionEnabled = xParameterType === 'correction' || yParameterType === 'correction';
  
  // Generar GCODE cuando cambian los parámetros
  useEffect(() => {
    try {
      const config: TestPatternConfig = {
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
        squareSize,
        spacing,
        correctionAxis,
        fixedPower: xParameterType !== 'power' && yParameterType !== 'power' ? fixedPower : undefined,
        fixedSpeed: xParameterType !== 'speed' && yParameterType !== 'speed' ? fixedSpeed : undefined
      };
      
      const gcode = TestPatternGenerator.generatePattern(config);
      setGcodeContent(gcode);
      
      // Parsear el GCODE para visualización
      const parser = new GCodeParser();
      parser.parseGCode(gcode);
      setGeneratedPaths(parser.getPaths());
      setBbox(parser.getBoundingBox());
      setCentroid(parser.getCentroid());
    } catch (error) {
      console.error('Error generating pattern:', error);
    }
  }, [
    xParameterType, xMinValue, xMaxValue, xSteps,
    yParameterType, yMinValue, yMaxValue, ySteps,
    fixedPower, fixedSpeed, squareSize, spacing,
    correctionAxis
  ]);
  
  // Prepare legend ranges based on selected parameters
  const legendRanges = useMemo(() => {
    return {
      power: {
        min: xParameterType === 'power' ? xMinValue : (yParameterType === 'power' ? yMinValue : 0),
        max: xParameterType === 'power' ? xMaxValue : (yParameterType === 'power' ? yMaxValue : 100)
      },
      speed: {
        min: xParameterType === 'speed' ? xMinValue : (yParameterType === 'speed' ? yMinValue : 100),
        max: xParameterType === 'speed' ? xMaxValue : (yParameterType === 'speed' ? yMaxValue : 3000)
      },
      correction: {
        min: xParameterType === 'correction' ? xMinValue : (yParameterType === 'correction' ? yMinValue : 0),
        max: xParameterType === 'correction' ? xMaxValue : (yParameterType === 'correction' ? yMaxValue : 0.99)
      }
    };
  }, [
    xParameterType, xMinValue, xMaxValue,
    yParameterType, yMinValue, yMaxValue
  ]);
  
  // Save GCODE to file
  const handleSave = async () => {
    if (!gcodeContent) return;
    
    try {
      // Access the Electron API
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        alert('Error: Electron API not available');
        return;
      }
      
      // Call the save file method
      const result = await electronAPI.saveFile(gcodeContent, fileName);
      
      if (result.success) {
        alert('File saved successfully!');
      } else {
        alert(`Error saving: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Unexpected error saving file');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-2">
      <div className="mb-1">
        <h1 className="text-xl font-bold text-blue-700">Laser Test Pattern Generator</h1>
      </div>
      
      <div className="flex flex-1 min-h-0 space-x-2">
        {/* Left panel: controls */}
        <div className="w-64 flex flex-col space-y-2 overflow-hidden">
          <TestPatternForm
            // X Axis
            xParameterType={xParameterType}
            xMinValue={xMinValue}
            xMaxValue={xMaxValue}
            xSteps={xSteps}
            onXParameterTypeChange={setXParameterType}
            onXMinValueChange={setXMinValue}
            onXMaxValueChange={setXMaxValue}
            onXStepsChange={setXSteps}
            
            // Y Axis
            yParameterType={yParameterType}
            yMinValue={yMinValue}
            yMaxValue={yMaxValue}
            ySteps={ySteps}
            onYParameterTypeChange={setYParameterType}
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
            
            // File
            fileName={fileName}
            onFileNameChange={setFileName}
            
            // Actions
            onSave={handleSave}
            
            // Color legend
            colorLegend={colorLegend}
            onColorLegendChange={setColorLegend}
            
            // Correction axis
            correctionAxis={correctionAxis}
            onCorrectionAxisChange={setCorrectionAxis}
            isCorrectionEnabled={isCorrectionEnabled}
          />
        </div>
        
        {/* Main panel: visualization */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 border border-gray-200 rounded min-h-0">
            <GCodeViewer
              customPaths={generatedPaths}
              customBbox={bbox}
              customCentroid={centroid}
              colorMode="pattern"
              patternLegendType={colorLegend}
              title="Test Pattern Preview"
              legendRanges={legendRanges}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPatternPage;
