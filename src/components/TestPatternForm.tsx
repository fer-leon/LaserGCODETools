import React from 'react';
import { TestParameterType } from '../utils/TestPatternGenerator';

// Tipo para la leyenda de color
type ColorLegendType = 'power' | 'speed' | 'correction';

interface TestPatternFormProps {
  // X Axis
  xParameterType: TestParameterType;
  xMinValue: number;
  xMaxValue: number;
  xSteps: number;
  onXParameterTypeChange: (type: TestParameterType) => void;
  onXMinValueChange: (value: number) => void;
  onXMaxValueChange: (value: number) => void;
  onXStepsChange: (value: number) => void;
  
  // Y Axis
  yParameterType: TestParameterType;
  yMinValue: number;
  yMaxValue: number;
  ySteps: number;
  onYParameterTypeChange: (type: TestParameterType) => void;
  onYMinValueChange: (value: number) => void;
  onYMaxValueChange: (value: number) => void;
  onYStepsChange: (value: number) => void;
  
  // Fixed values for non-axis parameters
  fixedPower?: number;
  fixedSpeed?: number;
  onFixedPowerChange: (value: number) => void;
  onFixedSpeedChange: (value: number) => void;
  
  // Geometry
  squareSize: number;
  spacing: number;
  margin: number;
  onSquareSizeChange: (value: number) => void;
  onSpacingChange: (value: number) => void;
  onMarginChange: (value: number) => void;
  
  // File
  fileName: string;
  onFileNameChange: (value: string) => void;
  
  // Actions
  onSave: () => void;

  // Color legend
  colorLegend: ColorLegendType;
  onColorLegendChange: (type: ColorLegendType) => void;
  
  // Correction Axis
  correctionAxis: 'X' | 'Y';
  onCorrectionAxisChange: (axis: 'X' | 'Y') => void;
  isCorrectionEnabled: boolean;
}

const TestPatternForm: React.FC<TestPatternFormProps> = ({
  // X Axis
  xParameterType,
  xMinValue,
  xMaxValue,
  xSteps,
  onXParameterTypeChange,
  onXMinValueChange,
  onXMaxValueChange,
  onXStepsChange,
  
  // Y Axis
  yParameterType,
  yMinValue,
  yMaxValue,
  ySteps,
  onYParameterTypeChange,
  onYMinValueChange,
  onYMaxValueChange,
  onYStepsChange,
  
  // Fixed values
  fixedPower,
  fixedSpeed,
  onFixedPowerChange,
  onFixedSpeedChange,
  
  // Geometry
  squareSize,
  spacing,
  margin,
  onSquareSizeChange,
  onSpacingChange,
  onMarginChange,
  
  // File
  fileName,
  onFileNameChange,
  
  // Actions
  onSave,

  // Color legend
  colorLegend,
  onColorLegendChange,
  
  // Correction Axis
  correctionAxis,
  onCorrectionAxisChange,
  isCorrectionEnabled
}) => {
  // Helper function to get label and limits for each parameter type
  const getParameterSettings = (type: TestParameterType) => {
    switch (type) {
      case 'power':
        return {
          label: 'Power',
          minLabel: 'Min (%)',
          maxLabel: 'Max (%)',
          minLimit: 0,
          maxLimit: 100,
          step: 1
        };
      case 'speed':
        return {
          label: 'Speed',
          minLabel: 'Min (units/min)',
          maxLabel: 'Max (units/min)',
          minLimit: 1,
          maxLimit: 10000,
          step: 1
        };
      case 'correction':
        return {
          label: 'Correction',
          minLabel: 'Min',
          maxLabel: 'Max',
          minLimit: 0,
          maxLimit: 0.99,
          step: 0.01
        };
    }
  };

  // Get settings for current parameter types
  const xSettings = getParameterSettings(xParameterType);
  const ySettings = getParameterSettings(yParameterType);
  
  // Determine which fixed values are needed
  const needsFixedPower = xParameterType !== 'power' && yParameterType !== 'power';
  const needsFixedSpeed = xParameterType !== 'speed' && yParameterType !== 'speed';

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 text-sm overflow-y-auto">
      <h2 className="font-semibold text-gray-800 mb-2">Configuration</h2>
      
      {/* X Axis Settings */}
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 text-xs mb-1">X Axis Parameter</h3>
        <div className="flex space-x-2 mb-2">
          <button
            className={`py-1 px-2 text-xs rounded ${
              xParameterType === 'power' 
                ? 'bg-blue-500 text-white' 
                : yParameterType === 'power'
                  ? 'bg-gray-200 text-gray-400 opacity-50 cursor-default' 
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => onXParameterTypeChange('power')}
            disabled={yParameterType === 'power'}
            title={yParameterType === 'power' ? 'Already used in Y axis' : ''}
          >
            Power
          </button>
          <button
            className={`py-1 px-2 text-xs rounded ${
              xParameterType === 'speed' 
                ? 'bg-blue-500 text-white' 
                : yParameterType === 'speed'
                  ? 'bg-gray-200 text-gray-400 opacity-50 cursor-default' 
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => onXParameterTypeChange('speed')}
            disabled={yParameterType === 'speed'}
            title={yParameterType === 'speed' ? 'Already used in Y axis' : ''}
          >
            Speed
          </button>
          <button
            className={`py-1 px-2 text-xs rounded ${
              xParameterType === 'correction' 
                ? 'bg-blue-500 text-white' 
                : yParameterType === 'correction'
                  ? 'bg-gray-200 text-gray-400 opacity-50 cursor-default' 
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => onXParameterTypeChange('correction')}
            disabled={yParameterType === 'correction'}
            title={yParameterType === 'correction' ? 'Already used in Y axis' : ''}
          >
            Correction
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-600">
              {xSettings.minLabel}:
            </label>
            <input 
              type="number" 
              value={xMinValue}
              onChange={(e) => onXMinValueChange(Number(e.target.value))}
              min={xSettings.minLimit}
              max={xSettings.maxLimit - 0.01}
              step={xSettings.step}
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">
              {xSettings.maxLabel}:
            </label>
            <input 
              type="number" 
              value={xMaxValue}
              onChange={(e) => onXMaxValueChange(Number(e.target.value))}
              min={xMinValue + 0.01}
              max={xSettings.maxLimit}
              step={xSettings.step}
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">
              Steps (columns):
            </label>
            <input 
              type="number" 
              value={xSteps}
              onChange={(e) => onXStepsChange(Number(e.target.value))}
              min="2"
              max="20"
              className="w-full p-1 text-xs border rounded"
            />
          </div>
        </div>
      </div>
      
      {/* Y Axis Settings */}
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 text-xs mb-1">Y Axis Parameter</h3>
        <div className="flex space-x-2 mb-2">
          <button
            className={`py-1 px-2 text-xs rounded ${
              yParameterType === 'power' 
                ? 'bg-blue-500 text-white' 
                : xParameterType === 'power'
                  ? 'bg-gray-200 text-gray-400 opacity-50 cursor-default' 
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => onYParameterTypeChange('power')}
            disabled={xParameterType === 'power'}
            title={xParameterType === 'power' ? 'Already used in X axis' : ''}
          >
            Power
          </button>
          <button
            className={`py-1 px-2 text-xs rounded ${
              yParameterType === 'speed' 
                ? 'bg-blue-500 text-white' 
                : xParameterType === 'speed'
                  ? 'bg-gray-200 text-gray-400 opacity-50 cursor-default' 
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => onYParameterTypeChange('speed')}
            disabled={xParameterType === 'speed'}
            title={xParameterType === 'speed' ? 'Already used in X axis' : ''}
          >
            Speed
          </button>
          <button
            className={`py-1 px-2 text-xs rounded ${
              yParameterType === 'correction' 
                ? 'bg-blue-500 text-white' 
                : xParameterType === 'correction'
                  ? 'bg-gray-200 text-gray-400 opacity-50 cursor-default' 
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => onYParameterTypeChange('correction')}
            disabled={xParameterType === 'correction'}
            title={xParameterType === 'correction' ? 'Already used in X axis' : ''}
          >
            Correction
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-600">
              {ySettings.minLabel}:
            </label>
            <input 
              type="number" 
              value={yMinValue}
              onChange={(e) => onYMinValueChange(Number(e.target.value))}
              min={ySettings.minLimit}
              max={ySettings.maxLimit - 0.01}
              step={ySettings.step}
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">
              {ySettings.maxLabel}:
            </label>
            <input 
              type="number" 
              value={yMaxValue}
              onChange={(e) => onYMaxValueChange(Number(e.target.value))}
              min={yMinValue + 0.01}
              max={ySettings.maxLimit}
              step={ySettings.step}
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">
              Steps (rows):
            </label>
            <input 
              type="number" 
              value={ySteps}
              onChange={(e) => onYStepsChange(Number(e.target.value))}
              min="2"
              max="20"
              className="w-full p-1 text-xs border rounded"
            />
          </div>
        </div>
      </div>

        {/* Correction Axis Selector - only visible when correction is enabled */}
        {isCorrectionEnabled && (
        <div className="mb-4">
          <h3 className="font-medium text-gray-700 text-xs mb-1">Apply Correction to Axis</h3>
          <div className="flex space-x-2">
            <button
              className={`py-1 px-3 text-xs rounded-md ${
                correctionAxis === 'X' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => onCorrectionAxisChange('X')}
            >
              X Axis
            </button>
            <button
              className={`py-1 px-3 text-xs rounded-md ${
                correctionAxis === 'Y' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => onCorrectionAxisChange('Y')}
            >
              Y Axis
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Choose which axis will have lower efficiency in laser power.
          </div>
        </div>
      )}
      
      {/* Fixed Values */}
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 text-xs mb-1">Fixed Values</h3>
        <div className="grid grid-cols-2 gap-2">
          {needsFixedPower && (
            <div>
              <label className="block text-xs text-gray-600">
                Power (%):
              </label>
              <input 
                type="number" 
                value={fixedPower}
                onChange={(e) => onFixedPowerChange(Number(e.target.value))}
                min="0"
                max="100"
                step="1"
                className="w-full p-1 text-xs border rounded"
                required
              />
            </div>
          )}
          
          {needsFixedSpeed && (
            <div>
              <label className="block text-xs text-gray-600">
                Speed (units/min):
              </label>
              <input 
                type="number" 
                value={fixedSpeed}
                onChange={(e) => onFixedSpeedChange(Number(e.target.value))}
                min="1"
                step="1"
                className="w-full p-1 text-xs border rounded"
                required
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Color Legend Selection */}
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 text-xs mb-1">Color Legend</h3>
        <div className="flex space-x-2">
          <button
            className={`py-1 px-2 text-xs rounded ${
              colorLegend === 'power' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => onColorLegendChange('power')}
          >
            Power
          </button>
          <button
            className={`py-1 px-2 text-xs rounded ${
              colorLegend === 'speed' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => onColorLegendChange('speed')}
          >
            Speed
          </button>
          
        </div>
        <div className="mt-1 text-xs text-gray-600">
          Select which parameter will be visualized with color in the preview.
        </div>
      </div>
      
      {/* Geometry Settings */}
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 text-xs mb-1">Geometry</h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-600">
              Square Size (mm):
            </label>
            <input 
              type="number" 
              value={squareSize}
              onChange={(e) => onSquareSizeChange(Number(e.target.value))}
              min="1"
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">
              Spacing (mm):
            </label>
            <input 
              type="number" 
              value={spacing}
              onChange={(e) => onSpacingChange(Number(e.target.value))}
              min="1"
              className="w-full p-1 text-xs border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">
              Margin (mm):
            </label>
            <input 
              type="number" 
              value={margin}
              onChange={(e) => onMarginChange(Number(e.target.value))}
              min="1"
              className="w-full p-1 text-xs border rounded"
            />
          </div>
        </div>
      </div>
      
      {/* File Name */}
      <div className="mb-4">
        <label className="block text-xs text-gray-600 mb-1">
          File Name:
        </label>
        <input 
          type="text" 
          value={fileName}
          onChange={(e) => onFileNameChange(e.target.value)}
          className="w-full p-1 text-xs border rounded"
        />
      </div>
      
      {/* Help text */}
      <div className="mt-3 bg-blue-50 p-2 rounded text-xs text-blue-700">
        <p>This pattern creates a grid with your selected parameters:</p>
        <ul className="list-disc ml-4 mt-1">
          <li>X axis: {xSettings.label} ({xMinValue} to {xMaxValue})</li>
          <li>Y axis: {ySettings.label} ({yMinValue} to {yMaxValue})</li>
        </ul>
        <p className="mt-1">Use it to find the optimal combination for your laser and material.</p>
      </div>
    </div>
  );
};

export default TestPatternForm;
