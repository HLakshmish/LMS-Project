import React, { useState } from 'react';
import { z } from 'zod';
import { getErrorMessages } from '../../utils/validation';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  autoComplete?: string;
  className?: string;
  as?: 'input' | 'textarea' | 'select';
  rows?: number;
  options?: Array<{ value: string | number; label: string }>;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  min,
  max,
  step,
  autoComplete,
  className = '',
  as = 'input',
  rows = 3,
  options = [],
}) => {
  // Format error message if it's not a string
  const formatError = (err: any): string | undefined => {
    if (err === undefined || err === null) {
      return undefined;
    }
    
    if (typeof err === 'string') {
      return err;
    }
    
    // Handle Zod error objects or other objects
    if (typeof err === 'object') {
      if (err.message) {
        return err.message;
      }
      if (err.msg) {
        return err.msg;
      }
      // Last resort - stringify the object
      try {
        return JSON.stringify(err);
      } catch (e) {
        return 'Invalid field';
      }
    }
    
    return String(err);
  };
  
  const errorMessage = formatError(error);
  
  const inputClasses = `block w-full px-3 py-2 border ${
    errorMessage ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${className}`;

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {as === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          className={inputClasses}
        />
      ) : as === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
          disabled={disabled}
          required={required}
          className={inputClasses}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          autoComplete={autoComplete}
          className={inputClasses}
        />
      )}
      
      {errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};

interface FormProps<T extends z.ZodType<any, any>> {
  initialValues: Record<string, any>;
  validationSchema: T;
  onSubmit: (values: z.infer<T>) => void;
  submitButtonText: string;
  cancelButtonText?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
  children: (props: {
    values: Record<string, any>;
    errors: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    setFieldValue: (field: string, value: any) => void;
    FormField: typeof FormField;
  }) => React.ReactNode;
}

function Form<T extends z.ZodType<any, any>>({
  initialValues,
  validationSchema,
  onSubmit,
  submitButtonText,
  cancelButtonText,
  onCancel,
  isSubmitting = false,
  className = '',
  children,
}: FormProps<T>) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (fieldValues = values) => {
    const result = validationSchema.safeParse(fieldValues);
    if (!result.success) {
      const fieldErrors = getErrorMessages(result.error);
      
      // Convert any non-string error values to strings
      const formattedErrors: Record<string, string> = {};
      Object.entries(fieldErrors).forEach(([key, value]) => {
        if (typeof value === 'string') {
          formattedErrors[key] = value;
        } else if (value === null || value === undefined) {
          formattedErrors[key] = '';
        } else if (typeof value === 'object') {
          // Handle Zod error objects with type assertion
          const objValue = value as unknown as { message?: string };
          if (objValue && 'message' in objValue) {
            formattedErrors[key] = String(objValue.message);
          } else {
            try {
              formattedErrors[key] = JSON.stringify(value);
            } catch (e) {
              formattedErrors[key] = 'Invalid value';
            }
          }
        } else {
          formattedErrors[key] = String(value);
        }
      });
      
      setErrors(formattedErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    
    setValues({
      ...values,
      [name]: newValue,
    });
    
    setTouched({
      ...touched,
      [name]: true,
    });
    
    // Validate the field if it's been touched
    if (touched[name]) {
      validate({
        ...values,
        [name]: newValue,
      });
    }
  };

  const setFieldValue = (field: string, value: any) => {
    setValues({
      ...values,
      [field]: value,
    });
    
    setTouched({
      ...touched,
      [field]: true,
    });
    
    // Validate the field if it's been touched
    if (touched[field]) {
      validate({
        ...values,
        [field]: value,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    setTouched(allTouched);
    
    // Validate all fields
    const isValid = validate();
    
    if (isValid) {
      onSubmit(values as z.infer<T>);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {children({
        values,
        errors,
        handleChange,
        handleSubmit,
        setFieldValue,
        FormField,
      })}
      
      <div className="flex justify-end space-x-3 mt-6">
        {onCancel && cancelButtonText && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            {cancelButtonText}
          </button>
        )}
        
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : submitButtonText}
        </button>
      </div>
    </form>
  );
}

export { Form, FormField };
