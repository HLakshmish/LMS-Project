import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

// Mock the onLogin function
const mockOnLogin = jest.fn();

// Test suite for LoginForm component
describe('LoginForm Component', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockOnLogin.mockReset();
  });

  test('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <LoginForm onLogin={mockOnLogin} isLoading={false} error={null} />
      </BrowserRouter>
    );

    // Check if important elements are rendered
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/create a new account/i)).toBeInTheDocument();
    expect(screen.getByText(/Forgot your password/i)).toBeInTheDocument();
  });

  test('displays error message when provided', () => {
    const errorMessage = 'Invalid credentials';
    render(
      <BrowserRouter>
        <LoginForm onLogin={mockOnLogin} isLoading={false} error={errorMessage} />
      </BrowserRouter>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('shows loading state when isLoading is true', () => {
    render(
      <BrowserRouter>
        <LoginForm onLogin={mockOnLogin} isLoading={true} error={null} />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /Sign in/i });
    expect(submitButton).toBeDisabled();
  });

  test('validates form inputs before submission', async () => {
    render(
      <BrowserRouter>
        <LoginForm onLogin={mockOnLogin} isLoading={false} error={null} />
      </BrowserRouter>
    );

    // Try to submit the form without filling in the fields
    const submitButton = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(submitButton);

    // Check that validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });

    // Verify that onLogin was not called
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  test('calls onLogin with correct values when form is valid', async () => {
    render(
      <BrowserRouter>
        <LoginForm onLogin={mockOnLogin} isLoading={false} error={null} />
      </BrowserRouter>
    );

    // Fill in the form fields
    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(submitButton);

    // Verify that onLogin was called with the correct values
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
