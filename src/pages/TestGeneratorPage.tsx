import React, { useState, useEffect } from 'react';
import GCodeViewer from '../components/GCodeViewer';
import TestPatternForm from '../components/TestPatternForm';

const TestGeneratorPage: React.FC = () => {
  // Parámetros de configuración
  const [minSpeed, setMinSpeed] = useState<number>(100);
  const [maxSpeed, setMaxSpeed] = useState<number>(3000);
  const [minPower, setMinPower] = useState<number>(5);
  const [maxPower, setMaxPower] = useState<number>(100);
  const [speedSteps, setSpeedSteps] = useState<number>(5);
  const [powerSteps, setPowerSteps] = useState<number>(5);
  const [squareSize, setSquareSize] = useState<number>(10);
  const [spacing, setSpacing] = useState<number>(5);
  const [margin, setMargin] = useState<number>(10);
  
  // GCODE generado
  const [generatedGCode, setGeneratedGCode] = useState<string>('');
  const [fileName, setFileName] = useState<string>('laser_test_pattern.gcode');
  
  // New state for save message (reutilizado de GCodePage)
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Generar GCODE cuando cambien los parámetros
  useEffect(() => {
    generateTestPattern();
  }, [minSpeed, maxSpeed, minPower, maxPower, speedSteps, powerSteps, squareSize, spacing, margin]);

  // Función para generar el patrón de prueba GCODE
  const generateTestPattern = () => {
    let gcode = `;Laser Test Pattern Generator\n`;
    gcode += `;Speed: ${minSpeed}-${maxSpeed} units/min in ${speedSteps} steps\n`;
    gcode += `;Power: ${minPower}-${maxPower}% in ${powerSteps} steps\n`;
    gcode += `;Square Size: ${squareSize}mm, Spacing: ${spacing}mm, Margin: ${margin}mm\n\n`;
    
    // Configuración inicial
    gcode += `G21 ; Set units to millimeters\n`;
    gcode += `G90 ; Absolute positioning\n`;
    gcode += `M5 ; Laser off\n`;
    gcode += `G0 X0 Y0 ; Move to origin\n\n`;

    // Calcular incrementos
    const speedIncrement = (maxSpeed - minSpeed) / (speedSteps - 1 || 1);
    const powerIncrement = (maxPower - minPower) / (powerSteps - 1 || 1);
    
    // Calcular tamaño total de la matriz
    const totalWidth = speedSteps * (squareSize + spacing) - spacing;
    const totalHeight = powerSteps * (squareSize + spacing) - spacing;
    
    // En lugar de coordenadas negativas, usamos un margen para todo
    // Las coordenadas de inicio de la matriz serán (margin, margin)
    const matrixStartX = margin;
    const matrixStartY = margin;
    
    // Añadir un rectángulo exterior para delimitar la prueba
    gcode += `; Outer rectangle to mark the test area\n`;
    gcode += `G0 X${matrixStartX - spacing} Y${matrixStartY - spacing} ; Move to start position\n`;
    gcode += `M3 S${Math.round(maxPower * 2.55)} ; Set max power\n`;
    gcode += `G1 X${matrixStartX + totalWidth + spacing} Y${matrixStartY - spacing} F${maxSpeed} ; Draw bottom edge\n`;
    gcode += `G1 X${matrixStartX + totalWidth + spacing} Y${matrixStartY + totalHeight + spacing} ; Draw right edge\n`;
    gcode += `G1 X${matrixStartX - spacing} Y${matrixStartY + totalHeight + spacing} ; Draw top edge\n`;
    gcode += `G1 X${matrixStartX - spacing} Y${matrixStartY - spacing} ; Draw left edge\n`;
    gcode += `M5 ; Laser off\n\n`;

    // Crear cuadrados para cada combinación de velocidad y potencia
    for (let p = 0; p < powerSteps; p++) {
      const power = minPower + (powerIncrement * p);
      const normalizedPower = Math.round(power * 2.55); // Convertir porcentaje (0-100) a valor S (0-255)
      
      for (let s = 0; s < speedSteps; s++) {
        const speed = minSpeed + (speedIncrement * s);
        
        // Posición del cuadrado actual (desplazada por el margen)
        const xPos = matrixStartX + s * (squareSize + spacing);
        const yPos = matrixStartY + p * (squareSize + spacing);
        
        gcode += `; Square at Speed ${Math.round(speed)} units/min, Power ${Math.round(power)}%\n`;
        gcode += `G0 X${xPos} Y${yPos} ; Move to start position\n`;
        gcode += `M3 S${normalizedPower} ; Set laser power\n`;
        
        // Dibujar el cuadrado
        gcode += `G1 X${xPos + squareSize} Y${yPos} F${speed} ; Bottom edge\n`;
        gcode += `G1 X${xPos + squareSize} Y${yPos + squareSize} ; Right edge\n`;
        gcode += `G1 X${xPos} Y${yPos + squareSize} ; Top edge\n`;
        gcode += `G1 X${xPos} Y${yPos} ; Left edge\n`;
        gcode += `M5 ; Laser off\n\n`;
      }
    }
    
    // Añadir etiquetas para los valores de velocidad (eje X)
    gcode += `; Speed labels on X axis - using comments only, no negative coordinates\n`;
    for (let s = 0; s < speedSteps; s++) {
      const speed = minSpeed + (speedIncrement * s);
      const xCenter = matrixStartX + s * (squareSize + spacing) + squareSize / 2;
      
      gcode += `; X-Label at X=${xCenter} Y=${matrixStartY - spacing}: ${Math.round(speed)}\n`;
    }
    
    // Añadir etiquetas para los valores de potencia (eje Y)
    gcode += `\n; Power labels on Y axis - using comments only, no negative coordinates\n`;
    for (let p = 0; p < powerSteps; p++) {
      const power = minPower + (powerIncrement * p);
      const yCenter = matrixStartY + p * (squareSize + spacing) + squareSize / 2;
      
      gcode += `; Y-Label at X=${matrixStartX - spacing} Y=${yCenter}: ${Math.round(power)}%\n`;
    }
    
    // Finalizar
    gcode += `\nG0 X0 Y0 ; Return to origin\n`;
    gcode += `M5 ; Ensure laser is off\n`;
    
    setGeneratedGCode(gcode);
  };

  // Función para descargar el archivo GCODE (reemplazada con la lógica de GCodePage)
  const downloadGCode = async () => {
    try {
      // Si estamos en el contexto de Electron, usar la API de Electron
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        setSaveMessage({
          type: 'error',
          text: 'Error: Electron API not available'
        });
        return;
      }

      // Call the save file method - FIX HERE: switch the parameter order
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
          <h1 className="text-xl font-bold text-blue-700">Laser Test Pattern Generator</h1>
          
          {/* Display save message if present - reutilizado de GCodePage */}
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
        {/* Panel izquierdo - Configuración */}
        <div className="col-span-1 flex flex-col space-y-3 overflow-hidden">
          <TestPatternForm
            minSpeed={minSpeed}
            maxSpeed={maxSpeed}
            minPower={minPower}
            maxPower={maxPower}
            speedSteps={speedSteps}
            powerSteps={powerSteps}
            squareSize={squareSize}
            spacing={spacing}
            margin={margin}
            fileName={fileName}
            onMinSpeedChange={setMinSpeed}
            onMaxSpeedChange={setMaxSpeed}
            onMinPowerChange={setMinPower}
            onMaxPowerChange={setMaxPower}
            onSpeedStepsChange={setSpeedSteps}
            onPowerStepsChange={setPowerSteps}
            onSquareSizeChange={setSquareSize}
            onSpacingChange={setSpacing}
            onMarginChange={setMargin}
            onFileNameChange={setFileName}
            onSave={downloadGCode}
          />
          
          {/* Button to save - reutilizado de GCodePage pero con texto diferente */}
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
        
        {/* Panel derecho - Visualizador */}
        <div className="col-span-3 bg-white rounded-lg shadow-sm overflow-hidden border">
          {generatedGCode ? (
            <GCodeViewer gcodeContent={generatedGCode} />
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
