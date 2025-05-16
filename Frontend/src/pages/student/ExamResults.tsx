import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
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
  score: number | null;
  created_at: string;
  updated_at: string | null;
  student: User;
  exam: ExamData;
}

interface Option {
  id: number;
  text: string;
  question_id: number;
  is_correct: boolean;
}

interface Answer {
  content: string;
  is_correct: boolean;
  id: number;
  question_id: number;
  created_at: string;
  updated_at: string | null;
}

interface Question {
  content: string;
  image_url: string | null;
  difficulty_level: string;
  topic_id: number;
  chapter_id: number;
  subject_id: number;
  course_id: number;
  id: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  answers: Answer[];
}

interface StudentAnswer {
  student_exam_id: number;
  question_id: number;
  answer_id: number;
  is_correct: boolean;
  id: number;
  created_at: string;
  updated_at: string | null;
  student_exam: {
    student_id: number;
    exam_id: number;
    status: string;
    id: number;
    start_time: string;
    end_time: string;
    created_at: string;
    updated_at: string | null;
    student: User;
    exam: ExamData;
  };
  question: Question;
  answer: Answer;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const ExamResults: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const studentExamId = location.state?.studentExamId;
  
  const [attemptResults, setAttemptResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttemptResults = async () => {
      if (!studentExamId) {
        setError('Missing exam information');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          return;
        }
        const response = await axios.get(
          `${API_URL}/api/student-exams/${studentExamId}/all-results`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json'
            }
          }
        );
        setAttemptResults(response.data);
      } catch (err: any) {
        setError('Failed to fetch attempt results.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttemptResults();
  }, [studentExamId]);

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <p>{error}</p>
          <div className="mt-4">
            <Button 
              as={Link} 
              to="/student/exams" 
              variant="secondary"
            >
                Back to Exams
              </Button>
            </div>
        </div>
      ) : attemptResults.length > 0 ? (
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">All Attempt Results</h1>
            <p className="text-gray-600">Exam ID: {attemptResults[0]?.student_exam?.exam_id}</p>
          </div>
          <div className="space-y-6">
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
                {attemptResults.map((attempt) => (
                  <tr key={attempt.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{attempt.attempt_number}</td>
                    <td className="px-4 py-2">{attempt.score_percentage}%</td>
                    <td className="px-4 py-2">
                      <span className={`font-medium ${attempt.passed_status ? 'text-green-600' : 'text-red-600'}`}>
                        {attempt.passed_status ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-2">{attempt.obtained_marks} / {attempt.max_marks}</td>
                    <td className="px-4 py-2">{attempt.created_at ? new Date(attempt.created_at).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6">
            <Button 
              as={Link} 
              to="/student/exams" 
              variant="secondary"
            >
              Back to Exams
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-semibold">No Attempt Results Available</h2>
            <p className="mt-2">No attempt results were found for this exam.</p>
          </div>
          <Button 
            as={Link} 
            to="/student/exams" 
            variant="secondary"
          >
            Back to Exams
          </Button>
        </div>
      )}
    </MainLayout>
  );
};

export default ExamResults; 