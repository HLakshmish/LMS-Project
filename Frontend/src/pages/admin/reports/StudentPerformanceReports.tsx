import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../../../components/layout/MainLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import AdminSidebar from '../AdminSidebar';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Exam {
  id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
  max_questions: number;
  course_id: number;
  class_id: number;
  subject_id: number;
  chapter_id: number;
  topic_id: number;
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

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  last_login: string;
}

interface Attempt {
  attempt_number: number;
  score_percentage: number;
  obtained_marks: number;
  max_marks: number;
  total_questions: number;
  correct_answers: number;
  passed: boolean;
  attempt_date: string;
}

interface ExamAttemptReport {
  exam_id: number;
  exam_title: string;
  student_id: number;
  student_name: string;
  total_attempts: number;
  avg_score: number;
  best_score: number;
  attempts_remaining: number;
  max_attempts: number;
  attempts: Attempt[];
  improvement_percentage: number | null;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const StudentPerformanceReports: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [report, setReport] = useState<ExamAttemptReport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [noDataFound, setNoDataFound] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedExam = exams.find(e => e.id === selectedExamId);

  const exportToExcel = () => {
    if (!report || !selectedStudent) return;

    // Prepare the data for export
    const examData = report.flatMap(examReport => 
      examReport.attempts.map(attempt => ({
        'Exam Title': examReport.exam_title,
        'Attempt Number': attempt.attempt_number,
        'Date Taken': attempt.attempt_date,
        'Score (%)': attempt.score_percentage,
        'Obtained Marks': attempt.obtained_marks,
        'Maximum Marks': attempt.max_marks,
        'Total Questions': attempt.total_questions,
        'Correct Answers': attempt.correct_answers,
        'Status': attempt.passed ? 'Passed' : 'Failed'
      }))
    );

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(examData);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Student Performance');

    // Generate Excel file
    const fileName = `${selectedStudent.full_name || selectedStudent.username}_performance_report.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch students list
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError('Authentication required. Please login.');
      return;
    }

    fetch('http://localhost:8000/api/users/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
      .then(res => {
        if (res.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        if (!res.ok) throw new Error('Failed to fetch students');
        return res.json();
      })
      .then(data => {
        const studentUsers = data.filter((user: User) => user.role === 'student');
        setStudents(studentUsers);
        if (studentUsers.length > 0) {
          setSelectedStudentId(studentUsers[0].id);
        }
      })
      .catch(err => {
        setError(err.message);
        if (err.message.includes('Authentication failed')) {
          onLogout();
        }
      });
  }, [onLogout]);

  // Fetch exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const token = getAuthToken();
        const response = await axios.get(
          `${API_URL}/api/exams/exams/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setExams(response.data);
      } catch (err) {
        console.error('Error fetching exams:', err);
      }
    };

    fetchExams();
  }, []);

  // Fetch student report when selected student changes
  useEffect(() => {
    if (!selectedStudentId) return;

    const token = getAuthToken();
    if (!token) {
      setError('Authentication required. Please login.');
      return;
    }

    setLoading(true);
    setError(null);
    setNoDataFound(false);

    let url = `${API_URL}/api/reports/student/${selectedStudentId}/attempts`;
    if (selectedExamId) {
      url += `?exam_id=${selectedExamId}`;
    }

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
      .then(res => {
        if (res.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        if (!res.ok) throw new Error('Failed to fetch report');
        return res.json();
      })
      .then(data => {
        if (!data || data.length === 0) {
          setNoDataFound(true);
          setReport(null);
        } else {
        setReport(data);
          setNoDataFound(false);
        }
      })
      .catch(err => {
        setError(err.message);
        setReport(null);
        if (err.message.includes('Authentication failed')) {
          onLogout();
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedStudentId, selectedExamId, onLogout]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score === 0) return 'text-red-600';
    if (score < 60) return 'text-red-600';
    if (score < 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getExamStatusBadge = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.start_datetime);
    const endDate = new Date(exam.end_datetime);

    if (now < startDate) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          Upcoming
        </span>
      );
    } else if (now > endDate) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          Expired
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Active
        </span>
      );
    }
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Student Performance Report</h1>
                <p className="text-gray-500 mt-1">
                  {selectedStudent ? (
                    <>Detailed analytics for <span className="font-semibold">{selectedStudent.full_name || selectedStudent.username}</span></>
                  ) : (
                    'Select a student to view their performance report'
                  )}
                </p>
              </div>
                <button
                  onClick={exportToExcel}
                  disabled={!report || loading}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                    !report || loading
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 transition-colors duration-150'
                  }`}
                >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                  Export to Excel
                </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedStudentId || ''}
                  onChange={e => setSelectedStudentId(Number(e.target.value))}
                >
                  {students.length > 0 ? (
                    students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.full_name || student.username} ({student.email})
                    </option>
                    ))
                  ) : (
                    <option value="">No students found</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedExamId || ''}
                  onChange={e => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All Exams</option>
                  {exams.length > 0 ? (
                    exams.map(exam => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No exams available</option>
                  )}
                </select>
                </div>
              </div>
            </div>

          {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center p-8">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Loading report data...</p>
              </div>
              </div>
            )}
            
          {/* Error State */}
            {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* No Data State */}
          {!loading && !error && (!report || report.length === 0) && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No Data Found</h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                {selectedExamId ? (
                  `No attempts found for ${selectedStudent?.full_name || 'selected student'} in the selected exam.`
                ) : (
                  `No exam attempts found for ${selectedStudent?.full_name || 'selected student'}.`
                )}
              </p>
              </div>
            )}

          {/* Report Data */}
          {report && report.length > 0 && !loading && (
            <div className="space-y-6">
              {/* Performance Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-gray-500">Total Exams</span>
                    <span className="mt-2 text-3xl font-bold text-blue-600">{report.length}</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-gray-500">Average Score</span>
                    <span className={`mt-2 text-3xl font-bold ${getScoreColor(report.reduce((acc, curr) => acc + curr.avg_score, 0) / report.length)}`}>
                      {(report.reduce((acc, curr) => acc + curr.avg_score, 0) / report.length).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-gray-500">Best Score</span>
                    <span className={`mt-2 text-3xl font-bold ${getScoreColor(Math.max(...report.map(r => r.best_score)))}`}>
                      {Math.max(...report.map(r => r.best_score))}%
                    </span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-gray-500">Total Attempts</span>
                    <span className="mt-2 text-3xl font-bold text-purple-600">
                      {report.reduce((acc, curr) => acc + curr.total_attempts, 0)}
                    </span>
                  </div>
                  </div>
                </div>

                {/* Exam Results Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Exam Results</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempt</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obtained/Max</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Improvement</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.map((examReport) => (
                        examReport.attempts.map((attempt, index) => (
                          <tr key={`${examReport.exam_id}-${attempt.attempt_number}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{examReport.exam_title}</div>
                              <div className="text-xs text-gray-500">{examReport.attempts_remaining} attempts remaining</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">Attempt {attempt.attempt_number}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{formatDate(attempt.attempt_date)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${getScoreColor(attempt.score_percentage)}`}>
                                {attempt.score_percentage}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{attempt.obtained_marks}/{attempt.max_marks}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{attempt.correct_answers}/{attempt.total_questions}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {attempt.passed ? 'Passed' : 'Failed'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {examReport.improvement_percentage !== null && index === examReport.attempts.length - 1 ? (
                                <div className={`text-sm font-medium ${
                                  examReport.improvement_percentage > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {examReport.improvement_percentage > 0 ? '+' : ''}{examReport.improvement_percentage}%
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">-</div>
                            )}
                          </td>
                        </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                </div>
            )}
        </div>
      </div>
    </MainLayout>
  );
};

export default StudentPerformanceReports; 