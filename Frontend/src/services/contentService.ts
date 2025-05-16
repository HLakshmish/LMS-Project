import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface User {
  username: string;
  email: string;
  id: number;
  role: string;
  created_at: string;
  updated_at: string | null;
}

export interface Course {
  name: string;
  description: string;
  id: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: User;
}

export interface Subject {
  name: string;
  course_id: number;
  id: number;
  created_at: string;
  updated_at: string | null;
  course: Course;
}

export interface Chapter {
  name: string;
  subject_id: number;
  id: number;
  created_at: string;
  updated_at: string | null;
  subject: Subject;
}

export interface ContentItem {
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'document';
  url: string;
  chapter_id: number;
  subject_id: number;
  id: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: User;
  chapter: Chapter;
  subject: Subject;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  };
};

export const getContentItems = async (): Promise<ContentItem[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/content/content/`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to view content');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch content');
    }
    throw error;
  }
};

export const getContentByChapter = async (chapterId: number): Promise<ContentItem[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/content/content/chapter/${chapterId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to view content');
      }
      if (error.response?.status === 404) {
        throw new Error('Chapter not found');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch chapter content');
    }
    throw error;
  }
};

export const getContentBySubject = async (subjectId: number): Promise<ContentItem[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/content/content/subject/${subjectId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to view content');
      }
      if (error.response?.status === 404) {
        throw new Error('Subject not found');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch subject content');
    }
    throw error;
  }
}; 