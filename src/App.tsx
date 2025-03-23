import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GCodePage from './pages/GCodePage';

function Homepage() {
    return(
        <div className="flex flex-col h-full overflow-hidden p-4">
            <h1 className="font-bold text-2xl mb-4 text-blue-700">GCODE Viewer App</h1>
            <p className="mb-2">Aplicación para visualizar archivos GCODE.</p>
            <Link to="/gcode-viewer" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-fit">
                Abrir el visualizador
            </Link>
        </div>
    )
}

export default function App() {
    return (
      <Router>
        <div className="h-screen flex flex-col overflow-hidden">
          <nav className="bg-gray-100 py-1 px-4">
            <ul className="flex space-x-4">
              <li>
                <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Inicio</Link>
              </li>
              <li>
                <Link to="/gcode-viewer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Visualizador</Link>
              </li>
            </ul>
          </nav>
          <div className="flex-1 overflow-hidden min-h-0">
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/gcode-viewer" element={<GCodePage />} />
            </Routes>
          </div>
        </div>
      </Router>
    );
  }