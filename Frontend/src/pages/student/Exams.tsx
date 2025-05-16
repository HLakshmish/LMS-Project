import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
import axios from 'axios';
import { DashboardPageProps } from '../../types';
import { hasExamStarted, hasExamEnded } from '../../utils/dateUtils';
// import { determineExamStatus, ExamStatus } from '../../services/examService';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// Updated interfaces based on the correct API response format
interface User {
  username: string;
  email: string;
  id: number;
  role: string;
  created_at: string;
  updated_at: string | null;
}

interface ExamData {
  id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
  max_questions: number;
  creator: Creator;
  created_by?: number;
  created_at?: string;
  updated_at?: string | null;
}

interface StudentExam {
  student_id: number;
  exam_id: number;
  status: 'not_started' | 'in_progress' | 'completed'; // API status values
  id: number;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string | null;
  student: User;
  exam: ExamData;
  score?: number; // This might be added later from another API
  uiStatus?: ExamStatus; // For UI representation
}

interface Creator {
  id: number;
  email: string;
  username: string;
    role: string;
  created_at: string;
  updated_at: string | null;
}

interface StudentAnswer {
  id: number;
  status: string;
  exam_id: number;
  score?: number;
  exam: {
    id: number;
    title: string;
    start_datetime: string;
    end_datetime: string;
    description: string;
    duration_minutes: number;
    max_marks: number;
    max_questions: number;
    creator: Creator;
  };
  student_id: number;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string | null;
}

interface ProcessedExam extends StudentAnswer {
  uiStatus: ExamStatus;
}

type ExamStatusType = 'not_started' | 'in_progress' | 'completed';
type ExamStatus = 'upcoming' | 'in_progress' | 'completed' | 'expired' | 'available' | 'not_started';

const determineExamStatus = (exam: ExamData, status: ExamStatusType): ExamStatus => {
  const now = new Date();
  const startTime = new Date(exam.start_datetime);
  const endTime = exam.end_datetime ? new Date(exam.end_datetime) : 
    new Date(startTime.getTime() + (exam.duration_minutes * 60 * 1000));

  // First check the API status
  if (status === 'completed') {
    return 'completed';
  }

  // Check if exam has started
  if (now >= startTime) {
    // If exam has started and status is not_started, it should be in_progress
    if (status === 'not_started') {
      return 'in_progress';
    }
    // If exam is already in progress
    if (status === 'in_progress') {
      return 'in_progress';
    }
  }

  // If exam hasn't started yet
  if (now < startTime) {
    return 'upcoming';
  }

  // Check if exam has ended
  if (now > endTime) {
    return 'expired';
  }

  return 'available';
};

// Add type for attempts
interface ExamAttempts {
  remaining_attempts: number;
  max_attempts: number;
  exam_id: number;
  student_id: number;
}

const Exams: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'available' | 'upcoming' | 'in_progress' | 'completed'>('available');
  const [studentExams, setStudentExams] = useState<ProcessedExam[]>([]);
  const [availableExams, setAvailableExams] = useState<ExamData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState<number>(0);
  const [limit] = useState<number>(100);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [enrollingExamId, setEnrollingExamId] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [examSubmitted, setExamSubmitted] = useState(location.state?.examSubmitted || false);
  const [submissionMessage, setSubmissionMessage] = useState(location.state?.message || '');
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<number[]>([]);
  const [examAttempts, setExamAttempts] = useState<Record<number, ExamAttempts>>({});

  // Check if exam start time has been reached
  const hasExamStarted = (startDateTime: string): boolean => {
    const startTime = new Date(startDateTime);
    const now = new Date();
    return now >= startTime;
  };

  // Check if exam end time has passed
  const hasExamEnded = (endDateTime: string): boolean => {
    const endTime = new Date(endDateTime);
    const now = new Date();
    return now > endTime;
  };

  // Fetch exams and student exams
    const fetchExams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setIsLoading(false);
          return;
        }
        
      // Fetch all student exams
      const response = await axios.get(`${API_URL}/api/student-exams/my-exams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
        },
        params: {
          skip: skip,
          limit: limit
        }
      });

      console.log('Student exams response data:', response.data);
      const studentExamsData = Array.isArray(response.data) ? response.data : [];
      
      if (studentExamsData.length < limit) {
        setHasMore(false);
      }

      // Process status for filtering and display
      const processedExams: ProcessedExam[] = studentExamsData
        .map((studentExam: StudentExam) => {
        const uiStatus = determineExamStatus(studentExam.exam, studentExam.status);
                  return { 
                    ...studentExam, 
                    uiStatus
                  };
              })
        .sort((a, b) => new Date(b.exam.start_datetime).getTime() - new Date(a.exam.start_datetime).getTime()); // Sort by latest date first
      
      console.log('Processed student exams:', processedExams);
      setStudentExams(processedExams);

      // Refresh attempts for each exam
      for (const studentExam of processedExams) {
        try {
          const attemptsRes = await axios.get(`${API_URL}/api/student-exams/${studentExam.exam.id}/attempts`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json'
            }
          });
          setExamAttempts(prev => ({
            ...prev,
            [studentExam.exam.id]: attemptsRes.data
          }));
        } catch (err) {
          console.error(`Error fetching attempts for exam ${studentExam.exam.id}:`, err);
        }
      }

      return processedExams;
      } catch (err: any) {
        console.error('Error fetching exams:', err);
        if (err.response && err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
        setError('Failed to load exams. Please try again later.');
        }
      return [];
      } finally {
        setIsLoading(false);
      }
    };

  // Fetch active subscription and extract course IDs
  useEffect(() => {
    const fetchActiveSubscription = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const userId = user?.id || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null);
        if (!userId) return;
        const response = await axios.get(`${API_URL}/api/subscriptions/subscriptions/user/${userId}/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        });
        // Extract all course IDs from all packages in the subscription
        const allCourseIds: number[] = [];
        response.data.forEach((sub: any) => {
          const packages = sub.subscription_plan_package?.packages || [];
          packages.forEach((pkg: any) => {
            (pkg.courses || []).forEach((course: any) => {
              if (course.id) allCourseIds.push(course.id);
            });
          });
        });
        setSubscribedCourseIds(allCourseIds);
      } catch (err) {
        console.error('Error fetching active subscription:', err);
      }
    };
    fetchActiveSubscription();
  }, [user]);

  useEffect(() => {
    const fetchAvailableExams = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          return;
        }
        const response = await axios.get(`${API_URL}/api/exams/exams/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        });
        // Only show exams whose course_id is in subscribedCourseIds
        const filtered = Array.isArray(response.data)
          ? response.data.filter((exam: any) =>
              exam.course_id && subscribedCourseIds.includes(exam.course_id)
            )
          : [];
        setAvailableExams(filtered);

        // Fetch attempts for each available exam
        const attemptsResults: Record<number, ExamAttempts> = {};
        await Promise.all(filtered.map(async (exam: any) => {
          try {
            const attemptsRes = await axios.get(`${API_URL}/api/student-exams/${exam.id}/attempts`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'accept': 'application/json'
              }
            });
            attemptsResults[exam.id] = attemptsRes.data;
          } catch (err) {
            // If error, set as undefined or default
            attemptsResults[exam.id] = {
              remaining_attempts: 0,
              max_attempts: 0,
              exam_id: exam.id,
              student_id: user?.id || 0
            };
          }
        }));
        setExamAttempts(attemptsResults);
      } catch (err) {
        console.error('Error fetching available exams:', err);
      }
    };
    if (activeTab === 'available' && subscribedCourseIds.length > 0) {
      fetchAvailableExams();
    } else if (activeTab === 'available' && subscribedCourseIds.length === 0) {
      setAvailableExams([]);
    }
  }, [activeTab, subscribedCourseIds, user]);

  // Handle starting an exam
  const handleStartExam = async (studentExamId: number, examId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      // First call the start exam API
      await axios.put(
          `${API_URL}/api/student-exams/${studentExamId}/start`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      );

      // After successful API call, navigate to the exam taking page
      navigate(`/student/exams/${examId}/take`, {
        state: { studentExamId: studentExamId }
      });

    } catch (err: any) {
      console.error('Error starting exam:', err);
      if (err.response && err.response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to start exam. Please try again later.');
      }
    }
  };

  // Format date for better display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format time for better display
  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: ExamStatus | undefined, score?: number) => {
    if (!status) {
      return (
        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
          Unknown
        </span>
      );
    }
    
    switch (status) {
      case 'upcoming':
      return (
        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
          Upcoming
        </span>
      );
      case 'in_progress':
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
          In Progress
        </span>
      );
      case 'available':
        return (
          <span className="bg-green-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Available
          </span>
        );
      case 'expired':
        return (
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Expired
          </span>
        );
      case 'completed':
      return (
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
          Completed
        </span>
      );
      case 'not_started':
        return (
          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Not Started
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Unknown
          </span>
        );
    }
  };

  // Add retake handler
  const handleRetakeExam = async (examId: number) => {
    try {
      setIsLoading(true);
      setEnrollingExamId(examId); // Set the enrolling exam ID
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsLoading(false);
        setEnrollingExamId(null); // Clear enrolling exam ID
        return;
      }

      // Get user data from localStorage as a fallback
      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : null;

      // Use either props user ID or localStorage user ID
      const studentId = user?.id || userId;

      if (!studentId) {
        setError('Student ID not found. Please log in again.');
        setIsLoading(false);
        setEnrollingExamId(null); // Clear enrolling exam ID
        return;
      }

      // Create a new student exam record for this retake
      const createResponse = await axios.post(
        `${API_URL}/api/student-exams/`,
        {
          student_id: studentId,
          exam_id: examId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      // The API should return the new studentExamId
      const newStudentExamId = createResponse.data.id;
      
      // Start the new exam
      await axios.put(
        `${API_URL}/api/student-exams/${newStudentExamId}/start`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      );

      // Refresh the exams data
      await fetchExams();

      // Navigate to the exam taking page
      navigate(`/student/exams/${examId}/take`, {
        state: { studentExamId: newStudentExamId }
      });
    } catch (err: any) {
      console.error('Error retaking exam:', err);
      let errorMessage = 'Failed to retake exam. Please try again later.';
      
      // Extract more specific error if available
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setEnrollingExamId(null); // Clear enrolling exam ID
    }
  };

  // Add useEffect to fetch exams on load and refresh periodically
  useEffect(() => {
    fetchExams();
    
    // Refresh every 30 seconds to check for exam status changes
    const intervalId = setInterval(fetchExams, 30000);
    
    return () => clearInterval(intervalId);
  }, [skip, limit]);

  const getActionButton = (studentExam: ProcessedExam) => {
    const attempts = examAttempts[studentExam.exam.id];

    // Only show 'Re-take Test' in the In Progress tab if there are remaining attempts
    if (
      activeTab === 'in_progress' &&
      (studentExam.status === 'completed' || studentExam.uiStatus === 'completed') && 
      (attempts && attempts.remaining_attempts > 0) // Must have remaining attempts
    ) {
      return (
        <Button
          onClick={() => handleRetakeExam(studentExam.exam.id)}
          size="sm"
          disabled={isLoading && enrollingExamId === studentExam.exam.id}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2"
        >
          {isLoading && enrollingExamId === studentExam.exam.id ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              <span>Preparing...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
              </svg>
              <span>Re-take Test</span>
            </>
          )}
        </Button>
      );
    }

    // For completed exams with no remaining attempts (or in Completed tab, or when attempts info is missing)
    if (
      (studentExam.status === 'completed' || studentExam.uiStatus === 'completed') && 
      (!attempts || attempts.remaining_attempts === 0 || activeTab === 'completed')
    ) {
        return (
            <Link
                to={`/student/exams/${studentExam.exam.id}/result`}
          state={{ 
            studentExamId: studentExam.id,
            examTitle: studentExam.exam.title,
            // Pre-fetch attempt data to prevent flashing of "No Attempts Available"
            preloadedAttempts: [
              {
                id: studentExam.id,
                attempt_number: 1,
                score_percentage: studentExam.score || 0,
                passed_status: studentExam.status === 'completed',
                obtained_marks: studentExam.score ? (studentExam.exam.max_marks * studentExam.score / 100) : 0,
                max_marks: studentExam.exam.max_marks,
                created_at: studentExam.created_at
              }
            ]
          }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
            >
                View Result
            </Link>
        );
    }
    
    // For exams in progress or available to take
    if (studentExam.uiStatus === 'in_progress' || studentExam.uiStatus === 'available') {
        return (
            <Button 
                onClick={() => handleStartExam(studentExam.id, studentExam.exam.id)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
          <span>{studentExam.status === 'in_progress' ? 'Continue Test' : 'Take Test'}</span>
            </Button>
        );
    }
    
    // For upcoming exams (before start time)
    if (studentExam.uiStatus === 'upcoming') {
        return (
            <Button 
                disabled
                size="sm"
                className="bg-gray-300 text-gray-600 font-medium px-6 py-2 rounded-lg cursor-not-allowed"
            >
                Not Available Yet
            </Button>
        );
    }
    
    // For expired exams
    if (studentExam.uiStatus === 'expired') {
        return (
            <Button 
                disabled
                size="sm"
                className="bg-red-100 text-red-600 font-medium px-6 py-2 rounded-lg cursor-not-allowed"
            >
                Expired
            </Button>
        );
    }
    
    return null;
  };

  const handleViewDetails = (studentExamId: number) => {
    navigate(`/student/exams/${studentExamId}/details`);
  };

  // Update the filteredExams logic
  const filteredExams = studentExams.filter(exam => {
    if (!exam || !exam.exam) return false;

    const now = new Date();
    const startTime = new Date(exam.exam.start_datetime);
    const attempts = examAttempts[exam.exam.id];

    switch (activeTab) {
      case 'upcoming':
        // Only show exams that haven't started yet
        return now < startTime && (exam.uiStatus === 'upcoming' || exam.status === 'not_started');
      case 'in_progress':
        // Show exams that have started and have remaining attempts
        return now >= startTime && attempts && attempts.remaining_attempts > 0;
      case 'completed':
        // Show exams that are completed and have no remaining attempts
        return (exam.uiStatus === 'completed' || (attempts && attempts.remaining_attempts === 0));
      case 'available':
        return exam.uiStatus === 'available';
      default:
    return false;
    }
  });

  useEffect(() => {
    console.log('Current active tab:', activeTab);
    console.log('All student exams:', studentExams);
    console.log('Filtered exams:', filteredExams);
  }, [activeTab, studentExams, filteredExams]);

  const handleEnroll = async (examId: number) => {
    try {
      setEnrollingExamId(examId);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      // Get user data from localStorage as a fallback
      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : null;

      // Use either props user ID or localStorage user ID
      const studentId = user?.id || userId;

      if (!studentId) {
        setError('Student ID not found. Please log in again.');
        return;
      }

      console.log('Enrolling with data:', {
        student_id: studentId,
        exam_id: examId,
        status: 'not_started'
      });

      const response = await axios.post(
        `${API_URL}/api/student-exams/`,
        {
          student_id: studentId,
          exam_id: examId,
         
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Enrollment response:', response.data);

      // Add the newly created student exam to the studentExams state
      const enrolledExam = availableExams.find(exam => exam.id === examId);
      if (enrolledExam) {
        const newStudentExam: ProcessedExam = {
          ...response.data,
          exam: enrolledExam,
          uiStatus: 'upcoming'
        };
        
        // Update studentExams state to include the newly enrolled exam
        setStudentExams(prevExams => [...prevExams, newStudentExam]);
      }

      // Show success message
      alert('Successfully enrolled in the exam!');
      
      // Fetch exams again to ensure the UI is fully updated
      fetchExams();
      
    } catch (err: any) {
      console.error('Error enrolling in exam:', err);
      console.error('Error response:', err.response?.data);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 400) {
        alert('You are already enrolled in this exam.');
      } else if (err.response?.status === 422) {
        const errorMessage = err.response?.data?.detail || 'Invalid enrollment request. Please try again.';
        alert(errorMessage);
      } else {
        setError('Failed to enroll in exam. Please try again later.');
      }
    } finally {
      setEnrollingExamId(null);
    }
  };

  const isExamEnrollable = (exam: ExamData) => {
    // Check if the exam is already in studentExams
    return !studentExams.some(studentExam => studentExam.exam_id === exam.id);
  };

  const renderAvailableExams = () => {
    if (availableExams.length === 0) {
      return (
        <Card>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Available Exams</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no exams available at the moment.
            </p>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {availableExams.map((exam) => {
          const isEnrolled = !isExamEnrollable(exam);
          const attempts = examAttempts[exam.id];
          return (
            <Card key={exam.id} className="hover:shadow-md transition">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">{exam.title}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      {exam.max_questions} Questions
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Instructor: {exam.creator.username}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(exam.start_datetime)}
                    </div>
                    <div className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {exam.duration_minutes} minutes
                    </div>
                    <div className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Max Marks: {exam.max_marks}
                    </div>
                  </div>
                  {exam.description && (
                    <p className="mt-2 text-sm text-gray-600">{exam.description}</p>
                  )}
                </div>
                <div className="flex space-x-3">
                  {!isEnrolled && (
                    <Button
                      onClick={() => handleEnroll(exam.id)}
                      size="sm"
                      disabled={enrollingExamId === exam.id}
                      className={`inline-flex items-center space-x-2 px-6 py-2 font-medium rounded-lg transition-all duration-200 ${
                        enrollingExamId === exam.id 
                          ? 'bg-blue-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                      } text-white`}
                    >
                      {enrollingExamId === exam.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Enrolling...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                          </svg>
                          <span>Enroll Now</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  // Create a user object that matches MainLayout's requirements
  const mainLayoutUser = {
    name: user.username || user.name || 'User',  // Fallback to 'User' if both are undefined
    role: user.role,
    avatar: user.avatar
  };

  // Add effect to clear success message
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (examSubmitted) {
      timeoutId = setTimeout(() => {
        setExamSubmitted(false);
        setSubmissionMessage('');
        // Clear the location state
        window.history.replaceState({}, document.title);
      }, 2000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [examSubmitted]);

  return (
    <MainLayout user={mainLayoutUser} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
        <p className="text-gray-600 mt-1">Enroll, take, and view results of your exams</p>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
              <button 
                onClick={() => setError(null)} 
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-900 underline focus:outline-none"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {examSubmitted && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{submissionMessage || 'Exam submitted successfully!'}</p>
              <button 
                onClick={() => {
                  setExamSubmitted(false);
                  setSubmissionMessage('');
                }} 
                className="mt-2 text-sm font-medium text-green-700 hover:text-green-900 underline focus:outline-none"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block py-4 px-4 text-sm font-medium ${
                activeTab === 'available'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('available')}
            >
              Available
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block py-4 px-4 text-sm font-medium ${
                activeTab === 'upcoming'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block py-4 px-4 text-sm font-medium ${
                activeTab === 'in_progress'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('in_progress')}
            >
              In Progress
            </button>
          </li>
          <li>
            <button
              className={`inline-block py-4 px-4 text-sm font-medium ${
                activeTab === 'completed'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
            </button>
          </li>
        </ul>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : activeTab === 'available' ? (
        renderAvailableExams()
      ) : filteredExams.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No {activeTab} exams</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'upcoming' && 'You don\'t have any upcoming or not started exams.'}
              {activeTab === 'in_progress' && 'You don\'t have any exams currently in progress.'}
              {activeTab === 'completed' && 'You haven\'t completed any exams yet.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredExams.map((studentExam) => {
            const attempts = examAttempts[studentExam.exam.id];
            return (
            <Card key={studentExam.id} className="hover:shadow-md transition">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">{studentExam.exam.title}</h3>
                    {getStatusBadge(studentExam.uiStatus, studentExam.score)}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Instructor: {studentExam.exam.creator.username}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(studentExam.exam.start_datetime)}
                    </div>
                    <div className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatTime(studentExam.exam.start_datetime)}
                    </div>
                    <div className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {studentExam.exam.duration_minutes > 0 ? `${studentExam.exam.duration_minutes} minutes` : 'No time limit'}
                    </div>
                    {studentExam.exam.max_marks > 0 && (
                      <div className="flex items-center">
                        <svg className="mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Max Marks: {studentExam.exam.max_marks}
                      </div>
                    )}
                      {attempts && (
                        <div className="flex items-center">
                          <svg className="mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {(activeTab === 'completed' || activeTab === 'in_progress')
                            ? `${attempts.max_attempts - attempts.remaining_attempts}/${attempts.max_attempts} completed`
                            : `Attempts: ${attempts.remaining_attempts} / ${attempts.max_attempts}`}
                  </div>
                      )}
                    </div>
                    {studentExam.exam.description && (
                      <p className="mt-2 text-sm text-gray-600">{studentExam.exam.description}</p>
                    )}
                </div>
                <div className="flex space-x-3">
                  {getActionButton(studentExam)}
                  <Button
                    onClick={() => handleViewDetails(studentExam.id)}
                    size="sm"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
            );
          })}
          
          {hasMore && !isLoading && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setSkip(prevSkip => prevSkip + limit)}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Load More Exams
              </Button>
            </div>
          )}
          
          {isLoading && (
            <div className="flex justify-center mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default Exams;