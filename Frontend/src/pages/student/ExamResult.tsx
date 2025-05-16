import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
import TeacherSidebar from '../teacher/sidebar/TeacherSidebar';
import { calculateMaxMarks, processExamResult } from '../../services/examService';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface ExamResult {
  student_exam_id: number;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  obtained_marks: number;
  max_marks: number;
  passed_status: boolean;
  id: number;
  created_at: string;
  updated_at: string | null;
  student_exam?: {
    student_id: number;
    exam_id: number;
    id: number;
    created_at: string;
    updated_at: string;
    student: {
      email: string;
      username: string;
      role: string;
      id: number;
      full_name: string;
      created_at: string;
      updated_at: string;
      last_login: string;
    };
    exam: {
      title: string;
      description: string;
      start_datetime: string;
      end_datetime: string | null;
      duration_minutes: number;
      max_marks: number;
      max_questions: number;
      course_id: number;
      class_id: number | null;
      subject_id: number | null;
      chapter_id: number | null;
      topic_id: number | null;
      id: number;
      created_by: number;
      created_at: string;
      updated_at: string | null;
      creator: {
        email: string;
        username: string;
        role: string;
        id: number;
        full_name: string;
        created_at: string;
        updated_at: string;
        last_login: string;
      };
    };
  };
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const ExamResult: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const { examId } = useParams<{ examId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // Check if this is being viewed by a teacher
  const fromTeacher = location.state?.fromTeacher || false;
  const studentName = location.state?.studentName;
  const studentEmail = location.state?.studentEmail;
  const studentExamId = location.state?.studentExamId || examId;
  const examTitle = location.state?.examTitle;
  const preloadedAttempts = location.state?.preloadedAttempts || [];
  
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allAttempts, setAllAttempts] = useState<any[]>(preloadedAttempts);

  useEffect(() => {
    const fetchExamResult = async () => {
      if (!studentExamId) {
        setError('Missing exam information');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          return;
        }
        
        const response = await axios.get(
          `${API_URL}/api/student-exams/${studentExamId}/result?recalculate=false`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json'
            }
          }
        );
        
        setResult(response.data);
        
        // Process the result to apply settings for max_marks calculation
        const processedResult = processExamResult(response.data);
        setResult(processedResult);
      } catch (err: any) {
        console.error('Error fetching exam result:', err);
        if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (err.response?.status === 404) {
          setError('Exam result not found or you do not have access to it.');
        } else {
          setError('Failed to fetch exam result. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExamResult();
  }, [studentExamId, token]);

  // Fetch all attempts for this exam
  useEffect(() => {
    const fetchAllAttempts = async () => {
      if (!token || !result?.student_exam?.exam?.id) return;
      try {
        const response = await axios.get(
          `${API_URL}/api/student-exams/${result.student_exam.exam.id}/all-attempts`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json'
            }
          }
        );
        setAllAttempts(response.data.length > 0 ? response.data : preloadedAttempts);
      } catch (err) {
        // If error fetching attempts, keep using preloaded attempts
        if (preloadedAttempts.length > 0) {
          setAllAttempts(preloadedAttempts);
        }
      }
    };
    fetchAllAttempts();
  }, [token, result?.student_exam?.exam?.id, preloadedAttempts]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBackClick = () => {
    if (fromTeacher) {
      // Navigate back to the teacher's exam results page
      navigate(`/teacher/exams/${examId}/results`);
    } else {
      // Student navigates back to their exams page
      navigate('/student/exams');
    }
  };
  
  return (
    <MainLayout 
      user={user} 
      onLogout={onLogout} 
      sidebarContent={fromTeacher ? <TeacherSidebar /> : <StudentSidebar />}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exam Result</h1>
            {fromTeacher && studentName && (
              <p className="text-gray-600">Student: {studentName} {studentEmail ? `(${studentEmail})` : ''}</p>
            )}
            {(result?.student_exam || examTitle) && (
              <p className="text-gray-600">Exam: {result?.student_exam?.exam?.title || examTitle}</p>
            )}
          </div>
          <Button 
            onClick={handleBackClick}
            variant="secondary"
          >
            {fromTeacher ? 'Back to Exam Results' : 'Back to Exams'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <p>{error}</p>
        </div>
      ) : (
        <Card>
          <div className="p-6">
            {/* Only show All Attempts Table */}
            {allAttempts.length > 0 ? (
              <div className="mt-2">
                <h2 className="text-lg font-semibold mb-4">All Attempts</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 border-b text-left">Attempt #</th>
                        <th className="px-4 py-2 border-b text-left">Score</th>
                        <th className="px-4 py-2 border-b text-left">Status</th>
                        <th className="px-4 py-2 border-b text-left">Obtained Marks</th>
                        <th className="px-4 py-2 border-b text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAttempts.map((attempt) => (
                        <tr key={attempt.id} className="border-b last:border-b-0">
                          <td className="px-4 py-2">{attempt.attempt_number}</td>
                          <td className="px-4 py-2">{attempt.score_percentage}%</td>
                          <td className="px-4 py-2">
                            <span className={`font-medium ${attempt.passed_status ? 'text-green-600' : 'text-red-600'}`}>{attempt.passed_status ? 'Passed' : 'Failed'}</span>
                          </td>
                          <td className="px-4 py-2">{attempt.obtained_marks} / {attempt.max_marks}</td>
                          <td className="px-4 py-2">{formatDate(attempt.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg">
                  <h2 className="text-xl font-semibold">No Attempts Available</h2>
                  <p className="mt-2">No attempts found for this exam.</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </MainLayout>
  );
};

export default ExamResult; 