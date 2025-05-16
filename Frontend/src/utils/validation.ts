import { z } from 'zod';

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'teacher']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Course validation schemas
export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  thumbnail: z.string().optional(),
});

export const subjectSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  course_id: z.number().positive('Course ID is required'),
});

export const chapterSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  subject_id: z.number().positive('Subject ID is required'),
});

export const topicSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  chapter_id: z.number().positive('Chapter ID is required'),
});

// Question validation schemas
export const questionSchema = z.object({
  content: z.string().min(5, 'Question content must be at least 5 characters'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  question_type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
  subject_id: z.number().positive('Subject ID is required'),
  chapter_id: z.number().optional(),
  topic_id: z.number().optional(),
});

export const answerSchema = z.object({
  content: z.string().min(1, 'Answer content is required'),
  is_correct: z.boolean(),
  question_id: z.number().positive('Question ID is required'),
});

// Exam validation schemas
export const examSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  duration: z.number().positive('Duration must be a positive number'),
  total_marks: z.number().positive('Total marks must be a positive number'),
  passing_percentage: z.number().min(0, 'Passing percentage must be at least 0').max(100, 'Passing percentage must be at most 100'),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Start date must be a valid date',
  }),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'End date must be a valid date',
  }),
}).refine((data) => new Date(data.start_date) < new Date(data.end_date), {
  message: "End date must be after start date",
  path: ["end_date"],
});

export const examQuestionSchema = z.object({
  exam_id: z.number().positive('Exam ID is required'),
  question_id: z.number().positive('Question ID is required'),
  marks: z.number().positive('Marks must be a positive number'),
  order: z.number().nonnegative('Order must be a non-negative number'),
});

// Subscription validation schemas
export const subscriptionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().nonnegative('Price must be a non-negative number'),
  duration_days: z.number().positive('Duration must be a positive number'),
  features: z.array(z.string()).min(1, 'At least one feature is required'),
  is_active: z.boolean(),
});

export const userSubscriptionSchema = z.object({
  user_id: z.number().positive('User ID is required'),
  subscription_id: z.number().positive('Subscription ID is required'),
});

// Content validation schemas
export const contentItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  content_type: z.enum(['video', 'pdf', 'document', 'image', 'link']),
  url: z.string().url('URL must be a valid URL'),
  subject_id: z.number().positive('Subject ID is required'),
  chapter_id: z.number().optional(),
  topic_id: z.number().optional(),
});

// Helper function to validate data against a schema
export const validateData = <T>(schema: z.ZodType<T>, data: unknown): { success: boolean; data?: T; errors?: z.ZodError } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

// Helper function to extract error messages from Zod validation errors
export const getErrorMessages = (errors?: z.ZodError): Record<string, string> => {
  if (!errors) return {};
  
  const errorMessages: Record<string, string> = {};
  
  errors.errors.forEach((error) => {
    const path = error.path.join('.');
    
    // Ensure we have a string message
    let message: string;
    if (typeof error.message === 'string') {
      message = error.message;
    } else if (error.message && typeof error.message === 'object') {
      // Type assertion to handle custom error object format
      const msgObj = error.message as unknown as { message?: string };
      if (msgObj && 'message' in msgObj) {
        message = String(msgObj.message);
      } else {
        message = 'Invalid input';
      }
    } else {
      message = String(error.message || 'Invalid input');
    }
    
    errorMessages[path] = message;
  });
  
  return errorMessages;
};
