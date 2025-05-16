import React, { createContext, useContext, useState, ReactNode } from 'react';
import apiService from '../services/api';

interface Exam {
  id: number;
  title: string;
  description: string;
  duration: number;
  total_marks: number;
  passing_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

interface ExamQuestion {
  id: number;
  exam_id: number;
  question_id: number;
  marks: number;
  order: number;
  question?: any; // Full question object when expanded
}

interface StudentExam {
  id: number;
  student_id: number;
  exam_id: number;
  start_time: string | null;
  end_time: string | null;
  score: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  created_at: string;
  exam?: Exam;
}

interface StudentAnswer {
  id: number;
  student_exam_id: number;
  question_id: number;
  answer_id: number | null;
  text_answer: string | null;
  is_correct: boolean | null;
  marks_obtained: number | null;
  created_at: string;
}

interface ExamContextType {
  exams: Exam[];
  examQuestions: ExamQuestion[];
  studentExams: StudentExam[];
  studentAnswers: StudentAnswer[];
  selectedExam: Exam | null;
  selectedStudentExam: StudentExam | null;
  isLoading: boolean;
  error: string | null;
  fetchExams: () => Promise<void>;
  fetchUserExams: () => Promise<void>;
  fetchExam: (examId: number) => Promise<Exam>;
  fetchExamQuestions: (examId: number) => Promise<void>;
  fetchStudentExams: () => Promise<void>;
  fetchStudentExamsByExam: (examId: number) => Promise<void>;
  fetchStudentExam: (studentExamId: number) => Promise<StudentExam>;
  fetchStudentExamAnswers: (studentExamId: number) => Promise<void>;
  selectExam: (exam: Exam) => void;
  selectStudentExam: (studentExam: StudentExam) => void;
  createExam: (examData: any) => Promise<Exam>;
  updateExam: (examId: number, examData: any) => Promise<Exam>;
  deleteExam: (examId: number) => Promise<void>;
  addQuestionToExam: (examId: number, questionData: any) => Promise<ExamQuestion>;
  startStudentExam: (studentExamId: number) => Promise<StudentExam>;
  completeStudentExam: (studentExamId: number) => Promise<StudentExam>;
  submitStudentAnswer: (studentExamId: number, answerData: any) => Promise<StudentAnswer>;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

interface ExamProviderProps {
  children: ReactNode;
}

export const ExamProvider: React.FC<ExamProviderProps> = ({ children }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [studentExams, setStudentExams] = useState<StudentExam[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedStudentExam, setSelectedStudentExam] = useState<StudentExam | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.exams.getAll({});
      setExams(data as Exam[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch exams');
      console.error('Error fetching exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserExams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.exams.getAll({ user: true });
      setExams(data as Exam[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch user exams');
      console.error('Error fetching user exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExam = async (examId: number): Promise<Exam> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.exams.getById(examId);
      const exam = data as Exam;
      setSelectedExam(exam);
      return exam;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch exam');
      console.error('Error fetching exam:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExamQuestions = async (examId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.exams.getQuestions(examId);
      setExamQuestions(data as ExamQuestion[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch exam questions');
      console.error('Error fetching exam questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentExams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.studentExams.getAll({});
      setStudentExams(data as StudentExam[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch student exams');
      console.error('Error fetching student exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentExamsByExam = async (examId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.studentExams.getAll({ exam_id: examId });
      setStudentExams(data as StudentExam[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch student exams by exam');
      console.error('Error fetching student exams by exam:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentExam = async (studentExamId: number): Promise<StudentExam> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.studentExams.getById(studentExamId);
      const studentExam = data as StudentExam;
      setSelectedStudentExam(studentExam);
      return studentExam;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch student exam');
      console.error('Error fetching student exam:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentExamAnswers = async (studentExamId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.studentExams.getAll({ student_exam_id: studentExamId });
      setStudentAnswers(data as StudentAnswer[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch student exam answers');
      console.error('Error fetching student exam answers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectExam = (exam: Exam) => {
    setSelectedExam(exam);
    fetchExamQuestions(exam.id);
  };

  const selectStudentExam = (studentExam: StudentExam) => {
    setSelectedStudentExam(studentExam);
    fetchStudentExamAnswers(studentExam.id);
  };

  const createExam = async (examData: any): Promise<Exam> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.exams.create(examData);
      const newExam = data as Exam;
      setExams([...exams, newExam]);
      return newExam;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create exam');
      console.error('Error creating exam:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateExam = async (examId: number, examData: any): Promise<Exam> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.exams.update(examId, examData);
      const updatedExam = data as Exam;
      setExams(exams.map(exam => exam.id === examId ? updatedExam : exam));
      if (selectedExam && selectedExam.id === examId) {
        setSelectedExam(updatedExam);
      }
      return updatedExam;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update exam');
      console.error('Error updating exam:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExam = async (examId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiService.exams.delete(examId);
      setExams(exams.filter(exam => exam.id !== examId));
      if (selectedExam && selectedExam.id === examId) {
        setSelectedExam(null);
        setExamQuestions([]);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete exam');
      console.error('Error deleting exam:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestionToExam = async (examId: number, questionData: any): Promise<ExamQuestion> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.exams.addQuestion(examId, questionData);
      const newQuestion = data as ExamQuestion;
      setExamQuestions([...examQuestions, newQuestion]);
      return newQuestion;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to add question to exam');
      console.error('Error adding question to exam:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const startStudentExam = async (studentExamId: number): Promise<StudentExam> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.studentExams.start(studentExamId);
      const updatedStudentExam = data as StudentExam;
      setStudentExams(studentExams.map(se => se.id === studentExamId ? updatedStudentExam : se));
      if (selectedStudentExam && selectedStudentExam.id === studentExamId) {
        setSelectedStudentExam(updatedStudentExam);
      }
      return updatedStudentExam;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to start exam');
      console.error('Error starting exam:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const completeStudentExam = async (studentExamId: number): Promise<StudentExam> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.studentExams.complete(studentExamId);
      const updatedStudentExam = data as StudentExam;
      setStudentExams(studentExams.map(se => se.id === studentExamId ? updatedStudentExam : se));
      if (selectedStudentExam && selectedStudentExam.id === studentExamId) {
        setSelectedStudentExam(updatedStudentExam);
      }
      return updatedStudentExam;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to complete exam');
      console.error('Error completing exam:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStudentAnswer = async (studentExamId: number, answerData: any): Promise<StudentAnswer> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.studentExams.submitAnswer(studentExamId, answerData);
      const newAnswer = data as StudentAnswer;
      setStudentAnswers([...studentAnswers, newAnswer]);
      return newAnswer;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to submit answer');
      console.error('Error submitting answer:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    exams,
    examQuestions,
    studentExams,
    studentAnswers,
    selectedExam,
    selectedStudentExam,
    isLoading,
    error,
    fetchExams,
    fetchUserExams,
    fetchExam,
    fetchExamQuestions,
    fetchStudentExams,
    fetchStudentExamsByExam,
    fetchStudentExam,
    fetchStudentExamAnswers,
    selectExam,
    selectStudentExam,
    createExam,
    updateExam,
    deleteExam,
    addQuestionToExam,
    startStudentExam,
    completeStudentExam,
    submitStudentAnswer,
  };

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
};

export const useExam = (): ExamContextType => {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
};
