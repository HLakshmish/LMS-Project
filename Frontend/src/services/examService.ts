import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Exam {
  id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: {
    username: string;
    email: string;
    id: number;
    role: string;
  };
}

export interface StudentExam {
  student_id: number;
  exam_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  id: number;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string | null;
  student?: any;
  exam?: any;
}

export type ExamStatus = 'not_started' | 'in_progress' | 'completed' | 'upcoming' | 'available' | 'expired';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  };
};

export const getUpcomingExams = async (): Promise<Exam[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/exams/exams/`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to view exams');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch upcoming exams');
    }
    throw error;
  }
};

/**
 * Calculate maximum marks based on total questions
 * @param totalQuestions Number of questions in the exam
 * @param marksPerQuestion Marks assigned per question (default: 1)
 * @returns The calculated maximum marks
 */
export const calculateMaxMarks = (totalQuestions: number, marksPerQuestion: number = 1): number => {
  return totalQuestions * marksPerQuestion;
};

/**
 * Format time remaining for an exam
 * @param seconds Time remaining in seconds
 * @returns Formatted time string (mm:ss)
 */
export const formatTimeRemaining = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Determine the status of an exam based on its start and end times, and current status
 * @param exam The exam object containing start_datetime, end_datetime
 * @param status The current status of the exam (if available)
 * @returns A string representing the exam status
 */
export const determineExamStatus = (
  exam: { start_datetime: string; end_datetime?: string | null; duration_minutes: number },
  status?: 'not_started' | 'in_progress' | 'completed'
): ExamStatus => {
  const now = new Date();
  const startTime = new Date(exam.start_datetime);
  
  // If exam is already marked as completed, return that status
  if (status === 'completed') {
    return 'completed';
  }
  
  // Calculate end time if not provided
  const endTime = exam.end_datetime 
    ? new Date(exam.end_datetime)
    : new Date(startTime.getTime() + (exam.duration_minutes * 60 * 1000));
    
  // If the exam is in progress according to the backend, keep that status
  if (status === 'in_progress') {
    return 'in_progress';
  }
  
  // Determine status based on time
  if (now < startTime) {
    return 'upcoming';
  } else if (now >= startTime && now <= endTime) {
    return status === 'not_started' ? 'available' : 'in_progress';
  } else {
    return 'expired';
  }
};

/**
 * Calculate and update exam result max marks based on settings
 * @param result The exam result object from API
 * @returns Updated exam result with potentially recalculated max_marks
 */
export const processExamResult = (result: any) => {
  try {
    // Get global settings
    const savedSettings = localStorage.getItem('exam_settings');
    let settings = {
      auto_calculate_marks: true,
      marks_per_question: 1
    };
    
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      settings = {
        auto_calculate_marks: parsedSettings.auto_calculate_marks ?? true,
        marks_per_question: parsedSettings.marks_per_question ?? 1
      };
    }

    // If auto calculation is enabled and we have total_questions, recalculate max_marks
    if (settings.auto_calculate_marks && result && result.total_questions) {
      const calculatedMaxMarks = calculateMaxMarks(result.total_questions, settings.marks_per_question);
      
      // Calculate the obtained marks proportionally
      const ratio = result.max_marks > 0 ? result.obtained_marks / result.max_marks : 0;
      const calculatedObtainedMarks = Math.round(calculatedMaxMarks * ratio * 100) / 100;
      
      return {
        ...result,
        max_marks: calculatedMaxMarks,
        obtained_marks: calculatedObtainedMarks
      };
    }
    
    return result;
  } catch (err) {
    console.error('Error processing exam result:', err);
    return result;
  }
}; 