import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GCodePage from './pages/GCodePage';

function Homepage() {
    return(
        <div className="container mx-auto p-4">
            <h1 className="font-bold text-3xl mb-6 text-blue-700">GCODE Viewer App</h1>
            <p className="mb-4">Welcome to the GCODE Viewer application!</p>
            <p className="mb-6">This app allows you to load and visualize GCODE files from your computer.</p>
            <Link to="/gcode-viewer" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Open GCODE Viewer
            </Link>
        </div>
    )
}

export default function App() {
    return (
      <Router>
        <nav className="bg-gray-100 p-4 mb-6">
          <ul className="flex space-x-4">
            <li>
              <Link to="/" className="text-blue-600 hover:text-blue-800">Home</Link>
            </li>
            <li>
              <Link to="/gcode-viewer" className="text-blue-600 hover:text-blue-800">GCODE Viewer</Link>
            </li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/gcode-viewer" element={<GCodePage />} />
        </Routes>
      </Router>
    );
  }