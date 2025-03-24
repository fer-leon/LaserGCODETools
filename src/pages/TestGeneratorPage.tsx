import React, { useState, useEffect } from 'react';
import GCodeViewer from '../components/GCodeViewer';

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

  // Función para descargar el archivo GCODE
  const downloadGCode = async () => {
    try {
      // Si estamos en el contexto de Electron, usar la API de Electron
      const electronAPI = (window as any).electronAPI;
      if (electronAPI) {
        await electronAPI.saveFile(fileName, generatedGCode);
      } else {
        // Fallback para navegador web normal
        const blob = new Blob([generatedGCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Laser Test Pattern Generator</h1>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Panel de configuración */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Configuration</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Configuración de velocidad */}
            <div>
              <h3 className="text-md font-medium mb-2">Speed (X axis)</h3>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Minimum Speed (units/min):
                </label>
                <input 
                  type="number" 
                  value={minSpeed}
                  onChange={(e) => setMinSpeed(Number(e.target.value))}
                  min="1"
                  className="w-full p-1 border rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Maximum Speed (units/min):
                </label>
                <input 
                  type="number" 
                  value={maxSpeed}
                  onChange={(e) => setMaxSpeed(Number(e.target.value))}
                  min={minSpeed + 1}
                  className="w-full p-1 border rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Speed Steps (columns):
                </label>
                <input 
                  type="number" 
                  value={speedSteps}
                  onChange={(e) => setSpeedSteps(Number(e.target.value))}
                  min="2"
                  max="20"
                  className="w-full p-1 border rounded"
                />
              </div>
            </div>
            
            {/* Configuración de potencia */}
            <div>
              <h3 className="text-md font-medium mb-2">Power (Y axis)</h3>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Minimum Power (%):
                </label>
                <input 
                  type="number" 
                  value={minPower}
                  onChange={(e) => setMinPower(Number(e.target.value))}
                  min="0"
                  max="99"
                  className="w-full p-1 border rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Maximum Power (%):
                </label>
                <input 
                  type="number" 
                  value={maxPower}
                  onChange={(e) => setMaxPower(Number(e.target.value))}
                  min={minPower + 1}
                  max="100"
                  className="w-full p-1 border rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Power Steps (rows):
                </label>
                <input 
                  type="number" 
                  value={powerSteps}
                  onChange={(e) => setPowerSteps(Number(e.target.value))}
                  min="2"
                  max="20"
                  className="w-full p-1 border rounded"
                />
              </div>
            </div>
          </div>
          
          {/* Configuración de la geometría */}
          <h3 className="text-md font-medium mt-2 mb-2">Geometry</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">
                Square Size (mm):
              </label>
              <input 
                type="number" 
                value={squareSize}
                onChange={(e) => setSquareSize(Number(e.target.value))}
                min="1"
                className="w-full p-1 border rounded"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">
                Spacing (mm):
              </label>
              <input 
                type="number" 
                value={spacing}
                onChange={(e) => setSpacing(Number(e.target.value))}
                min="1"
                className="w-full p-1 border rounded"
              />
            </div>
          </div>
          
          {/* Opción de margen */}
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">
              Margin (mm):
            </label>
            <input 
              type="number" 
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              min="1"
              className="w-full p-1 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Distance from origin to the test pattern
            </p>
          </div>
          
          {/* Opción para guardar */}
          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-1">
              File Name:
            </label>
            <div className="flex">
              <input 
                type="text" 
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-grow p-1 border rounded-l"
              />
              <button 
                onClick={downloadGCode}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-r"
              >
                Save
              </button>
            </div>
          </div>
        </div>
        
        {/* Visualizador de GCODE */}
        <div className="bg-white rounded-lg shadow p-4 h-[600px] flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Preview</h2>
          <div className="flex-grow">
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
      
      {/* Sección informativa */}
      <div className="mt-4 bg-blue-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-blue-800 mb-2">How to use this test pattern</h3>
        <p className="text-sm text-blue-700">
          This pattern creates a matrix of squares where speed increases from left to right (X axis)
          and power increases from bottom to top (Y axis). Engrave this pattern on your material
          to find the optimal combination of speed and power for your specific laser and material.
          The ideal setting will create clear marks without burning or discoloration.
        </p>
      </div>
    </div>
  );
};

export default TestGeneratorPage;
