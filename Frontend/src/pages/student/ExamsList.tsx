import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// Types
interface User {
  username: string;
  email: string;
  id: number;
  role: string;
  created_at: string;
  updated_at: string | null;
}

interface ExamData {
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
  id: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: User;
  course_name?: string;
}

interface StudentExam {
  student_id: number;
  exam_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  id: number;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string | null;
  student: User;
  exam: ExamData;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const ExamsList: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [studentExams, setStudentExams] = useState<StudentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'inProgress' | 'completed'>('upcoming');
  const navigate = useNavigate();

  // Fetch exams function
  const fetchExams = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/student-exams/student-exams/my-exams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json'
        },
        params: {
          skip: 0,
          limit: 100
        }
      });
      
      setStudentExams(response.data);
    } catch (err: any) {
      console.error('Error fetching exams:', err);
      if (err.response && err.response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to load exams. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and setup interval
  useEffect(() => {
    fetchExams();
    
    // Set up an interval to refresh the exam list every 10 seconds
    const intervalId = setInterval(fetchExams, 10000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Check if exam start time has been reached
  const hasExamStarted = (startDate: string): boolean => {
    const start = new Date(startDate);
    const now = new Date();
    // Compare only the date and time parts
    return now.getTime() >= start.getTime();
  };

  // Calculate if an exam is available now
  const isExamAvailable = (startDate: string, endDate: string): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
  };

  // Filter exams based on active tab
  const filteredExams = (): StudentExam[] => {
    const now = new Date();
    
    switch (activeTab) {
      case 'upcoming':
        return studentExams.filter(exam => {
          const startTime = new Date(exam.exam.start_datetime);
          return startTime.getTime() > now.getTime();
        });
        
      case 'inProgress':
        return studentExams.filter(exam => {
          const startTime = new Date(exam.exam.start_datetime);
          const endTime = new Date(exam.exam.end_datetime);
          const hasStarted = now.getTime() >= startTime.getTime();
          const hasNotEnded = now.getTime() <= endTime.getTime();
          
          // Show in "In Progress" if:
          // 1. Start time has been reached but not ended, OR
          // 2. Status is already "in_progress"
          return (hasStarted && hasNotEnded) || exam.status === 'in_progress';
        });
        
      case 'completed':
        return studentExams.filter(exam => exam.status === 'completed');
        
      default:
        return studentExams;
    }
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate time left for exam
  const calculateTimeLeft = (endDate: string): string => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const timeLeft = end - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} days left`;
    } else if (hours > 0) {
      return `${hours} hours left`;
    } else {
      return `${minutes} minutes left`;
    }
  };
  
  // Render status badge
  const renderStatusBadge = (status: 'not_started' | 'in_progress' | 'completed'): React.ReactElement => {
    let bgColor: string;
    let textColor: string;
    
    switch (status) {
      case 'not_started':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'in_progress':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'completed':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
    }
    
    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${bgColor} ${textColor}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };
  
  // Render tab button
  const renderTabButton = (tab: 'upcoming' | 'inProgress' | 'completed', label: string): React.ReactElement => {
    return (
      <button
        className={`px-4 py-2 border-b-2 ${
          activeTab === tab
            ? 'border-blue-500 text-blue-600 font-medium'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
        onClick={() => setActiveTab(tab)}
      >
        {label}
      </button>
    );
  };
  
  // Handle starting an exam
  const handleStartExam = async (studentExamId: number, examId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      // First verify the student exam exists and can be started
      const verifyResponse = await axios.get(
        `${API_URL}/api/student-exams/student-exams/${studentExamId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      );

      if (verifyResponse.data.status === 'completed') {
        setError('This exam has already been completed.');
        return;
      }

      // Call the start exam API
      await axios.put(
          `${API_URL}/api/student-exams/student-exams/${studentExamId}/start`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      );

      console.log('Exam started successfully. Student Exam ID:', studentExamId);

      // Refresh the exam list after starting
      await fetchExams();

      // Navigate to exam taking page with studentExamId in state
      navigate(`/student/exams/${examId}/take`, {
        state: { studentExamId: studentExamId }
      });
    } catch (err: any) {
      console.error('Error starting exam:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('Exam not found or you do not have access to it.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to start exam. Please try again later.');
      }
    }
  };
  
  // Render action button based on exam status
  const renderActionButton = (studentExam: StudentExam): React.ReactElement => {
    const { status, exam, id } = studentExam;
    const now = new Date();
    const startTime = new Date(exam.start_datetime);
    const endTime = new Date(exam.end_datetime);
    
    const hasStarted = now.getTime() >= startTime.getTime();
    const hasNotEnded = now.getTime() <= endTime.getTime();
    
    // Show "Take Test" button if:
    // 1. Exam has started but not ended
    // 2. Status is not completed
    if (hasStarted && hasNotEnded && status !== 'completed') {
      return (
        <Button
          onClick={() => handleStartExam(id, exam.id)}
          variant="primary"
          size="sm"
        >
          {status === 'in_progress' ? 'Continue Exam' : 'Take Test'}
        </Button>
      );
    }

    // Show "View Results" for completed exams
    if (status === 'completed') {
      return (
        <Button
          as={Link}
          to={`/student/exams/${id}/results`}
          variant="secondary"
          size="sm"
        >
          View Results
        </Button>
      );
    }

    // Show "Not Yet Available" for future exams
    if (!hasStarted) {
      return (
        <Button
          disabled
          variant="secondary"
          size="sm"
        >
          Not Yet Available
        </Button>
      );
    }

    // Show "Expired" for past exams
    return (
      <Button
        disabled
        variant="secondary"
        size="sm"
      >
        Expired
      </Button>
    );
  };
  
  const handleViewDetails = (studentExamId: number) => {
    navigate(`/student/exam-details/${studentExamId}`);
  };
  
  // Render exam card
  const renderExamCard = (studentExam: StudentExam): React.ReactElement => {
    const { exam, status } = studentExam;
    
    return (
      <Card key={studentExam.id} className="mb-4 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">{exam.title}</h3>
          <div className="flex items-center space-x-2">
            {renderStatusBadge(status)}
            <span className="text-sm text-gray-500">Duration: {exam.duration_minutes} mins</span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Course</p>
              <p className="font-medium text-gray-900">{exam.course_name || 'General'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Start Time</p>
              <p className="font-medium text-gray-900">{formatDate(exam.start_datetime)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">End Time</p>
              <p className="font-medium text-gray-900">{formatDate(exam.end_datetime)}</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">{exam.description}</p>
          
          <div className="flex justify-between items-center">
            <div>
              {status !== 'completed' && (
                <div className="text-sm text-gray-600">
                  {isExamAvailable(exam.start_datetime, exam.end_datetime)
                    ? `Time left: ${calculateTimeLeft(exam.end_datetime)}`
                    : new Date(exam.start_datetime) > new Date()
                      ? `Starts in: ${calculateTimeLeft(exam.start_datetime)}`
                      : 'Expired'}
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              {renderActionButton(studentExam)}
              <Button
                onClick={() => handleViewDetails(studentExam.id)}
                variant="secondary"
                size="sm"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };
  
  // Render upcoming exam card
  const renderUpcomingExamCard = (exam: ExamData): React.ReactElement => {
    return (
      <Card key={exam.id} className="mb-4 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">{exam.title}</h3>
          <div className="flex items-center space-x-2">
            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              upcoming
            </span>
            <span className="text-sm text-gray-500">Duration: {exam.duration_minutes} mins</span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Course</p>
              <p className="font-medium text-gray-900">{exam.course_name || 'General'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Start Time</p>
              <p className="font-medium text-gray-900">{formatDate(exam.start_datetime)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">End Time</p>
              <p className="font-medium text-gray-900">{formatDate(exam.end_datetime)}</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">{exam.description}</p>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {new Date(exam.start_datetime) > new Date()
                ? `Available in: ${calculateTimeLeft(exam.start_datetime)}`
                : isExamAvailable(exam.start_datetime, exam.end_datetime)
                  ? 'Available now'
                  : 'Expired'}
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              disabled
            >
              Not Enrolled
            </Button>
          </div>
        </div>
      </Card>
    );
  };
  
  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
        <p className="text-gray-600 mt-1">View all your assigned exams</p>
      </div>
      
      {/* Error state */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Tabs for filtering exams */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-4">
          {renderTabButton('upcoming', 'Upcoming')}
          {renderTabButton('inProgress', 'In Progress')}
          {renderTabButton('completed', 'Completed')}
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {filteredExams().length > 0 ? (
            filteredExams().map(studentExam => renderExamCard(studentExam))
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">No exams found</h3>
              <p className="mt-1 text-gray-500">
                {activeTab === 'upcoming'
                  ? "You don't have any upcoming exams."
                  : activeTab === 'inProgress'
                    ? "You don't have any exams in progress."
                    : activeTab === 'completed'
                      ? "You haven't completed any exams yet."
                      : "You don't have any assigned exams."}
              </p>
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
};

export default ExamsList;