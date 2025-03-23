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
            <CorrectionControls 
              coefficient={correctionCoefficient}
              onCoefficientChange={setCorrectionCoefficient}
              axis={correctionAxis}
              onAxisChange={setCorrectionAxis}
            />
          ) : (
            <div className="p-2 text-center bg-gray-100 rounded-lg">
              <p className="text-gray-600 text-xs">Carga un archivo GCODE para visualizarlo y aplicar correcciones</p>
            </div>
          )}
        </div>
        
        {/* Panel principal: visualizaciones */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          {gcodeContent ? (
            <>
              {/* Vista dividida con etiquetas */}
              <div className="flex text-xs font-semibold bg-gray-100 rounded-t px-2 py-1">
                <div className="flex-1">GCODE Original</div>
                <div className="flex-1">GCODE Corregido</div>
              </div>
              
              {/* Contenedores de visualización lado a lado */}
              <div className="flex-1 flex space-x-2 min-h-0">
                <div className="flex-1 border border-gray-200 rounded min-h-0">
                  <GCodeViewer 
                    gcodeContent={gcodeContent}
                    title="Original" 
                  />
                </div>
                <div className="flex-1 border border-gray-200 rounded min-h-0">
                  <GCodeViewer 
                    customPaths={correctionResult.correctedPaths}
                    originalPaths={correctionResult.originalPaths}
                    correctionFactors={correctionResult.correctionFactors}
                    customBbox={correctionResult.bbox}
                    customCentroid={correctionResult.centroid}
                    colorMode="correction"
                    showOriginal={true}
                    title="Corregido"
                  />
                </div>
              </div>
            </>
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
