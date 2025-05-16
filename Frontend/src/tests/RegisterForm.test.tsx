import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';

// Mock the onRegister function
const mockOnRegister = jest.fn();

// Test suite for RegisterForm component
describe('RegisterForm Component', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockOnRegister.mockReset();
  });

  test('renders register form correctly', () => {
    render(
      <BrowserRouter>
        <RegisterForm onRegister={mockOnRegister} isLoading={false} error={null} />
      </BrowserRouter>
    );

    // Check if important elements are rendered
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Student/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teacher/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in to your existing account/i)).toBeInTheDocument();
  });

  test('displays error message when provided', () => {
    const errorMessage = 'Registration failed';
    render(
      <BrowserRouter>
        <RegisterForm onRegister={mockOnRegister} isLoading={false} error={errorMessage} />
      </BrowserRouter>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('shows loading state when isLoading is true', () => {
    render(
      <BrowserRouter>
        <RegisterForm onRegister={mockOnRegister} isLoading={true} error={null} />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /Create account/i });
    expect(submitButton).toBeDisabled();
  });

  test('validates form inputs before submission', async () => {
    render(
      <BrowserRouter>
        <RegisterForm onRegister={mockOnRegister} isLoading={false} error={null} />
      </BrowserRouter>
    );

    // Try to submit the form without filling in the fields
    const submitButton = screen.getByRole('button', { name: /Create account/i });
    fireEvent.click(submitButton);

    // Check that validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });

    // Verify that onRegister was not called
    expect(mockOnRegister).not.toHaveBeenCalled();
  });

  test('validates password confirmation', async () => {
    render(
      <BrowserRouter>
        <RegisterForm onRegister={mockOnRegister} isLoading={false} error={null} />
      </BrowserRouter>
    );

    // Fill in the form fields with mismatched passwords
    const nameInput = screen.getByLabelText(/Full name/i);
    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm password/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create account/i });
    fireEvent.click(submitButton);

    // Check that password mismatch error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
    });

    // Verify that onRegister was not called
    expect(mockOnRegister).not.toHaveBeenCalled();
  });

  test('calls onRegister with correct values when form is valid', async () => {
    render(
      <BrowserRouter>
        <RegisterForm onRegister={mockOnRegister} isLoading={false} error={null} />
      </BrowserRouter>
    );

    // Fill in the form fields
    const nameInput = screen.getByLabelText(/Full name/i);
    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm password/i);
    const studentRadio = screen.getByLabelText(/Student/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(studentRadio);

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create account/i });
    fireEvent.click(submitButton);

    // Verify that onRegister was called with the correct values
    await waitFor(() => {
      expect(mockOnRegister).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123', 'student');
    });
  });
});
