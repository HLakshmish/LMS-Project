import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorAlert from '../components/ui/ErrorAlert';
import SuccessAlert from '../components/ui/SuccessAlert';
import { ErrorBoundary, GlobalErrorHandler, showGlobalError, showGlobalSuccess } from '../components/ui/ErrorHandling';

describe('Error Handling Components', () => {
  // Test ErrorAlert component
  describe('ErrorAlert Component', () => {
    test('renders error message correctly', () => {
      const errorMessage = 'This is an error message';
      render(<ErrorAlert message={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    test('calls onClose when close button is clicked', () => {
      const errorMessage = 'This is an error message';
      const mockOnClose = jest.fn();
      
      render(<ErrorAlert message={errorMessage} onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: /Dismiss/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    
    test('does not show close button when onClose is not provided', () => {
      const errorMessage = 'This is an error message';
      render(<ErrorAlert message={errorMessage} />);
      
      const closeButton = screen.queryByRole('button', { name: /Dismiss/i });
      expect(closeButton).not.toBeInTheDocument();
    });
  });
  
  // Test SuccessAlert component
  describe('SuccessAlert Component', () => {
    test('renders success message correctly', () => {
      const successMessage = 'This is a success message';
      render(<SuccessAlert message={successMessage} />);
      
      expect(screen.getByText(successMessage)).toBeInTheDocument();
    });
    
    test('calls onClose when close button is clicked', () => {
      const successMessage = 'This is a success message';
      const mockOnClose = jest.fn();
      
      render(<SuccessAlert message={successMessage} onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: /Dismiss/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    
    test('does not show close button when onClose is not provided', () => {
      const successMessage = 'This is a success message';
      render(<SuccessAlert message={successMessage} />);
      
      const closeButton = screen.queryByRole('button', { name: /Dismiss/i });
      expect(closeButton).not.toBeInTheDocument();
    });
  });
  
  // Test ErrorBoundary component
  describe('ErrorBoundary Component', () => {
    // Mock console.error to prevent test output noise
    const originalConsoleError = console.error;
    beforeAll(() => {
      console.error = jest.fn();
    });
    
    afterAll(() => {
      console.error = originalConsoleError;
    });
    
    test('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Child component</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Child component')).toBeInTheDocument();
    });
    
    test('renders fallback UI when there is an error', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };
      
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
    });
    
    test('renders custom fallback when provided', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };
      
      const CustomFallback = () => <div>Custom error UI</div>;
      
      render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });
  });
});
