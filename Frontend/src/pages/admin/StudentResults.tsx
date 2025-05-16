import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AdminSidebar from './AdminSidebar';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';     

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
}

interface Exam {
  id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string | null;
  duration_minutes: number;
  max_marks: number;
  max_questions: number;
  course_id: number;
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
}

interface StudentExam {
  student_id: number;
  exam_id: number;
  status: string;
  id: number;
  created_at: string;
  updated_at: string | null;
  student: User;
  exam: Exam;
}

interface ExamResult {
  student_exam_id: number;
  attempt_number: number;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  obtained_marks: number;
  max_marks: number;
  passed_status: boolean;
  id: number;
  created_at: string;
  updated_at: string | null;
  student_exam: StudentExam;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const StudentResults: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const response = await axios.get(`${API_URL}/api/users/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        });

        // Filter only student users
        const studentUsers = response.data.filter((user: User) => user.role === 'student');
        setStudents(studentUsers);
      } catch (err: any) {
        console.error('Error fetching students:', err);
        setError('Failed to fetch students');
      }
    };

    fetchStudents();
  }, []);

  const fetchStudentResults = async (studentId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/student-exams/student/${studentId}/results`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      );

      setResults(response.data);
    } catch (err: any) {
      console.error('Error fetching student results:', err);
      setError('Failed to fetch student results');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSelect = (studentId: number, studentName: string) => {
    setSelectedStudent(studentId);
    setSelectedStudentName(studentName);
    fetchStudentResults(studentId);
  };

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

  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 bg-blue-500 rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Student Exam Results</h1>
              <p className="text-blue-100 mt-1">View and analyze student performance across all exams</p>
            </div>
            {selectedStudent && (
              <div className="mt-4 md:mt-0 flex items-center bg-white rounded-full shadow px-4 py-2 space-x-3 border border-blue-200">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white font-bold text-base">
                  {selectedStudentName.charAt(0).toUpperCase()}
                </div>
                <span className="text-blue-900 text-base font-semibold">{selectedStudentName}</span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="ml-2 px-3 py-1 text-blue-600 hover:bg-blue-50 border-none shadow-none font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-150"
                  onClick={() => {
                    setSelectedStudent(null);
                    setSelectedStudentName('');
                  }}
                >
                  <span className="inline-flex items-center">
                    <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    Clear
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm" role="alert">
            <div className="flex">
              <div className="py-1">
                <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Student List */}
          <div className="md:col-span-1">
            <Card className="h-full overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Students</h2>
              </div>
              
              <div className="p-4">
                <div className="mb-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-gray-400">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">No students found</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleStudentSelect(student.id, student.full_name || student.username)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          selectedStudent === student.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            selectedStudent === student.id ? 'bg-blue-500' : 'bg-gray-500'
                          }`}>
                            {student.full_name ? student.full_name.charAt(0).toUpperCase() : student.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate ${
                              selectedStudent === student.id ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                              {student.full_name || student.username}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{student.email}</p>
                          </div>
                          {selectedStudent === student.id && (
                            <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-sm">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
              </div>
            ) : selectedStudent ? (
              results.length > 0 ? (
                <div className="space-y-6">
                  {/* Statistics Summary */}
                  <Card className="overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h2 className="text-lg font-semibold text-gray-800">Performance Summary</h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <h3 className="text-sm font-medium text-blue-800 mb-1">Total Exams</h3>
                          <p className="text-2xl font-bold text-blue-900">{results.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <h3 className="text-sm font-medium text-green-800 mb-1">Passed</h3>
                          <p className="text-2xl font-bold text-green-900">
                            {results.filter(r => r.passed_status).length}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                          <h3 className="text-sm font-medium text-red-800 mb-1">Failed</h3>
                          <p className="text-2xl font-bold text-red-900">
                            {results.filter(r => !r.passed_status).length}
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <h3 className="text-sm font-medium text-purple-800 mb-1">Average Score</h3>
                          <p className="text-2xl font-bold text-purple-900">
                            {(results.reduce((sum, result) => sum + result.score_percentage, 0) / results.length).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Detailed Results */}
                  <div className="space-y-4">
                    {results.map((result) => (
                      <Card key={result.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200">
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {result.student_exam.exam.title}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center">
                                <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Attempt {result.attempt_number}
                              </span>
                              <span className="flex items-center">
                                <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(result.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1.5 text-sm font-medium rounded-full flex items-center ${
                              result.passed_status 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              <svg className={`h-4 w-4 mr-1.5 ${result.passed_status ? 'text-green-500' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
                                {result.passed_status ? (
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                ) : (
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                )}
                              </svg>
                              {result.passed_status ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Score Overview</h4>
                                <div className="relative pt-1">
                                  <div className="flex mb-2 items-center justify-between">
                                    <div>
                                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                                        Progress
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-semibold inline-block text-blue-600">
                                        {result.score_percentage}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                                    <div 
                                      style={{ width: `${result.score_percentage}%` }}
                                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                        result.score_percentage >= 70 ? 'bg-green-500' : 
                                        result.score_percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <div className="text-sm font-medium text-gray-500">Correct Answers</div>
                                  <div className="mt-1 text-2xl font-semibold text-green-600">{result.correct_answers}</div>
                                  <div className="text-xs text-gray-500">out of {result.total_questions}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <div className="text-sm font-medium text-gray-500">Marks Obtained</div>
                                  <div className="mt-1 text-2xl font-semibold text-blue-600">{result.obtained_marks}</div>
                                  <div className="text-xs text-gray-500">out of {result.max_marks}</div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Information</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Created By:</span>
                                    <span className="font-medium text-gray-900">{result.student_exam.exam.creator.full_name}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="font-medium text-gray-900">{result.student_exam.exam.duration_minutes} minutes</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Questions:</span>
                                    <span className="font-medium text-gray-900">{result.total_questions}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={() => window.open(`/admin/student-exams/${result.student_exam_id}/view`, '_blank')}
                                  className="w-full sm:w-auto flex items-center justify-center space-x-2"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>View Details</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-4">
                      <svg className="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">No Results Found</h2>
                    <p className="text-gray-600 max-w-md">This student hasn't completed any exams yet or no results are available for this student.</p>
                  </div>
                </Card>
              )
            ) : (
              <Card className="text-center py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-blue-100 rounded-full p-4 mb-4">
                    <svg className="h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Select a Student</h2>
                  <p className="text-gray-600 max-w-md">Choose a student from the list on the left to view their exam results and performance metrics.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default StudentResults; 