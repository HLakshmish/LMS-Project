import React, { useState, useEffect } from 'react';
import AdminSidebar from '../AdminSidebar';
import { MainLayout } from '../../../components/layout';
import Card from '../../../components/ui/Card';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
    [key: string]: any;
  };
  onLogout: () => void;
}

interface RecentExam {
  id: number;
  title: string;
  total_attempts: number;
  average_score: number;
}

interface TopPerformer {
  student_id: number;
  name: string;
  total_exams: number;
  average_score: number;
  last_exam_date: string;
}

interface DashboardStats {
  total_students: number;
  total_exams: number;
  average_score: number;
  recent_exams: RecentExam[];
  top_performers: TopPerformer[];
}

const TIME_PERIODS = [
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AssessmentReports: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [timePeriod, setTimePeriod] = useState('last_month');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError('Authentication required. Please login.');
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/reports/dashboard?time_period=${timePeriod}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (res.status === 401) throw new Error('Authentication failed. Please login again.');
        if (!res.ok) throw new Error('Failed to fetch dashboard stats');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
        if (err.message.includes('Authentication failed')) {
          onLogout();
        }
      });
  }, [timePeriod, onLogout]);

  // Prepare chart data from the API response
  const prepareExamScoreData = () => {
    if (!stats?.recent_exams) return [];
    return stats.recent_exams.map((exam) => ({
      name: exam.title.length > 15 ? exam.title.substring(0, 15) + '...' : exam.title,
      attempts: exam.total_attempts,
      score: exam.average_score,
    }));
  };

  // Prepare pie chart data for attempts distribution
  const prepareAttemptsDistribution = () => {
    if (!stats?.recent_exams) return [];
    return stats.recent_exams.map((exam) => ({
      name: exam.title.length > 12 ? exam.title.substring(0, 12) + '...' : exam.title,
      value: exam.total_attempts,
    }));
  };

  // Score distribution by performer
  const preparePerformerData = () => {
    if (!stats?.top_performers) return [];
    return stats.top_performers.map((performer) => ({
      name: performer.name.length > 12 ? performer.name.substring(0, 12) + '...' : performer.name,
      score: performer.average_score,
      exams: performer.total_exams,
    }));
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const exportToExcel = () => {
    if (!stats) return;

    // Prepare Recent Assessments data
    const recentAssessmentsData = stats.recent_exams.map(exam => ({
      'Assessment Title': exam.title,
      'Total Attempts': exam.total_attempts,
      'Average Score (%)': exam.average_score,
      'Performance Status': exam.average_score >= 80 ? 'Good' : 
                          exam.average_score >= 60 ? 'Average' : 
                          'Needs Improvement'
    }));

    // Prepare Top Performers data
    const topPerformersData = stats.top_performers.map(performer => ({
      'Student Name': performer.name,
      'Total Exams': performer.total_exams,
      'Average Score (%)': performer.average_score,
      'Last Exam Date': new Date(performer.last_exam_date).toLocaleDateString()
    }));

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheets
    const wsAssessments = XLSX.utils.json_to_sheet(recentAssessmentsData);
    const wsPerformers = XLSX.utils.json_to_sheet(topPerformersData);

    // Add the worksheets to the workbook
    XLSX.utils.book_append_sheet(wb, wsAssessments, 'Recent Assessments');
    XLSX.utils.book_append_sheet(wb, wsPerformers, 'Top Performers');

    // Generate Excel file
    XLSX.writeFile(wb, 'assessment_reports.xlsx');
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
    <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="mb-8 bg-blue-500 rounded-lg shadow-md p-6 mx-8 mt-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Assessment Reports</h1>
              <p className="text-blue-100">Comprehensive analytics and performance metrics for all assessments</p>
            </div>
            <button
              onClick={exportToExcel}
              disabled={!stats || loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !stats || loading
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`}
            >
              Export to Excel
            </button>
          </div>
        </div>

        <div className="px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Filters Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Analytics Dashboard</h2>
                <p className="text-sm text-gray-500">Filter and visualize assessment data</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-gray-700 font-medium text-sm">Time Period:</label>
                <select
                  className="border rounded-md px-3 py-2 bg-white shadow-sm focus:ring focus:ring-blue-300 focus:border-blue-400 text-sm"
                  value={timePeriod}
                  onChange={e => setTimePeriod(e.target.value)}
                >
                  {TIME_PERIODS.map(period => (
                    <option key={period.value} value={period.value}>{period.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-3 text-gray-600">Loading assessment data...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {stats && !loading && (
              <>
                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card className="transform transition hover:scale-105 duration-300 border-t-4 border-blue-500">
                    <div className="flex items-center">
                      <div className="rounded-full bg-blue-100 p-3 mr-4">
                        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Students</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.total_students}</p>
                        <p className="text-xs text-blue-600 mt-1">Enrolled in assessments</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="transform transition hover:scale-105 duration-300 border-t-4 border-green-500">
                    <div className="flex items-center">
                      <div className="rounded-full bg-green-100 p-3 mr-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Assessments</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.total_exams}</p>
                        <p className="text-xs text-green-600 mt-1">Conducted in this period</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="transform transition hover:scale-105 duration-300 border-t-4 border-purple-500">
                    <div className="flex items-center">
                      <div className="rounded-full bg-purple-100 p-3 mr-4">
                        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Average Score</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.average_score}%</p>
                        <p className="text-xs text-purple-600 mt-1">Overall performance</p>
                      </div>
                    </div>
                  </Card>
                  </div>

                {/* Data Visualization Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Exam Performance Chart */}
                  <Card title="Assessment Performance">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={prepareExamScoreData()}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 60,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: 'none', 
                              borderRadius: '0.5rem',
                              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                            }} 
                          />
                          <Legend />
                          <Bar dataKey="score" name="Average Score (%)" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="attempts" name="Total Attempts" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                  </div>
                  </Card>
                  
                  {/* Distribution Pie Chart */}
                  <Card title="Attempts Distribution">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareAttemptsDistribution()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            innerRadius={30}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {prepareAttemptsDistribution().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => [`${value} attempts`, props.payload.name]}
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: 'none', 
                              borderRadius: '0.5rem',
                              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                  </div>
                  </Card>
                </div>

                {/* Top Performers Section with Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <Card title="Top Performer Analytics" className="lg:col-span-2">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={preparePerformerData()}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 60,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                          />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: 'none', 
                              borderRadius: '0.5rem',
                              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                            }} 
                          />
                          <Legend />
                          <Bar yAxisId="left" dataKey="score" name="Average Score (%)" fill="#8884d8" radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="right" dataKey="exams" name="Exams Taken" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="Top Performers" className="overflow-auto max-h-80">
                    <div className="space-y-4">
                      {stats.top_performers.map((student, index) => (
                        <div key={student.student_id} className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index < 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gray-500'}`}>
                            {index + 1}
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="font-medium text-gray-800">{student.name}</p>
                            <div className="flex items-center mt-1">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${student.average_score}%` }}></div>
                              </div>
                              <span className="ml-2 text-xs font-medium text-gray-600">{student.average_score}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Recent Exams Section */}
                <Card title="Recent Assessments Data" className="mb-8">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Attempts</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Score</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                      </tr>
                    </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.recent_exams.map(exam => (
                          <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{exam.total_attempts}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{exam.average_score}%</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center">
                                <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      exam.average_score >= 80 ? 'bg-green-500' : 
                                      exam.average_score >= 60 ? 'bg-yellow-500' : 
                                      'bg-red-500'
                                    }`} 
                                    style={{ width: `${exam.average_score}%` }}
                                  ></div>
                                </div>
                                <span className={`ml-2 text-xs font-medium ${
                                  exam.average_score >= 80 ? 'text-green-700' : 
                                  exam.average_score >= 60 ? 'text-yellow-700' : 
                                  'text-red-700'
                                }`}>
                                  {exam.average_score >= 80 ? 'Good' : 
                                   exam.average_score >= 60 ? 'Average' : 
                                   'Needs Improvement'}
                                </span>
                              </div>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AssessmentReports; 