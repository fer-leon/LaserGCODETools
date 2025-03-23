import React, { useState } from 'react';

interface TimeEstimationConfigProps {
  acceleration: number;
  onAccelerationChange: (value: number) => void;
}

const TimeEstimationConfig: React.FC<TimeEstimationConfigProps> = ({ 
  acceleration, 
  onAccelerationChange 
}) => {
  const [inputValue, setInputValue] = useState(String(acceleration));
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      onAccelerationChange(value);
    }
  };

  return (
    <div className="p-2 bg-white rounded-lg shadow-sm">
      <h3 className="text-sm font-semibold mb-2">Estimación de Tiempo</h3>
      
      <div className="mb-2">
        <label className="flex flex-col mb-1">
          <span className="text-xs text-gray-700 mb-1">Aceleración máxima (mm/s²):</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={inputValue}
            onChange={handleInputChange}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Valores típicos: 500-2000 mm/s²
        </p>
      </div>
    </div>
  );
};

export default TimeEstimationConfig;
