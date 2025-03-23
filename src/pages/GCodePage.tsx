import React, { useState, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import GCodeViewer from '../components/GCodeViewer';
import CorrectionControls from '../components/CorrectionControls';
import GCodeCorrector from '../utils/GCodeCorrector';
import GCodeParser from '../utils/GCodeParser';

const GCodePage: React.FC = () => {
  const [gcodeContent, setGcodeContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  // Estados para la corrección
  const [correctionCoefficient, setCorrectionCoefficient] = useState<number>(0.5);
  const [correctionAxis, setCorrectionAxis] = useState<'X' | 'Y'>('X');
  
  // Estado para mostrar original o corregido
  const [viewMode, setViewMode] = useState<'original' | 'corrected'>('corrected');
  const [showComparison, setShowComparison] = useState<boolean>(true);
  
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

  const handleFileLoaded = (content: string, name: string) => {
    setGcodeContent(content);
    setFileName(name);
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
      return;
    }

    // Parsear para obtener bbox y centroid
    const parser = new GCodeParser();
    parser.parseGCode(gcodeContent);
    const bbox = parser.getBoundingBox();
    const centroid = parser.getCentroid();

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
  }, [gcodeContent, correctionCoefficient, correctionAxis]);

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
