import axios from 'axios';

// Create an axios instance with optimized configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for adding auth token and handling requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage - this will be refreshed on each request
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the headers with the correct format
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Response interceptor for caching and error handling
api.interceptors.response.use(
  (response) => {
    // Cache successful GET requests
    if (response.config.method?.toLowerCase() === 'get') {
      const cacheKey = `api_cache_${response.config.url}_${JSON.stringify(response.config.params || {})}`;
      const cacheData = {
        data: response.data,
        timestamp: Date.now(),
        expires: Date.now() + 5 * 60 * 1000 // Cache for 5 minutes
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token refresh for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/refresh-token`,
            { refreshToken }
          );
          
          // If successful, update tokens and retry the original request
          if (response.data.accessToken) {
            localStorage.setItem('token', response.data.accessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

interface CacheResponse<T> {
  data: T;
  fromCache: boolean;
}

interface Params {
  [key: string]: string | number | boolean | undefined;
}

// Function to check cache before making a GET request
const getCached = async <T>(url: string, params: Params = {}, forceRefresh = false): Promise<CacheResponse<T>> => {
  const cacheKey = `api_cache_${url}_${JSON.stringify(params)}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  if (!forceRefresh && cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      // Check if cache is still valid
      if (parsed.expires > Date.now()) {
        return { data: parsed.data, fromCache: true };
      }
    } catch (e) {
      // Invalid cache, continue with API call
      localStorage.removeItem(cacheKey);
    }
  }
  
  // Make the actual API call
  const response = await api.get<T>(url, { params });
  return { data: response.data, fromCache: false };
};

interface UserData {
  email: string;
  password: string;
  [key: string]: any;
}

interface CourseData {
  title: string;
  description: string;
  [key: string]: any;
}

interface SubjectData {
  name: string;
  description: string;
  course_id: number;
  [key: string]: any;
}

interface ChapterData {
  name: string;
  description: string;
  subject_id: number;
  [key: string]: any;
}

interface TopicData {
  name: string;
  description: string;
  chapter_id: number;
  [key: string]: any;
}

interface QuestionData {
  question: string;
  options: string[];
  correct_answer: string;
  [key: string]: any;
}

interface ExamData {
  title: string;
  description: string;
  subject_id: number;
  [key: string]: any;
}

interface StudentExamData {
  exam_id: number;
  [key: string]: any;
}

interface AnswerData {
  question_id: number;
  answer: string;
  [key: string]: any;
}

interface SubscriptionData {
  name: string;
  description: string;
  price: number;
  [key: string]: any;
}

interface UserSubscriptionData {
  subscription_id: number;
  [key: string]: any;
}

interface ContentData {
  title: string;
  content: string;
  topic_id: number;
  [key: string]: any;
}

// Optimized API service with methods for common operations
const apiService = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) => api.post('/api/auth/login', 
      { email, password },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ),
    // Alternative login using token endpoint with form data
    loginWithToken: (email: string, password: string) => api.post('/api/auth/token', 
      new URLSearchParams({
        username: email,
        password: password
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    ),
    checkUserExists: (name: string, username: string, email: string) => 
      api.post('/api/auth/check-user-exists', { name, username, email }),
    register: (userData: UserData) => api.post('/api/auth/register', userData),
    refreshToken: (refreshToken: string) => api.post('/api/auth/refresh-token', { refreshToken }),
    forgotPassword: (email: string) => api.post('/api/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) => api.post('/api/auth/reset-password', { token, password }),
    getCurrentUser: () => api.get('/api/auth/me')
  },
  
  // User endpoints
  users: {
    getAll: (params: Params) => getCached('/api/users', params),
    getById: (id: number) => getCached(`/api/users/${id}`),
    update: (id: number, userData: UserData) => api.put(`/api/users/${id}`, userData),
    delete: (id: number) => api.delete(`/api/users/${id}`)
  },
  
  // Course endpoints
  courses: {
    getAll: (params: Params) => getCached('/api/courses', params),
    getById: (id: number) => getCached(`/api/courses/${id}`),
    create: (courseData: CourseData) => api.post('/api/courses', courseData),
    update: (id: number, courseData: CourseData) => api.put(`/api/courses/${id}`, courseData),
    delete: (id: number) => api.delete(`/api/courses/${id}`)
  },
  
  // Subject endpoints
  subjects: {
    getAll: (params: Params) => getCached('/api/subjects', params),
    getById: (id: number) => getCached(`/api/subjects/${id}`),
    getByCourseid: (courseId: number) => getCached(`/api/courses/${courseId}/subjects`),
    create: (subjectData: SubjectData) => api.post('/api/subjects', subjectData),
    update: (id: number, subjectData: SubjectData) => api.put(`/api/subjects/${id}`, subjectData),
    delete: (id: number) => api.delete(`/api/subjects/${id}`)
  },
  
  // Chapter endpoints
  chapters: {
    getAll: (params: Params) => getCached('/api/chapters', params),
    getById: (id: number) => getCached(`/api/chapters/${id}`),
    getBySubjectId: (subjectId: number) => getCached(`/api/subjects/${subjectId}/chapters`),
    create: (chapterData: ChapterData) => api.post('/api/chapters', chapterData),
    update: (id: number, chapterData: ChapterData) => api.put(`/api/chapters/${id}`, chapterData),
    delete: (id: number) => api.delete(`/api/chapters/${id}`)
  },
  
  // Topic endpoints
  topics: {
    getAll: (params: Params) => getCached('/api/topics', params),
    getById: (id: number) => getCached(`/api/topics/${id}`),
    getByChapterId: (chapterId: number) => getCached(`/api/chapters/${chapterId}/topics`),
    create: (topicData: TopicData) => api.post('/api/topics', topicData),
    update: (id: number, topicData: TopicData) => api.put(`/api/topics/${id}`, topicData),
    delete: (id: number) => api.delete(`/api/topics/${id}`)
  },
  
  // Question endpoints
  questions: {
    getAll: (params: Params) => getCached('/api/questions', params),
    getById: (id: number) => getCached(`/api/questions/${id}`),
    getBySubjectId: (subjectId: number) => getCached(`/api/subjects/${subjectId}/questions`),
    create: (questionData: QuestionData) => api.post('/api/questions', questionData),
    update: (id: number, questionData: QuestionData) => api.put(`/api/questions/${id}`, questionData),
    delete: (id: number) => api.delete(`/api/questions/${id}`)
  },
  
  // Exam endpoints
  exams: {
    getAll: (params: Params) => getCached('/api/exams', params),
    getById: (id: number) => getCached(`/api/exams/${id}`),
    getBySubjectId: (subjectId: number) => getCached(`/api/subjects/${subjectId}/exams`),
    create: (examData: ExamData) => api.post('/api/exams', examData),
    update: (id: number, examData: ExamData) => api.put(`/api/exams/${id}`, examData),
    delete: (id: number) => api.delete(`/api/exams/${id}`),
    getQuestions: (examId: number) => getCached(`/api/exams/${examId}/questions`),
    addQuestion: (examId: number, questionData: QuestionData) => api.post(`/api/exams/${examId}/questions`, questionData)
  },
  
  // Student exam endpoints
  studentExams: {
    getAll: (params: Params) => getCached('/api/student-exams', params),
    getById: (id: number) => getCached(`/api/student-exams/${id}`),
    create: (studentExamData: StudentExamData) => api.post('/api/student-exams', studentExamData),
    start: (id: number) => api.post(`/api/student-exams/${id}/start`),
    complete: (id: number) => api.post(`/api/student-exams/${id}/complete`),
    submitAnswer: (id: number, answerData: AnswerData) => api.post(`/api/student-exams/${id}/answers`, answerData)
  },
  
  // Subscription endpoints
  subscriptions: {
    getAll: (params: Params) => getCached('/api/subscriptions', params),
    getById: (id: number) => getCached(`/api/subscriptions/${id}`),
    create: (subscriptionData: SubscriptionData) => api.post('/api/subscriptions', subscriptionData),
    update: (id: number, subscriptionData: SubscriptionData) => api.put(`/api/subscriptions/${id}`, subscriptionData),
    delete: (id: number) => api.delete(`/api/subscriptions/${id}`)
  },
  
  // User subscription endpoints
  userSubscriptions: {
    getAll: (params: Params) => getCached('/api/user-subscriptions', params),
    getById: (id: number) => getCached(`/api/user-subscriptions/${id}`),
    getByUserId: (userId: number) => getCached(`/api/users/${userId}/subscriptions`),
    create: (userSubscriptionData: UserSubscriptionData) => api.post('/api/user-subscriptions', userSubscriptionData),
    cancel: (id: number) => api.post(`/api/user-subscriptions/${id}/cancel`)
  },
  
  // Content endpoints
  content: {
    getAll: (params: Params) => getCached('/api/content', params),
    getById: (id: number) => getCached(`/api/content/${id}`),
    getByTopicId: (topicId: number) => getCached(`/api/topics/${topicId}/content`),
    create: (contentData: ContentData) => api.post('/api/content', contentData),
    update: (id: number, contentData: ContentData) => api.put(`/api/content/${id}`, contentData),
    delete: (id: number) => api.delete(`/api/content/${id}`)
  }
};

export default apiService;
