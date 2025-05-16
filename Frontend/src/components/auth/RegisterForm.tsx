import React from 'react';
import { Form, FormField } from '../ui/Form';
import { registerSchema } from '../../utils/validation';
import { Link } from 'react-router-dom';
import ErrorAlert from '../ui/ErrorAlert';
import Button from '../ui/Button';

interface RegisterFormProps {
  onRegister: (data: any) => void;
  isLoading: boolean;
  error: string | null | object | any;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, isLoading, error }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        {error && <ErrorAlert message={error} />}
        
        <Form
          initialValues={{ name: '', username: '', email: '', password: '', confirmPassword: '', role: 'student' }}
          validationSchema={registerSchema}
          onSubmit={(values) => onRegister(values)}
          submitButtonText="Create account"
          isSubmitting={isLoading}
          className="mt-8 space-y-6 bg-white p-8 shadow rounded-lg"
        >
          {({ values, errors, handleChange, FormField }) => (
            <>
              <FormField
                label="Full name"
                name="name"
                type="text"
                value={values.name}
                onChange={handleChange}
                error={errors?.name ? String(errors.name) : undefined}
                required
                autoComplete="name"
              />
              
              <FormField
                label="Username"
                name="username"
                type="text"
                value={values.username}
                onChange={handleChange}
                error={errors?.username ? String(errors.username) : undefined}
                required
                autoComplete="username"
              />
              
              <FormField
                label="Email address"
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
                autoComplete="new-password"
              />
              
              <FormField
                label="Confirm password"
                name="confirmPassword"
                type="password"
                value={values.confirmPassword}
                onChange={handleChange}
                error={errors?.confirmPassword ? String(errors.confirmPassword) : undefined}
                required
                autoComplete="new-password"
              />
              {/* <div className="text-sm text-gray-600">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </div> */}
            </>
          )}
        </Form>
      </div>
    </div>
  );
};

export default RegisterForm;
