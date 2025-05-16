import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
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
  score?: number;
}

interface ExamDetailsProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const ExamDetails: React.FC<ExamDetailsProps> = ({ user, onLogout }) => {
  const { studentExamId } = useParams<{ studentExamId: string }>();
  const navigate = useNavigate();
  const [examDetails, setExamDetails] = useState<StudentExam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setIsLoading(false);
          return;
        }

        const response = await axios.get(`${API_URL}/api/student-exams/student-exams/${studentExamId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        });

        setExamDetails(response.data);
      } catch (err: any) {
        console.error('Error fetching exam details:', err);
        if (err.response && err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError('Failed to fetch exam details. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (studentExamId) {
      fetchExamDetails();
    }
  }, [studentExamId]);

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

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Exam Details</h1>
          <Button onClick={() => navigate('/student/exams')} size="sm">
            Back to Exams
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : examDetails ? (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{examDetails.exam.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Exam Information</h3>
                  <div className="space-y-3">
                    <p className="text-gray-700"><span className="font-medium">Description:</span> {examDetails.exam.description}</p>
                    <p className="text-gray-700"><span className="font-medium">Instructor:</span> {examDetails.exam.creator.username}</p>
                    <p className="text-gray-700"><span className="font-medium">Duration:</span> {examDetails.exam.duration_minutes} minutes</p>
                    <p className="text-gray-700"><span className="font-medium">Maximum Marks:</span> {examDetails.exam.max_marks}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Schedule</h3>
                  <div className="space-y-3">
                    <p className="text-gray-700"><span className="font-medium">Start Time:</span> {formatDate(examDetails.exam.start_datetime)}</p>
                    <p className="text-gray-700"><span className="font-medium">End Time:</span> {formatDate(examDetails.exam.end_datetime)}</p>
                    
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {examDetails.status === 'not_started' && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Instructions</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Make sure you have a stable internet connection before starting the exam.</li>
                  <li>Once started, the exam timer cannot be paused.</li>
                  <li>Submit your answers before the exam duration ends.</li>
                  <li>You can only submit the exam once.</li>
                  <li>Switching tab more than 3 times will exit the exam.</li>
                </ul>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-700">No exam details found.</p>
          </div>
        </Card>
      )}
    </MainLayout>
  );
};

export default ExamDetails;