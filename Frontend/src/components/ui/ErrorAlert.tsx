import React from 'react';

interface ErrorAlertProps {
  message: string | object | any;
  onClose?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onClose }) => {
  // Handle different types of error messages
  const formatErrorMessage = (message: any): React.ReactNode => {
    if (typeof message === 'string') {
      // Check if the message contains multiple errors (separated by periods)
      if (message.includes('. ')) {
        const errorMessages = message.split('. ').filter(msg => msg.trim() !== '');
        return (
          <ul className="list-disc pl-5">
            {errorMessages.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        );
      }
      return message;
    } else if (message && typeof message === 'object') {
      // If it's a validation error object with details
      if (message.details) {
        const fieldErrors: string[] = [];
        
        Object.entries(message.details).forEach(([field, data]: [string, any]) => {
          if (data && data.exists && data.message) {
            fieldErrors.push(`${field}: ${data.message}`);
          }
        });
        
        if (fieldErrors.length > 0) {
          return (
            <ul className="list-disc pl-5">
              {fieldErrors.map((msg, index) => (
                <li key={index}>{msg}</li>
              ))}
            </ul>
          );
        }
      }
      
      // If it's a ZodError or similar validation error object
      if (message.type && message.loc && message.msg) {
        return message.msg;
      }
      
      // If it's a generic object, try to extract a meaningful message
      if (message.message) {
        return message.message;
      }
      
      // If it has multiple error fields, join them
      if (Object.keys(message).length > 0) {
        const errorEntries = Object.entries(message)
          .filter(([_, val]) => typeof val === 'string')
          .map(([key, val]) => `${key}: ${val}`);
          
        if (errorEntries.length > 0) {
          return (
            <ul className="list-disc pl-5">
              {errorEntries.map((msg, index) => (
                <li key={index}>{msg}</li>
              ))}
            </ul>
          );
        }
      }
      
      // Last resort, stringify the object
      try {
        return JSON.stringify(message);
      } catch (e) {
        return 'An unknown error occurred';
      }
    }
    
    return 'An error occurred';
  };

  const errorContent = formatErrorMessage(message);

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <div className="text-sm text-red-700">{errorContent}</div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={onClose}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
