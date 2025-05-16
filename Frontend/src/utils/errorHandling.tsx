import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import { showGlobalError } from '../components/ui/ErrorHandling';

// Define the shape of the error handling context
interface ErrorHandlingContextType {
  handleApiError: (error: unknown, fallbackMessage?: string) => void;
  setLoading: (isLoading: boolean) => void;
  isLoading: boolean;
}

// Create the context
const ErrorHandlingContext = createContext<ErrorHandlingContextType | undefined>(undefined);

interface ErrorHandlingProviderProps {
  children: ReactNode;
}

export const ErrorHandlingProvider: React.FC<ErrorHandlingProviderProps> = ({ children }) => {
  const [isLoading, setLoading] = useState<boolean>(false);

  // Global axios error interceptor
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        handleApiError(error);
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Function to handle API errors
  const handleApiError = (error: unknown, fallbackMessage = 'An unexpected error occurred') => {
    let errorMessage = fallbackMessage;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Handle different types of axios errors
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const data = axiosError.response.data as any;
        
        if (data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        // Handle specific status codes
        if (axiosError.response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
          // Could trigger a logout action here
        } else if (axiosError.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (axiosError.response.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (axiosError.response.status === 422) {
          errorMessage = 'Validation error. Please check your input.';
          
          // Handle validation errors
          if (data.detail && Array.isArray(data.detail)) {
            const validationErrors = data.detail.map((err: any) => 
              `${err.loc[1]}: ${err.msg}`
            ).join(', ');
            
            errorMessage = `Validation error: ${validationErrors}`;
          }
        } else if (axiosError.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (axiosError.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your internet connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = axiosError.message || fallbackMessage;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Show the error message
    showGlobalError(errorMessage);
    
    // Log the error for debugging
    console.error('API Error:', error);
  };

  const value = {
    handleApiError,
    setLoading,
    isLoading,
  };

  return (
    <ErrorHandlingContext.Provider value={value}>
      {children}
    </ErrorHandlingContext.Provider>
  );
};

// Custom hook to use the error handling context
export const useErrorHandling = (): ErrorHandlingContextType => {
  const context = useContext(ErrorHandlingContext);
  if (context === undefined) {
    throw new Error('useErrorHandling must be used within an ErrorHandlingProvider');
  }
  return context;
};

// Higher-order component to wrap API calls with error handling and loading state
export const withErrorHandling = <P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P> => {
  return (props: P) => {
    return (
      <ErrorHandlingProvider>
        <Component {...props} />
      </ErrorHandlingProvider>
    );
  };
};
