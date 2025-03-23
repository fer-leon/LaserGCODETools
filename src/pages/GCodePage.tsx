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
  
  // Estados para la corrección
  const [correctionCoefficient, setCorrectionCoefficient] = useState<number>(0.5);
  const [correctionAxis, setCorrectionAxis] = useState<'X' | 'Y'>('X');
  
  // Estado para mostrar original o corregido
  const [viewMode, setViewMode] = useState<'original' | 'corrected'>('corrected');
  const [showComparison, setShowComparison] = useState<boolean>(true);
  
  // Estado para la estimación de tiempo
  const [acceleration, setAcceleration] = useState<number>(500); // 500 mm/s² por defecto
  const [timeEstimation, setTimeEstimation] = useState<TimeEstimationResult | null>(null);
  
  // Estados para los resultados de la corrección
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

  // Nuevo estado para el contenido GCODE corregido
  const [correctedGCodeContent, setCorrectedGCodeContent] = useState<string | null>(null);
  
  // Nuevo estado para el mensaje de guardado
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleFileLoaded = (content: string, name: string) => {
    setGcodeContent(content);
    setFileName(name);
    // Limpiar mensajes antiguos cuando se carga un nuevo archivo
    setSaveMessage(null);
  };

  // Aplicar la corrección cuando cambia el gcode, coeficiente o eje
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

    // Parsear para obtener bbox y centroid
    const parser = new GCodeParser();
    parser.parseGCode(gcodeContent);
    const bbox = parser.getBoundingBox();
    const centroid = parser.getCentroid();
    const originalPaths = parser.getPaths();

    // Aplicar corrección
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

    // Guardar el contenido GCODE corregido
    setCorrectedGCodeContent(result.correctedGCode || null);

    // Estimar tiempo de ejecución
    if (result.correctedPaths) {
      const timeResult = TimeEstimator.estimateTime(
        result.correctedPaths, 
        acceleration,
        originalPaths
      );
      setTimeEstimation(timeResult);
    }
  }, [gcodeContent, correctionCoefficient, correctionAxis, acceleration]);

  // Función para guardar el archivo GCODE corregido
  const handleSaveFile = async () => {
    if (!correctedGCodeContent) {
      setSaveMessage({
        type: 'error',
        text: 'No hay contenido corregido para guardar'
      });
      return;
    }

    try {
      // Generar un nombre sugerido basado en el archivo original
      const suggestedName = fileName 
        ? `${fileName.split('.').slice(0, -1).join('.')}_corrected.gcode`
        : 'corrected.gcode';

      // Acceder a la API de Electron
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        setSaveMessage({
          type: 'error',
          text: 'Error: API de Electron no disponible'
        });
        return;
      }

      // Llamar al método de guardar archivo
      const result = await electronAPI.saveFile(correctedGCodeContent, suggestedName);
      
      if (result.success) {
        setSaveMessage({
          type: 'success',
          text: `Archivo guardado exitosamente`
        });
        
        // Limpiar el mensaje después de 3 segundos
        setTimeout(() => {
          setSaveMessage(null);
        }, 3000);
      } else {
        setSaveMessage({
          type: 'error',
          text: `Error al guardar: ${result.error}`
        });
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setSaveMessage({
        type: 'error',
        text: 'Error inesperado al guardar el archivo'
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-2">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-blue-700">Corrector GCODE para Láser</h1>
        {fileName && (
          <h2 className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded truncate max-w-xs">
            Archivo: {fileName}
          </h2>
        )}
      </div>
      
      <div className="flex flex-1 min-h-0 space-x-2">
        {/* Panel izquierdo: carga y controles */}
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
              
              {/* Información de tiempo estimado */}
              {timeEstimation && (
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <h3 className="text-sm font-semibold mb-2">Tiempo Estimado</h3>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">
                        {TimeEstimator.formatTime(timeEstimation.totalTime)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Movimientos rápidos:</span>
                      <span>
                        {TimeEstimator.formatTime(timeEstimation.rapidTime)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Movimientos de corte:</span>
                      <span>
                        {TimeEstimator.formatTime(timeEstimation.cuttingTime)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botón de guardar archivo corregido */}
              {viewMode === 'corrected' && correctedGCodeContent && (
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <button
                    onClick={handleSaveFile}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded flex items-center justify-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span className="text-sm">Guardar GCODE Corregido</span>
                  </button>
                  
                  {/* Mensaje de éxito o error */}
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
              
              {/* Controles para cambiar el modo de visualización */}
              <div className="p-2 bg-white rounded-lg shadow-sm space-y-2">
                <h3 className="text-sm font-semibold mb-2">Opciones de visualización</h3>              
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
                    Corregido
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-2 text-center bg-gray-100 rounded-lg">
              <p className="text-gray-600 text-xs">Carga un archivo GCODE para visualizarlo y aplicar correcciones</p>
            </div>
          )}
        </div>
        
        {/* Panel principal: visualización única */}
        <div className="flex-1 flex flex-col min-h-0">
          {gcodeContent ? (
            <div className="flex-1 border border-gray-200 rounded min-h-0">
              {viewMode === 'original' ? (
                <GCodeViewer 
                  gcodeContent={gcodeContent}
                  title="GCODE Original" 
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
                  title="GCODE con Corrección de Velocidad"
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
