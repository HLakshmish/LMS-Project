import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import { useAuth } from '../../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface StudentExam {
  id: string;
  student_id: number;
  exam_id: number;
  status: 'completed' | 'in_progress' | 'not_started';
  marks_obtained?: number;
  total_marks?: number; 
  start_time?: string;
  completed_at?: string;
  time_taken_minutes?: number;
  student?: {
    email: string;
    username: string;
    id?: number;
  }
}

const TeacherExamResults: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const auth = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [studentExams, setStudentExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Check for missing ID
  useEffect(() => {
    console.log('Current exam ID from URL params:', examId);
    if (!examId) {
      setError('Missing exam ID. Please go back and select an exam.');
      setLoading(false);
    }
  }, [examId]);

  // Fetch student exam results from API
  useEffect(() => {
    const fetchStudentExams = async () => {
      // Skip API call if ID is missing
      if (!examId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log(`Fetching student exam results for exam ID: ${examId}`);
        const token = auth.token;
        
        const response = await fetch(`${API_URL}/api/student-exams/student-exams/exam/${examId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch exam results: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Student exam data received:", data);
        
        // Convert the data to our StudentExam interface format
        const formattedData = Array.isArray(data) ? data : [data];
        
        setStudentExams(formattedData);
      } catch (err) {
        console.error('Error fetching student exam results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load student exam results');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentExams();
  }, [examId, auth.token]);

  // Filter students based on search term and status filter
  const filteredStudents = studentExams.filter(studentExam => {
    // Apply search filter
    const searchMatch = 
      (studentExam.student?.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (studentExam.student?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    const statusMatch = statusFilter === 'all' || studentExam.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  const handleViewDetails = (studentExam: StudentExam) => {
    // Navigate to student exam result view
    // This will navigate to the student's specific exam result page
    navigate(`/student/exams/${studentExam.id}/result`, { 
      state: { 
        fromTeacher: true,
        studentName: studentExam.student?.username,
        studentEmail: studentExam.student?.email
      } 
    });
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Loading Exam Results...</h1>
            <Button
              variant="secondary"
              onClick={() => navigate('/teacher/exams')}
            >
              Back to Exams
            </Button>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Error Loading Results</h1>
            <Button
              variant="secondary"
              onClick={() => navigate('/teacher/exams')}
            >
              Back to Exams
            </Button>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
            <p className="text-gray-600">View student results and performance metrics</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/teacher/exams')}
          >
            Back to Exams
          </Button>
        </div>

        {/* Search and Filter Section */}
        <Card className="mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Students
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by username or email..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="sm:w-48">
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status-filter"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="not_started">Not Started</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50">
            <div className="p-4">
              <h3 className="text-sm font-medium text-blue-800">Total Students</h3>
              <p className="text-2xl font-bold text-blue-900">{studentExams.length}</p>
            </div>
          </Card>
          <Card className="bg-green-50">
            <div className="p-4">
              <h3 className="text-sm font-medium text-green-800">Completed</h3>
              <p className="text-2xl font-bold text-green-900">
                {studentExams.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </Card>
          <Card className="bg-yellow-50">
            <div className="p-4">
              <h3 className="text-sm font-medium text-yellow-800">In Progress</h3>
              <p className="text-2xl font-bold text-yellow-900">
                {studentExams.filter(s => s.status === 'in_progress').length}
              </p>
            </div>
          </Card>
          <Card className="bg-red-50">
            <div className="p-4">
              <h3 className="text-sm font-medium text-red-800">Not Started</h3>
              <p className="text-2xl font-bold text-red-900">
                {studentExams.filter(s => s.status === 'not_started').length}
              </p>
            </div>
          </Card>
        </div>

        {/* Results Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  
                 
                  
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No students found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((studentExam) => (
                    <tr key={studentExam.id || studentExam.student_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{studentExam.student?.username || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{studentExam.student?.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          studentExam.status === 'completed' ? 'bg-green-100 text-green-800' :
                          studentExam.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {studentExam.status === 'completed' ? 'Completed' :
                          studentExam.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handleViewDetails(studentExam)}
                          disabled={studentExam.status !== 'completed'}
                        >
                          View Result
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TeacherExamResults; 