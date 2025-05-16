import React, { useState, useEffect } from 'react';
import Navbar from '../../../components/layout/Navbar';
import AdminSidebar from '../AdminSidebar';
import * as XLSX from 'xlsx';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
    [key: string]: any;
  };
  onLogout: () => void;
}

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
  full_name: string;
  username: string;
  role: string;
  email: string;
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

const ExamAttemptsReport: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [report, setReport] = useState<ExamAttemptReport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDataFound, setNoDataFound] = useState(false);

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const exportToExcel = () => {
    if (!report || !selectedExam) return;

    // Prepare the data for export
    const attemptData = report.flatMap(studentReport => 
      studentReport.attempts.map(attempt => ({
        'Student Name': studentReport.student_name,
        'Attempt Number': attempt.attempt_number,
        'Date Taken': attempt.attempt_date,
        'Score (%)': attempt.score_percentage,
        'Obtained Marks': attempt.obtained_marks,
        'Maximum Marks': attempt.max_marks,
        'Total Questions': attempt.total_questions,
        'Correct Answers': attempt.correct_answers,
        'Status': attempt.passed ? 'Passed' : 'Failed',
        'Attempts Remaining': studentReport.attempts_remaining
      }))
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(attemptData);
    XLSX.utils.book_append_sheet(wb, ws, 'Exam Attempts');
    XLSX.writeFile(wb, `${selectedExam.title}_attempts_report.xlsx`);
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

    fetch(`${API_URL}/api/users/`, {
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
        // Filter only student users
        const studentUsers = data.filter((user: User) => user.role === 'student');
        setStudents(studentUsers);
        // Remove the automatic selection of first student
        setSelectedStudentId(null);
      })
      .catch(err => {
        setError(err.message);
        if (err.message.includes('Authentication failed')) {
          onLogout();
        }
      });
  }, [onLogout]);

  // Fetch exams list
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError('Authentication required. Please login.');
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_URL}/api/exams/exams/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
      .then(res => {
        if (res.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        if (!res.ok) throw new Error('Failed to fetch exams');
        return res.json();
      })
      .then(data => {
        setExams(data);
        if (data.length > 0) {
          setSelectedExamId(data[0].id);
        }
      })
      .catch(err => {
        setError(err.message);
        if (err.message.includes('Authentication failed')) {
          onLogout();
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [onLogout]);

  // Fetch exam report when selected exam or student changes
  useEffect(() => {
    if (!selectedExamId) return;

    const token = getAuthToken();
    if (!token) {
      setError('Authentication required. Please login.');
      return;
    }

    setLoading(true);
    setError(null);
    setNoDataFound(false);

    // Construct the URL based on whether a student is selected
    const url = selectedStudentId
      ? `${API_URL}/api/reports/exam/${selectedExamId}/attempts?student_id=${selectedStudentId}`
      : `${API_URL}/api/reports/exam/${selectedExamId}/attempts`;

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
        if (!data || (Array.isArray(data) && data.length === 0)) {
          setNoDataFound(true);
          setReport(null);
        } else {
          // If we're looking at a specific student, wrap the response in an array if it's not already
          const reportData = Array.isArray(data) ? data : [data];
          setReport(reportData);
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
  }, [selectedExamId, selectedStudentId, onLogout]);

  // Helper function to safely calculate average
  const calculateAverage = (data: ExamAttemptReport[] | null): string => {
    if (!data || data.length === 0) return '0';
    const avg = data.reduce((acc, curr) => acc + curr.avg_score, 0) / data.length;
    return avg.toFixed(1);
  };

  // Helper function to safely get best score
  const getBestScore = (data: ExamAttemptReport[] | null): string => {
    if (!data || data.length === 0) return '0';
    return Math.max(...data.map(r => r.best_score)).toString();
  };

  // Helper function to safely get total attempts
  const getTotalAttempts = (data: ExamAttemptReport[] | null): number => {
    if (!data || data.length === 0) return 0;
    return data.reduce((acc, curr) => acc + curr.total_attempts, 0);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex min-h-screen">
        <div className="w-64 bg-white border-r min-h-screen">
          <AdminSidebar />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-1">Exam Attempts Report</h1>
                <p className="text-gray-500">
                  {selectedExam ? (
                    <>
                      Detailed attempt analytics for <span className="font-semibold">{selectedExam.title}</span>
                      {selectedStudent && (
                        <> by <span className="font-semibold">{selectedStudent.full_name || selectedStudent.username}</span></>
                      )}
                    </>
                  ) : (
                    'Select an exam to view attempt reports'
                  )}
                </p>
              </div>
              {report && report.length > 0 && (
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to Excel
                </button>
              )}
            </div>

            {/* Filters Section */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="exam-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Exam
                </label>
                <select
                  id="exam-select"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={selectedExamId || ''}
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                >
                  <option value="">Select an exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student (Optional)
                </label>
                <select
                  id="student-select"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={selectedStudentId === null ? '' : selectedStudentId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedStudentId(value === '' ? null : Number(value));
                    setNoDataFound(false); // Reset no data found state when changing student
                    setError(null); // Reset any existing errors
                  }}
                >
                  <option value="">All Students</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name || student.username} ({student.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {!loading && !error && exams.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Exams Found</h3>
                <p className="mt-1 text-gray-500">There are no exams available in the system.</p>
              </div>
            )}

            {!loading && !error && selectedExam && noDataFound && (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Attempts Found</h3>
                <p className="mt-1 text-gray-500">
                  {selectedStudent ? (
                    `No attempts found for student "${selectedStudent.full_name || selectedStudent.username}" in exam "${selectedExam.title}".`
                  ) : (
                    `No attempts found for exam "${selectedExam.title}".`
                  )}
                </p>
              </div>
            )}

            {selectedExam && !loading && !error && (
              <>
                {/* Overall Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 mb-1">Total Students</span>
                      <span className="text-2xl font-bold text-blue-600">{report?.length || 0}</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 mb-1">Average Score</span>
                      <span className="text-2xl font-bold text-green-600">
                        {calculateAverage(report)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 mb-1">Best Score</span>
                      <span className="text-2xl font-bold text-orange-500">
                        {getBestScore(report)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 mb-1">Total Attempts</span>
                      <span className="text-2xl font-bold text-pink-600">
                        {getTotalAttempts(report)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student Attempts Table - Only show if there's data */}
                {report && report.length > 0 && (
                  <div className="bg-white p-6 rounded-xl shadow-sm mb-8 overflow-x-auto">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">Student Attempts</h2>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Attempt</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Score %</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Obtained/Max</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Correct</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Improvement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.map((studentReport) => (
                          studentReport.attempts.map((attempt, index) => (
                            <tr key={`${studentReport.student_id}-${attempt.attempt_number}`} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">{studentReport.student_name}</div>
                                <div className="text-xs text-gray-500">
                                  {studentReport.attempts_remaining} attempts remaining
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900">Attempt {attempt.attempt_number}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-500">
                                  {new Date(attempt.attempt_date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className={`text-sm font-medium ${
                                  attempt.score_percentage >= 80 ? 'text-green-600' :
                                  attempt.score_percentage >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {attempt.score_percentage}%
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900">
                                  {attempt.obtained_marks}/{attempt.max_marks}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-500">
                                  {attempt.correct_answers}/{attempt.total_questions}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {attempt.passed ? 'Passed' : 'Failed'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {studentReport.improvement_percentage !== null && index === studentReport.attempts.length - 1 ? (
                                  <div className={`text-sm font-medium ${
                                    studentReport.improvement_percentage > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {studentReport.improvement_percentage > 0 ? '+' : ''}{studentReport.improvement_percentage}%
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
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamAttemptsReport; 