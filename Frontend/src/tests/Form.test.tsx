import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Form, FormField } from '../components/ui/Form';
import { z } from 'zod';

// Define a simple schema for testing
const testSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  age: z.number().min(18, 'You must be at least 18 years old'),
});

// Mock submit handler
const mockSubmit = jest.fn();

describe('Form Component', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
  });

  test('renders form fields correctly', () => {
    render(
      <Form
        initialValues={{ name: '', email: '', age: '' }}
        validationSchema={testSchema}
        onSubmit={mockSubmit}
        submitButtonText="Submit"
      >
        {({ values, errors, handleChange, FormField }) => (
          <>
            <FormField
              label="Name"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <FormField
              label="Age"
              name="age"
              type="number"
              value={values.age}
              onChange={handleChange}
              error={errors.age}
              required
            />
          </>
        )}
      </Form>
    );

    // Check if form fields are rendered
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Age/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  test('displays validation errors on submit', async () => {
    render(
      <Form
        initialValues={{ name: '', email: '', age: '' }}
        validationSchema={testSchema}
        onSubmit={mockSubmit}
        submitButtonText="Submit"
      >
        {({ values, errors, handleChange, FormField }) => (
          <>
            <FormField
              label="Name"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <FormField
              label="Age"
              name="age"
              type="number"
              value={values.age}
              onChange={handleChange}
              error={errors.age}
              required
            />
          </>
        )}
      </Form>
    );

    // Submit the form without filling in any fields
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    // Check that validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });

    // Verify that onSubmit was not called
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    render(
      <Form
        initialValues={{ name: '', email: '', age: '' }}
        validationSchema={testSchema}
        onSubmit={mockSubmit}
        submitButtonText="Submit"
      >
        {({ values, errors, handleChange, FormField }) => (
          <>
            <FormField
              label="Name"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <FormField
              label="Age"
              name="age"
              type="number"
              value={values.age}
              onChange={handleChange}
              error={errors.age}
              required
            />
          </>
        )}
      </Form>
    );

    // Fill in the form with valid data
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const ageInput = screen.getByLabelText(/Age/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(ageInput, { target: { value: '25' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    // Verify that onSubmit was called with the correct values
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      });
    });
  });

  test('shows loading state when isSubmitting is true', () => {
    render(
      <Form
        initialValues={{ name: '', email: '', age: '' }}
        validationSchema={testSchema}
        onSubmit={mockSubmit}
        submitButtonText="Submit"
        isSubmitting={true}
      >
        {({ values, errors, handleChange, FormField }) => (
          <>
            <FormField
              label="Name"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
          </>
        )}
      </Form>
    );

    const submitButton = screen.getByRole('button', { name: /Submitting/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Submitting...');
  });
});
