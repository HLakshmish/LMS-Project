import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import TeacherSidebar from '../sidebar/TeacherSidebar';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface Exam {
  id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'draft';
}

interface TeacherExamsPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const TeacherExamsPage: React.FC<TeacherExamsPageProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { token } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add states for delete functionality
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await fetch(`${API_URL}/api/exams/exams/`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch exams');
        }

        const data = await response.json();
        setExams(data);
      } catch (err) {
        console.error('Error fetching exams:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch exams');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, [token]);

  // Add delete handlers
  const handleDeleteClick = (exam: Exam) => {
    setExamToDelete(exam);
    setShowDeleteModal(true);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setExamToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/exams/exams/${examToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete exam');
      }
      
      // Update the exams state by removing the deleted exam
      setExams(exams.filter(exam => exam.id !== examToDelete.id));
      closeDeleteModal();
    } catch (err) {
      console.error('Error deleting exam:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete exam');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to determine exam status
  const getExamStatus = (exam: Exam): 'upcoming' | 'ongoing' | 'completed' | 'draft' => {
    const now = new Date();
    const startDate = new Date(exam.start_datetime);
    const endDate = new Date(exam.end_datetime);

    if (now < startDate) {
      return 'upcoming';
    } else if (now >= startDate && now <= endDate) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  };

  // Helper function to format datetime
  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-gray-600">Manage your exams and assessments</p>
        </div>
        <Link to="/teacher/exams/create">
          <Button variant="primary">
            Create New Exam
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const status = getExamStatus(exam);
            return (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-500">{exam.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                      status === 'ongoing' ? 'bg-green-100 text-green-800' :
                      status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Duration:</span>
                      <span className="text-gray-900">{exam.duration_minutes} minutes</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Marks:</span>
                      <span className="text-gray-900">{exam.max_marks}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Start Time:</span>
                      <span className="text-gray-900">{formatDateTime(exam.start_datetime)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <Link to={`/teacher/exams/${exam.id}`}>
                      <Button variant="light" size="sm">View Details</Button>
                    </Link>
                    <Link to={`/teacher/exams/${exam.id}/edit`}>
                      <Button variant="light" size="sm">Edit</Button>
                    </Link>
                    
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => handleDeleteClick(exam)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && examToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Exam</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this exam? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="mt-4 bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-900">Exam Title: {examToDelete.title}</p>
              <p className="text-sm text-gray-500 truncate mt-1">{examToDelete.description}</p>
            </div>
            
            {deleteError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{deleteError}</span>
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button 
                variant="light" 
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleDeleteExam}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default TeacherExamsPage; 