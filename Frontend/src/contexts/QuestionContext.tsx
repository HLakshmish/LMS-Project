import React, { createContext, useContext, useState, ReactNode } from 'react';
import apiService from '../services/api';

interface Question {
  id: number;
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  subject_id: number;
  chapter_id: number | null;
  topic_id: number | null;
  created_by: number;
  created_at: string;
}

interface Answer {
  id: number;
  question_id: number;
  content: string;
  is_correct: boolean;
  created_at: string;
}

interface QuestionContextType {
  questions: Question[];
  answers: Answer[];
  selectedQuestion: Question | null;
  isLoading: boolean;
  error: string | null;
  fetchQuestions: () => Promise<void>;
  fetchQuestionsBySubject: (subjectId: number) => Promise<void>;
  fetchQuestionsByChapter: (chapterId: number) => Promise<void>;
  fetchQuestionsByTopic: (topicId: number) => Promise<void>;
  fetchQuestionsByDifficulty: (difficulty: string) => Promise<void>;
  fetchQuestion: (questionId: number) => Promise<Question>;
  fetchQuestionAnswers: (questionId: number) => Promise<void>;
  selectQuestion: (question: Question) => void;
  createQuestion: (questionData: any) => Promise<Question>;
  createAnswer: (questionId: number, answerData: any) => Promise<Answer>;
  updateQuestion: (questionId: number, questionData: any) => Promise<Question>;
  deleteQuestion: (questionId: number) => Promise<void>;
}

const QuestionContext = createContext<QuestionContextType | undefined>(undefined);

interface QuestionProviderProps {
  children: ReactNode;
}

export const QuestionProvider: React.FC<QuestionProviderProps> = ({ children }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.getAll({});
      setQuestions(data as Question[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch questions');
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestionsBySubject = async (subjectId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.getBySubjectId(subjectId);
      setQuestions(data as Question[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch questions by subject');
      console.error('Error fetching questions by subject:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestionsByChapter = async (chapterId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.getAll({ chapter_id: chapterId });
      setQuestions(data as Question[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch questions by chapter');
      console.error('Error fetching questions by chapter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestionsByTopic = async (topicId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.getAll({ topic_id: topicId });
      setQuestions(data as Question[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch questions by topic');
      console.error('Error fetching questions by topic:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestionsByDifficulty = async (difficulty: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.getAll({ difficulty });
      setQuestions(data as Question[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch questions by difficulty');
      console.error('Error fetching questions by difficulty:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestion = async (questionId: number): Promise<Question> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.getById(questionId);
      const question = data as Question;
      setSelectedQuestion(question);
      return question;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch question');
      console.error('Error fetching question:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestionAnswers = async (questionId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.getAll({ question_id: questionId });
      setAnswers(data as Answer[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch question answers');
      console.error('Error fetching question answers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    fetchQuestionAnswers(question.id);
  };

  const createQuestion = async (questionData: any): Promise<Question> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.create(questionData);
      const newQuestion = data as Question;
      setQuestions([...questions, newQuestion]);
      return newQuestion;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create question');
      console.error('Error creating question:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createAnswer = async (questionId: number, answerData: any): Promise<Answer> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.create({ ...answerData, question_id: questionId });
      const newAnswer = data as Answer;
      setAnswers([...answers, newAnswer]);
      return newAnswer;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create answer');
      console.error('Error creating answer:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuestion = async (questionId: number, questionData: any): Promise<Question> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.questions.update(questionId, questionData);
      const updatedQuestion = data as Question;
      setQuestions(questions.map(question => question.id === questionId ? updatedQuestion : question));
      if (selectedQuestion && selectedQuestion.id === questionId) {
        setSelectedQuestion(updatedQuestion);
      }
      return updatedQuestion;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update question');
      console.error('Error updating question:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuestion = async (questionId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiService.questions.delete(questionId);
      setQuestions(questions.filter(question => question.id !== questionId));
      if (selectedQuestion && selectedQuestion.id === questionId) {
        setSelectedQuestion(null);
        setAnswers([]);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete question');
      console.error('Error deleting question:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    questions,
    answers,
    selectedQuestion,
    isLoading,
    error,
    fetchQuestions,
    fetchQuestionsBySubject,
    fetchQuestionsByChapter,
    fetchQuestionsByTopic,
    fetchQuestionsByDifficulty,
    fetchQuestion,
    fetchQuestionAnswers,
    selectQuestion,
    createQuestion,
    createAnswer,
    updateQuestion,
    deleteQuestion,
  };

  return <QuestionContext.Provider value={value}>{children}</QuestionContext.Provider>;
};

export const useQuestion = (): QuestionContextType => {
  const context = useContext(QuestionContext);
  if (context === undefined) {
    throw new Error('useQuestion must be used within a QuestionProvider');
  }
  return context;
};
