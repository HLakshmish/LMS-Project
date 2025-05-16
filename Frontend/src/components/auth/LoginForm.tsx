import React from 'react';
import { Form, FormField } from '../ui/Form';
import { loginSchema } from '../../utils/validation';
import { Link } from 'react-router-dom';
import ErrorAlert from '../ui/ErrorAlert';
import Button from '../ui/Button';

interface LoginFormProps {
  onLogin: (data: { email: string; password: string }) => void;
  isLoading: boolean;
  error: string | null | object | any;
  successMessage?: string | null;
  initialEmail?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onLogin, 
  isLoading, 
  error, 
  successMessage, 
  initialEmail = '' 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>
        
        {error && <ErrorAlert message={error} />}
        
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}
        
        <Form
          initialValues={{ email: initialEmail, password: '' }}
          validationSchema={loginSchema}
          onSubmit={(values) => onLogin({ email: values.email, password: values.password })}
          submitButtonText="Sign in"
          isSubmitting={isLoading}
          className="mt-8 space-y-6 bg-white p-8 shadow rounded-lg"
        >
          {({ values, errors, handleChange, FormField }) => (
            <>
              <FormField
                label="Email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                error={errors?.email ? String(errors.email) : undefined}
                required
                autoComplete="email"
              />
              
              <FormField
                label="Password"
                name="password"
                type="password"
                value={values.password}
                onChange={handleChange}
                error={errors?.password ? String(errors.password) : undefined}
                required
                autoComplete="current-password"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                
                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>
            </>
          )}
        </Form>
      </div>
    </div>
  );
};

export default LoginForm;
