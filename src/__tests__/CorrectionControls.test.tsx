import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CorrectionControls from '../components/CorrectionControls';

describe('CorrectionControls', () => {
  const mockCoeffChange = jest.fn();
  const mockAxisChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial values', () => {
    render(
      <CorrectionControls 
        coefficient={0.5} 
        onCoefficientChange={mockCoeffChange} 
        axis="X" 
        onAxisChange={mockAxisChange} 
      />
    );

    // Check title
    expect(screen.getByText('Laser Speed Correction')).toBeInTheDocument();
    
    // Check coefficient display
    expect(screen.getByText('Coefficient: 0.50')).toBeInTheDocument();
    
    // Check range input
    const rangeInput = screen.getByRole('slider');
    expect(rangeInput).toHaveValue('0.5');
    
    // Check that X axis button is selected
    const xButton = screen.getByText('X Axis');
    const yButton = screen.getByText('Y Axis');
    expect(xButton).toHaveClass('bg-blue-500');
    expect(yButton).not.toHaveClass('bg-blue-500');
  });

  it('calls onCoefficientChange when slider changes', () => {
    render(
      <CorrectionControls 
        coefficient={0.5} 
        onCoefficientChange={mockCoeffChange} 
        axis="X" 
        onAxisChange={mockAxisChange} 
      />
    );
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '0.75' } });
    
    expect(mockCoeffChange).toHaveBeenCalledWith(0.75);
  });

  it('calls onAxisChange when Y axis is selected', () => {
    render(
      <CorrectionControls 
        coefficient={0.5} 
        onCoefficientChange={mockCoeffChange} 
        axis="X" 
        onAxisChange={mockAxisChange} 
      />
    );
    
    const yButton = screen.getByText('Y Axis');
    fireEvent.click(yButton);
    
    expect(mockAxisChange).toHaveBeenCalledWith('Y');
  });

  it('renders with Y axis selected', () => {
    render(
      <CorrectionControls 
        coefficient={0.3} 
        onCoefficientChange={mockCoeffChange} 
        axis="Y" 
        onAxisChange={mockAxisChange} 
      />
    );
    
    const xButton = screen.getByText('X Axis');
    const yButton = screen.getByText('Y Axis');
    expect(xButton).not.toHaveClass('bg-blue-500');
    expect(yButton).toHaveClass('bg-blue-500');
  });
});