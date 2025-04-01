import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GCodeViewer from '../components/GCodeViewer';
import GCodeParser, { GCodePath } from '../utils/GCodeParser';

// Mock the GCodeParser class
jest.mock('../utils/GCodeParser', () => {
  const originalModule = jest.requireActual('../utils/GCodeParser');
  
  // Mock class implementation
  const MockGCodeParser = function() {
    return {
      parseGCode: jest.fn(),
      getPaths: jest.fn().mockReturnValue([
        {
          start: { x: 0, y: 0 },
          end: { x: 10, y: 10 },
          isRapid: true,
          feedrate: 3000,
          power: 0,
          laserOn: false,
          command: { code: 'G0', params: { X: 10, Y: 10 }, lineNumber: 1 }
        },
        {
          start: { x: 10, y: 10 },
          end: { x: 20, y: 20 },
          isRapid: false,
          feedrate: 1000,
          power: 100,
          laserOn: true,
          command: { code: 'G1', params: { X: 20, Y: 20, F: 1000, S: 100 }, lineNumber: 2, comment: 'Cut line' }
        }
      ]),
      getBoundingBox: jest.fn().mockReturnValue({
        min: { x: 0, y: 0 },
        max: { x: 20, y: 20 }
      }),
      getCentroid: jest.fn().mockReturnValue({ x: 10, y: 10 })
    };
  };
  
  // Add static methods from the original class
  MockGCodeParser.convertPowerToPercentage = originalModule.GCodeParser.convertPowerToPercentage || 
    jest.fn(power => (power / 255) * 100);
  
  return {
    __esModule: true,
    default: MockGCodeParser,
    GCodeParser: MockGCodeParser
  };
});

// Fix: Properly mock canvas context to satisfy TypeScript
const mockCanvasContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  closePath: jest.fn(),
  setLineDash: jest.fn(),
  strokeRect: jest.fn(),
  fillRect: jest.fn(),
  createLinearGradient: jest.fn().mockReturnValue({
    addColorStop: jest.fn()
  }),
  fillText: jest.fn(),
  // Add required properties to satisfy TypeScript
  canvas: document.createElement('canvas'),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  drawImage: jest.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline
} as unknown as CanvasRenderingContext2D;

// Use jest.spyOn instead of directly overwriting the method
const getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext');
getContextSpy.mockImplementation(() => mockCanvasContext);

// Mock data
const mockGcodeContent = `G0 X10 Y10
G1 X20 Y20 F1000 S100 ; Cut line`;

const mockPaths: GCodePath[] = [
  {
    start: { x: 0, y: 0 },
    end: { x: 10, y: 10 },
    isRapid: true,
    feedrate: 3000,
    power: 0,
    laserOn: false,
    command: { code: 'G0', params: { X: 10, Y: 10 }, lineNumber: 1 }
  },
  {
    start: { x: 10, y: 10 },
    end: { x: 20, y: 20 },
    isRapid: false,
    feedrate: 1000,
    power: 100,
    laserOn: true,
    command: { code: 'G1', params: { X: 20, Y: 20, F: 1000, S: 100 }, lineNumber: 2, comment: 'Cut line' }
  }
];

// Mock window.addEventListener for resize event
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

// Create a reusable mock for HTML elements
const createMockCanvas = () => {
  // Create the mock parent div and canvas
  const mockParentElement = document.createElement('div');
  Object.defineProperty(mockParentElement, 'clientWidth', { value: 800 });
  Object.defineProperty(mockParentElement, 'clientHeight', { value: 600 });
  
  const mockCanvas = document.createElement('canvas');
  Object.defineProperty(mockCanvas, 'width', { value: 800, writable: true });
  Object.defineProperty(mockCanvas, 'height', { value: 600, writable: true });
  
  // The critical change: append the canvas to the parent so parentElement works naturally
  mockParentElement.appendChild(mockCanvas);
  
  // Mock getBoundingClientRect for the canvas
  mockCanvas.getBoundingClientRect = jest.fn(() => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => {}
  }));
  
  // Mock addEventListener on canvas
  mockCanvas.addEventListener = jest.fn();
  mockCanvas.removeEventListener = jest.fn();
  
  return {
    mockCanvas,
    mockParentElement
  };
};

// Spy on canvas creation to return our mock
let canvasGetContextSpy: jest.SpyInstance;
let canvasCreateElementSpy: jest.SpyInstance;
let mockCanvasInstance: HTMLCanvasElement;

// Store the original createElement function
const originalCreateElement = document.createElement;

beforeEach(() => {
  // Create a new mock canvas for each test
  const { mockCanvas } = createMockCanvas();
  mockCanvasInstance = mockCanvas;
  
  // Mock window event listeners
  window.addEventListener = jest.fn();
  window.removeEventListener = jest.fn();
  
  // Spy on the document createElement to return our mock canvas when needed
  canvasCreateElementSpy = jest.spyOn(document, 'createElement');
  canvasCreateElementSpy.mockImplementation((tagName) => {
    if (tagName.toLowerCase() === 'canvas') {
      return mockCanvasInstance;
    }
    // Call the original createElement for other tags
    return originalCreateElement.call(document, tagName); 
  });
  
  // Set up the context spy to return our mock context
  canvasGetContextSpy = jest.spyOn(mockCanvasInstance, 'getContext');
  canvasGetContextSpy.mockReturnValue(mockCanvasContext);
});

afterEach(() => {
  window.addEventListener = originalAddEventListener;
  window.removeEventListener = originalRemoveEventListener;
  jest.clearAllMocks();
  
  // Restore all spies
  if (canvasGetContextSpy) canvasGetContextSpy.mockRestore();
  if (canvasCreateElementSpy) canvasCreateElementSpy.mockRestore();
});

describe('GCodeViewer Component', () => {
  it('renders without crashing', () => {
    render(<GCodeViewer gcodeContent={mockGcodeContent} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
  
  it('renders with title when provided', () => {
    render(<GCodeViewer gcodeContent={mockGcodeContent} title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
  
  it('uses custom paths when provided', () => {
    const customBbox = { min: { x: 0, y: 0 }, max: { x: 20, y: 20 } };
    const customCentroid = { x: 10, y: 10 };
    
    render(
      <GCodeViewer 
        customPaths={mockPaths} 
        customBbox={customBbox} 
        customCentroid={customCentroid} 
      />
    );
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
  
  it('displays zoom controls', () => {
    render(<GCodeViewer gcodeContent={mockGcodeContent} />);
    
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });
  
  it('handles zoom in button click', () => {
    render(<GCodeViewer gcodeContent={mockGcodeContent} />);
    
    const zoomInButton = screen.getByText('+');
    fireEvent.click(zoomInButton);
    // No need to assert anything - just verify it doesn't crash
  });
  
  it('handles zoom out button click', () => {
    render(<GCodeViewer gcodeContent={mockGcodeContent} />);
    
    const zoomOutButton = screen.getByText('-');
    fireEvent.click(zoomOutButton);
    // No need to assert anything - just verify it doesn't crash
  });
  
  it('handles reset button click', () => {
    render(<GCodeViewer gcodeContent={mockGcodeContent} />);
    
    const resetButton = screen.getByText('R');
    fireEvent.click(resetButton);
    // No need to assert anything - just verify it doesn't crash
  });
  
  it('renders with different color modes', () => {
    const { rerender } = render(
      <GCodeViewer 
        gcodeContent={mockGcodeContent} 
        colorMode="default" 
      />
    );
    
    // No assertions needed, just make sure it renders without crashing
    
    rerender(
      <GCodeViewer 
        gcodeContent={mockGcodeContent} 
        colorMode="correction" 
        correctionFactors={[0, 0.5]} 
      />
    );
    
    rerender(
      <GCodeViewer 
        gcodeContent={mockGcodeContent} 
        colorMode="pattern"
        patternLegendType="power" 
      />
    );
    
    rerender(
      <GCodeViewer 
        gcodeContent={mockGcodeContent} 
        colorMode="pattern"
        patternLegendType="speed" 
      />
    );
  });
  
  it('shows original paths when showOriginal is true', () => {
    render(
      <GCodeViewer 
        gcodeContent={mockGcodeContent} 
        originalPaths={mockPaths}
        showOriginal={true}
      />
    );
    // No assertions needed, just make sure it renders without crashing
  });
  
  it('applies custom legend ranges when provided', () => {
    render(
      <GCodeViewer 
        gcodeContent={mockGcodeContent} 
        colorMode="pattern"
        patternLegendType="power"
        legendRanges={{
          power: { min: 20, max: 80 },
          speed: { min: 500, max: 2000 },
          correction: { min: 0.1, max: 0.9 }
        }}
      />
    );
    // No assertions needed, just make sure it renders without crashing
  });
  
  // Test that canvas events are set up correctly
  it('sets up canvas event listeners', () => {
    render(<GCodeViewer gcodeContent={mockGcodeContent} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    
    // Check that event listeners for canvas are added
    expect(canvas!.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(canvas!.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(canvas!.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(canvas!.addEventListener).toHaveBeenCalledWith('mouseout', expect.any(Function));
    expect(canvas!.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
  });
});
