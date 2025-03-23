import React from 'react';

interface CorrectionControlsProps {
  coefficient: number;
  onCoefficientChange: (value: number) => void;
  axis: 'X' | 'Y';
  onAxisChange: (axis: 'X' | 'Y') => void;
}

const CorrectionControls: React.FC<CorrectionControlsProps> = ({ 
  coefficient, 
  onCoefficientChange, 
  axis, 
  onAxisChange 
}) => {
  return (
    <div className="p-2 bg-white rounded-lg shadow-sm">
      <h3 className="text-sm font-semibold mb-2">Corrección de Velocidad para Láser</h3>
      
      <div className="mb-3">
        <label className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-700">Coeficiente: {coefficient.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={coefficient}
          onChange={(e) => onCoefficientChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>0</span>
          <span>1</span>
        </div>
      </div>
      
      <div className="mb-2">
        <span className="text-xs text-gray-700 block mb-1">Eje con menor eficiencia:</span>
        <div className="flex space-x-2">
          <button
            className={`py-1 px-3 text-xs rounded-md ${
              axis === 'X' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => onAxisChange('X')}
          >
            Eje X
          </button>
          <button
            className={`py-1 px-3 text-xs rounded-md ${
              axis === 'Y' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => onAxisChange('Y')}
          >
            Eje Y
          </button>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded-lg">
        <p>La reducción de velocidad se aplicará según la orientación de cada línea para compensar la forma rectangular del haz láser.</p>
      </div>
    </div>
  );
};

export default CorrectionControls;
