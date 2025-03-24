import React from 'react';

interface TestPatternFormProps {
  minSpeed: number;
  maxSpeed: number;
  minPower: number;
  maxPower: number;
  speedSteps: number;
  powerSteps: number;
  squareSize: number;
  spacing: number;
  margin: number;
  fileName: string;
  onMinSpeedChange: (value: number) => void;
  onMaxSpeedChange: (value: number) => void;
  onMinPowerChange: (value: number) => void;
  onMaxPowerChange: (value: number) => void;
  onSpeedStepsChange: (value: number) => void;
  onPowerStepsChange: (value: number) => void;
  onSquareSizeChange: (value: number) => void;
  onSpacingChange: (value: number) => void;
  onMarginChange: (value: number) => void;
  onFileNameChange: (value: string) => void;
  onSave: () => void;
}

const TestPatternForm: React.FC<TestPatternFormProps> = ({
  minSpeed,
  maxSpeed,
  minPower,
  maxPower,
  speedSteps,
  powerSteps,
  squareSize,
  spacing,
  margin,
  fileName,
  onMinSpeedChange,
  onMaxSpeedChange,
  onMinPowerChange,
  onMaxPowerChange,
  onSpeedStepsChange,
  onPowerStepsChange,
  onSquareSizeChange,
  onSpacingChange,
  onMarginChange,
  onFileNameChange,
  onSave
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 text-sm">
      <h2 className="font-semibold text-gray-800 mb-2">Test Pattern Configuration</h2>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Speed Settings */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700 text-xs">Speed (X axis)</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600">
                Minimum (units/min):
              </label>
              <input 
                type="number" 
                value={minSpeed}
                onChange={(e) => onMinSpeedChange(Number(e.target.value))}
                min="1"
                className="w-full p-1 text-xs border rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">
                Maximum (units/min):
              </label>
              <input 
                type="number" 
                value={maxSpeed}
                onChange={(e) => onMaxSpeedChange(Number(e.target.value))}
                min={minSpeed + 1}
                className="w-full p-1 text-xs border rounded"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600">
              Steps (columns):
            </label>
            <input 
              type="number" 
              value={speedSteps}
              onChange={(e) => onSpeedStepsChange(Number(e.target.value))}
              min="2"
              max="20"
              className="w-full p-1 text-xs border rounded"
            />
          </div>
        </div>
        
        {/* Power Settings */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700 text-xs">Power (Y axis)</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600">
                Minimum (%):
              </label>
              <input 
                type="number" 
                value={minPower}
                onChange={(e) => onMinPowerChange(Number(e.target.value))}
                min="0"
                max="99"
                className="w-full p-1 text-xs border rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">
                Maximum (%):
              </label>
              <input 
                type="number" 
                value={maxPower}
                onChange={(e) => onMaxPowerChange(Number(e.target.value))}
                min={minPower + 1}
                max="100"
                className="w-full p-1 text-xs border rounded"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600">
              Steps (rows):
            </label>
            <input 
              type="number" 
              value={powerSteps}
              onChange={(e) => onPowerStepsChange(Number(e.target.value))}
              min="2"
              max="20"
              className="w-full p-1 text-xs border rounded"
            />
          </div>
        </div>
      </div>
      
      {/* Geometry Settings */}
      <h3 className="font-medium text-gray-700 text-xs mt-3 mb-1">Geometry</h3>
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
      
      {/* Help text */}
      <div className="mt-3 bg-blue-50 p-2 rounded text-xs text-blue-700">
        This pattern creates squares with increasing speed (X axis) and power (Y axis).
        Use it to find the optimal combination for your laser and material.
      </div>
    </div>
  );
};

export default TestPatternForm;
