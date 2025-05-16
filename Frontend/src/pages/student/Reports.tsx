import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
import { useAuth } from '../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Exam {
  id: number;
  title: string;
  duration: number;
  start_date: string;
  end_date: string | null;
  status: string;
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

const Reports: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examReports, setExamReports] = useState<ExamAttemptReport[]>([]);
  const [timePeriod, setTimePeriod] = useState<string>('last_month');
  const [filteredAttempts, setFilteredAttempts] = useState<ExamAttemptReport[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  const timePeriodOptions = [
    { value: 'last_week', label: 'Last Week', days: 7 },
    { value: 'last_month', label: 'Last Month', days: 30 },
    { value: 'last_3_months', label: 'Last 3 Months', days: 90 },
    { value: 'last_6_months', label: 'Last 6 Months', days: 180 },
    { value: 'last_year', label: 'Last Year', days: 365 },
    { value: 'all', label: 'All Time', days: 0 }
  ];

  useEffect(() => {
    if (authUser?.id) {
      fetchExams();
      fetchReportData();
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (examReports.length > 0) {
      let filtered = [...examReports];

      // Filter by selected exam if one is selected
      if (selectedExamId) {
        filtered = filtered.filter(report => report.exam_id === selectedExamId);
        if (filtered.length === 0) {
          setError('No attempts found for the selected exam.');
      return;
        }
    }

      // Apply time period filter
      const selectedPeriod = timePeriodOptions.find(option => option.value === timePeriod);
      if (selectedPeriod && selectedPeriod.days !== 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedPeriod.days);

        filtered = filtered.map(report => ({
          ...report,
          attempts: report.attempts.filter(attempt => {
            const attemptDate = new Date(attempt.attempt_date);
            return attemptDate >= cutoffDate;
          })
        })).filter(report => report.attempts.length > 0);
      }

      if (filtered.length === 0) {
        setError(selectedExamId 
          ? 'No attempts found for the selected exam in this time period.' 
          : 'No exam attempts found for the selected time period.'
        );
      } else {
        setError(null);
      }

      setFilteredAttempts(filtered);
    } else {
      setFilteredAttempts([]);
      setError('No exam attempts found.');
    }
  }, [timePeriod, examReports, selectedExamId]);

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/exams/exams/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setExams(response.data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/reports/student/${authUser?.id}/attempts`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
            );

      setExamReports(response.data);
      setFilteredAttempts(response.data);
    } catch (err) {
      setError('Failed to fetch report data');
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value);
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedExamId(value ? Number(value) : null);
    setError(null); // Clear any existing error when changing exam
  };

  const handleClearFilters = () => {
    setSelectedExamId(null);
    setTimePeriod('all');
    setError(null);
  };

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

  if (loading) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
      <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Performance Report</h1>
            <p className="text-gray-600">View your exam performance and analytics</p>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="exam-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Exam
                </label>
                <select
                  id="exam-select"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={selectedExamId || ''}
                  onChange={handleExamChange}
                >
                  <option value="">All Exams</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="time-period" className="block text-sm font-medium text-gray-700 mb-2">
                  Time Period
                </label>
                <select
                  id="time-period"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={timePeriod}
                  onChange={(e) => handleTimePeriodChange(e.target.value)}
                >
                  {timePeriodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
          </div>
        </div>
      </div>
      
          {/* Navigation Links */}
          <div className="mb-6 flex space-x-6">
          <a
            href="#overall-performance"
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Overall Performance
          </a>
          <a
            href="#exam-history"
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
              Exam History
          </a>
      </div>
      
      {error ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No Results Found</h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">{error}</p>
              {(selectedExamId || timePeriod !== 'all') && (
                <div className="mt-4">
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
        </div>
          ) : filteredAttempts.length > 0 ? (
      <div className="space-y-6">
              {/* Overall Performance Section */}
          <div id="overall-performance">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Exams</p>
                    <p className="text-2xl font-bold text-blue-700">{filteredAttempts.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Average Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(
                      filteredAttempts.reduce((acc, curr) => acc + curr.avg_score, 0) / filteredAttempts.length
                    )}`}>
                      {(filteredAttempts.reduce((acc, curr) => acc + curr.avg_score, 0) / filteredAttempts.length).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Best Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(
                      Math.max(...filteredAttempts.map(report => report.best_score))
                    )}`}>
                      {Math.max(...filteredAttempts.map(report => report.best_score))}%
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Attempts</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {filteredAttempts.reduce((acc, curr) => acc + curr.total_attempts, 0)}
                    </p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Passed Exams</p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {filteredAttempts.filter(report => 
                        report.attempts.some(attempt => attempt.passed)
                      ).length}
                    </p>
                </div>
                </div>
              </div>

              {/* Exam History Section */}
              <div id="exam-history" className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Exam History
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({filteredAttempts.reduce((acc, curr) => acc + curr.attempts.length, 0)} attempts)
                    </span>
                  </h2>
                </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempt</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Improvement</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAttempts.map((report) => (
                        report.attempts.map((attempt, index) => (
                          <tr key={`${report.exam_id}-${attempt.attempt_number}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{report.exam_title}</div>
                              <div className="text-xs text-gray-500">
                                {report.attempts_remaining} attempts remaining
                              </div>
                            </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">Attempt {attempt.attempt_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                                {formatDate(attempt.attempt_date)}
                            </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${getScoreColor(attempt.score_percentage)}`}>
                                {attempt.score_percentage}% ({attempt.obtained_marks}/{attempt.max_marks})
                    </div>
                  </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                                {attempt.correct_answers}/{attempt.total_questions} correct
                            </div>
                  </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {attempt.passed ? 'Passed' : 'Failed'}
                            </span>
                  </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {report.improvement_percentage !== null && index === report.attempts.length - 1 ? (
                                <div className={`text-sm font-medium ${
                                  report.improvement_percentage > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {report.improvement_percentage > 0 ? '+' : ''}{report.improvement_percentage}%
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
          ) : null}
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports; 