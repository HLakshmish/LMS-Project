import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import apiService from '../services/api';
const { courses: coursesAPI, subjects: subjectsAPI, chapters: chaptersAPI, topics: topicsAPI } = apiService;

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail?: string;
  created_by: number;
  created_at: string;
}

interface Subject {
  id: number;
  name: string;
  description: string;
  course_id: number;
  created_by: number;
  created_at: string;
}

interface Chapter {
  id: number;
  name: string;
  description: string;
  subject_id: number;
  created_by: number;
  created_at: string;
}

interface Topic {
  id: number;
  name: string;
  description: string;
  chapter_id: number;
  created_by: number;
  created_at: string;
}

interface CourseContextType {
  courses: Course[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  selectedCourse: Course | null;
  selectedSubject: Subject | null;
  selectedChapter: Chapter | null;
  selectedTopic: Topic | null;
  isLoading: boolean;
  error: string | null;
  fetchCourses: () => Promise<void>;
  fetchUserCourses: () => Promise<void>;
  fetchAvailableCourses: () => Promise<void>;
  fetchSubjectsByCourse: (courseId: number) => Promise<void>;
  fetchChaptersBySubject: (subjectId: number) => Promise<void>;
  fetchTopicsByChapter: (chapterId: number) => Promise<void>;
  selectCourse: (course: Course) => void;
  selectSubject: (subject: Subject) => void;
  selectChapter: (chapter: Chapter) => void;
  selectTopic: (topic: Topic) => void;
  createCourse: (courseData: any) => Promise<Course>;
  updateCourse: (courseId: number, courseData: any) => Promise<Course>;
  deleteCourse: (courseId: number) => Promise<void>;
  createSubject: (subjectData: any) => Promise<Subject>;
  updateSubject: (subjectId: number, subjectData: any) => Promise<Subject>;
  deleteSubject: (subjectId: number) => Promise<void>;
  createChapter: (chapterData: any) => Promise<Chapter>;
  updateChapter: (chapterId: number, chapterData: any) => Promise<Chapter>;
  deleteChapter: (chapterId: number) => Promise<void>;
  createTopic: (topicData: any) => Promise<Topic>;
  updateTopic: (topicId: number, topicData: any) => Promise<Topic>;
  deleteTopic: (topicId: number) => Promise<void>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

interface CourseProviderProps {
  children: ReactNode;
}

export const CourseProvider: React.FC<CourseProviderProps> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Replace API call with mock data - combination of enrolled and available courses
      const mockAllCourses: Course[] = [
        {
          id: 1,
          title: 'Introduction to Mathematics',
          description: 'A comprehensive introduction to basic mathematical concepts and principles.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Mathematics',
          created_by: 1,
          created_at: '2023-01-15T08:30:00Z'
        },
        {
          id: 2,
          title: 'Advanced Physics',
          description: 'Explore complex physical phenomena and theories in this advanced course.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Physics',
          created_by: 2,
          created_at: '2023-02-20T10:15:00Z'
        },
        {
          id: 3,
          title: 'Web Development Fundamentals',
          description: 'Learn the basics of web development, including HTML, CSS, and JavaScript.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Web+Dev',
          created_by: 3,
          created_at: '2023-03-10T14:45:00Z'
        },
        {
          id: 4,
          title: 'Introduction to Biology',
          description: 'Study the fascinating world of living organisms and biological systems.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Biology',
          created_by: 1,
          created_at: '2023-04-05T09:20:00Z'
        },
        {
          id: 5,
          title: 'Introduction to Chemistry',
          description: 'Explore the fundamental principles of chemistry and chemical reactions.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Chemistry',
          created_by: 2,
          created_at: '2023-01-10T11:30:00Z'
        },
        {
          id: 6,
          title: 'Data Science Essentials',
          description: 'Learn the core concepts and tools used in data science and analytics.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Data+Science',
          created_by: 3,
          created_at: '2023-02-15T13:45:00Z'
        },
        {
          id: 7,
          title: 'English Literature',
          description: 'A survey of classic and contemporary English literature and literary analysis.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Literature',
          created_by: 4,
          created_at: '2023-03-05T09:15:00Z'
        },
        {
          id: 8,
          title: 'Mobile App Development',
          description: 'Build cross-platform mobile applications using modern frameworks and tools.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Mobile+Dev',
          created_by: 2,
          created_at: '2023-04-20T15:30:00Z'
        },
        {
          id: 9,
          title: 'Artificial Intelligence',
          description: 'Introduction to AI concepts, machine learning algorithms, and neural networks.',
          thumbnail: 'https://via.placeholder.com/400x200?text=AI',
          created_by: 5,
          created_at: '2023-05-12T10:00:00Z'
        }
      ];
      
      // Set mock courses
      setCourses(mockAllCourses);
      
    } catch (error: any) {
      setError('Failed to fetch courses');
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Replace API call with mock data
      const mockCourses: Course[] = [
        {
          id: 1,
          title: 'Introduction to Mathematics',
          description: 'A comprehensive introduction to basic mathematical concepts and principles.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Mathematics',
          created_by: 1,
          created_at: '2023-01-15T08:30:00Z'
        },
        {
          id: 2,
          title: 'Advanced Physics',
          description: 'Explore complex physical phenomena and theories in this advanced course.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Physics',
          created_by: 2,
          created_at: '2023-02-20T10:15:00Z'
        },
        {
          id: 3,
          title: 'Web Development Fundamentals',
          description: 'Learn the basics of web development, including HTML, CSS, and JavaScript.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Web+Dev',
          created_by: 3,
          created_at: '2023-03-10T14:45:00Z'
        },
        {
          id: 4,
          title: 'Introduction to Biology',
          description: 'Study the fascinating world of living organisms and biological systems.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Biology',
          created_by: 1,
          created_at: '2023-04-05T09:20:00Z'
        }
      ];
      
      // Set mock courses
      setCourses(mockCourses);
      
    } catch (error: any) {
      setError('Failed to fetch user courses');
      console.error('Error fetching user courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Replace API call with mock data
      const mockAvailableCourses: Course[] = [
        {
          id: 5,
          title: 'Introduction to Chemistry',
          description: 'Explore the fundamental principles of chemistry and chemical reactions.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Chemistry',
          created_by: 2,
          created_at: '2023-01-10T11:30:00Z'
        },
        {
          id: 6,
          title: 'Data Science Essentials',
          description: 'Learn the core concepts and tools used in data science and analytics.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Data+Science',
          created_by: 3,
          created_at: '2023-02-15T13:45:00Z'
        },
        {
          id: 7,
          title: 'English Literature',
          description: 'A survey of classic and contemporary English literature and literary analysis.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Literature',
          created_by: 4,
          created_at: '2023-03-05T09:15:00Z'
        },
        {
          id: 8,
          title: 'Mobile App Development',
          description: 'Build cross-platform mobile applications using modern frameworks and tools.',
          thumbnail: 'https://via.placeholder.com/400x200?text=Mobile+Dev',
          created_by: 2,
          created_at: '2023-04-20T15:30:00Z'
        },
        {
          id: 9,
          title: 'Artificial Intelligence',
          description: 'Introduction to AI concepts, machine learning algorithms, and neural networks.',
          thumbnail: 'https://via.placeholder.com/400x200?text=AI',
          created_by: 5,
          created_at: '2023-05-12T10:00:00Z'
        }
      ];
      
      // Set mock available courses
      setCourses(mockAvailableCourses);
      
    } catch (error: any) {
      setError('Failed to fetch available courses');
      console.error('Error fetching available courses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSubjectsByCourse = useCallback(async (courseId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await subjectsAPI.getByCourseid(courseId);
      setSubjects(data as Subject[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch subjects');
      console.error('Error fetching subjects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchChaptersBySubject = useCallback(async (subjectId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await chaptersAPI.getBySubjectId(subjectId);
      setChapters(data as Chapter[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch chapters');
      console.error('Error fetching chapters:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTopicsByChapter = useCallback(async (chapterId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await topicsAPI.getByChapterId(chapterId);
      setTopics(data as Topic[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch topics');
      console.error('Error fetching topics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedTopic(null);
    fetchSubjectsByCourse(course.id);
  };

  const selectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setSelectedTopic(null);
    fetchChaptersBySubject(subject.id);
  };

  const selectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setSelectedTopic(null);
    fetchTopicsByChapter(chapter.id);
  };

  const selectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  const createCourse = async (courseData: any): Promise<Course> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await coursesAPI.create(courseData);
      setCourses([...courses, data]);
      return data;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create course');
      console.error('Error creating course:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourse = async (courseId: number, courseData: any): Promise<Course> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await coursesAPI.update(courseId, courseData);
      setCourses(courses.map(course => course.id === courseId ? data : course));
      if (selectedCourse && selectedCourse.id === courseId) {
        setSelectedCourse(data);
      }
      return data;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update course');
      console.error('Error updating course:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (courseId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await coursesAPI.delete(courseId);
      setCourses(courses.filter(course => course.id !== courseId));
      if (selectedCourse && selectedCourse.id === courseId) {
        setSelectedCourse(null);
        setSubjects([]);
        setChapters([]);
        setTopics([]);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete course');
      console.error('Error deleting course:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createSubject = async (subjectData: any): Promise<Subject> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await subjectsAPI.create(subjectData);
      setSubjects([...subjects, data]);
      return data;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create subject');
      console.error('Error creating subject:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubject = async (subjectId: number, subjectData: any): Promise<Subject> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await subjectsAPI.update(subjectId, subjectData);
      setSubjects(subjects.map(subject => subject.id === subjectId ? data : subject));
      if (selectedSubject && selectedSubject.id === subjectId) {
        setSelectedSubject(data);
      }
      return data;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update subject');
      console.error('Error updating subject:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSubject = async (subjectId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await subjectsAPI.delete(subjectId);
      setSubjects(subjects.filter(subject => subject.id !== subjectId));
      if (selectedSubject && selectedSubject.id === subjectId) {
        setSelectedSubject(null);
        setChapters([]);
        setTopics([]);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete subject');
      console.error('Error deleting subject:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createChapter = async (chapterData: any): Promise<Chapter> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await chaptersAPI.create(chapterData);
      setChapters([...chapters, data]);
      return data;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create chapter');
      console.error('Error creating chapter:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateChapter = async (chapterId: number, chapterData: any): Promise<Chapter> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await chaptersAPI.update(chapterId, chapterData);
      setChapters(chapters.map(chapter => chapter.id === chapterId ? data : chapter));
      if (selectedChapter && selectedChapter.id === chapterId) {
        setSelectedChapter(data);
      }
      return data;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update chapter');
      console.error('Error updating chapter:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChapter = async (chapterId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await chaptersAPI.delete(chapterId);
      setChapters(chapters.filter(chapter => chapter.id !== chapterId));
      if (selectedChapter && selectedChapter.id === chapterId) {
        setSelectedChapter(null);
        setTopics([]);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete chapter');
      console.error('Error deleting chapter:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createTopic = async (topicData: any): Promise<Topic> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await topicsAPI.create(topicData);
      setTopics([...topics, data]);
      return data;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create topic');
      console.error('Error creating topic:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTopic = async (topicId: number, topicData: any): Promise<Topic> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await topicsAPI.update(topicId, topicData);
      setTopics(topics.map(topic => topic.id === topicId ? data : topic));
      if (selectedTopic && selectedTopic.id === topicId) {
        setSelectedTopic(data);
      }
      return data;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update topic');
      console.error('Error updating topic:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTopic = async (topicId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await topicsAPI.delete(topicId);
      setTopics(topics.filter(topic => topic.id !== topicId));
      if (selectedTopic && selectedTopic.id === topicId) {
        setSelectedTopic(null);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete topic');
      console.error('Error deleting topic:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    courses,
    subjects,
    chapters,
    topics,
    selectedCourse,
    selectedSubject,
    selectedChapter,
    selectedTopic,
    isLoading,
    error,
    fetchCourses,
    fetchUserCourses,
    fetchAvailableCourses,
    fetchSubjectsByCourse,
    fetchChaptersBySubject,
    fetchTopicsByChapter,
    selectCourse,
    selectSubject,
    selectChapter,
    selectTopic,
    createCourse,
    updateCourse,
    deleteCourse,
    createSubject,
    updateSubject,
    deleteSubject,
    createChapter,
    updateChapter,
    deleteChapter,
    createTopic,
    updateTopic,
    deleteTopic,
  };

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
};

export const useCourse = (): CourseContextType => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};
