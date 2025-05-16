import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MainLayout, AdminSidebar } from '../../components/layout';
import DashboardStats from '../../components/dashboard/DashboardStats';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface DashboardData {
  total_students: number;
  total_exams: number;
  average_score: number;
  recent_exams: RecentExam[];
  top_performers: TopPerformer[];
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

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string | null;
}

interface Subscription {
  id: number;
  status: string;
  created_at: string;
  updated_at: string | null;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const AdminDashboard: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [userStats, setUserStats] = useState({
    total: 0,
    students: 0,
    teachers: 0,
    admins: 0,
    loading: true,
    error: null as string | null
  });

  const [subscriptionStats, setSubscriptionStats] = useState({
    total: 0,
    active: 0,
    loading: true,
    error: null as string | null
  });

  const [totalExams, setTotalExams] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<string>('last_month');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/reports/dashboard?time_period=${timePeriod}`, getAuthHeaders());
        setDashboardData(response.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUserStats = async () => {
      try {
        const response = await axios.get<User[]>(`${API_URL}/api/users/`, getAuthHeaders());
        const users = response.data;
        
        // Calculate user statistics
        const totalUsers = users.length;
        const teachers = users.filter(user => user.role === 'teacher').length;
        const students = users.filter(user => user.role === 'student').length;
        const admins = users.filter(user => user.role === 'admin').length;

        setUserStats({
          total: totalUsers,
          students: students,
          teachers: teachers,
          admins: admins,
          loading: false,
          error: null
        });
      } catch (error) {
        setUserStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch user statistics'
        }));
      }
    };

    const fetchSubscriptionStats = async () => {
      try {
        const response = await axios.get<Subscription[]>(`${API_URL}/api/subscriptions/subscriptions/`, getAuthHeaders());
        const subscriptions = response.data;
        
        // Calculate subscription statistics
        const totalSubscriptions = subscriptions.length;
        const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;

        setSubscriptionStats({
          total: totalSubscriptions,
          active: activeSubscriptions,
          loading: false,
          error: null
        });
      } catch (error) {
        setSubscriptionStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch subscription statistics'
        }));
      }
    };

    const fetchExams = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/exams/exams/`, getAuthHeaders());
        setTotalExams(response.data.length || 0);
      } catch (error) {
        console.error('Error fetching exams:', error);
      }
    };

    fetchDashboardData();
    fetchUserStats();
    fetchSubscriptionStats();
    fetchExams();
  }, [timePeriod]);

  // Updated stats array using dashboard API data
  const stats = [
    {
      title: 'Total Students',
      value: isLoading || !dashboardData ? '-' : dashboardData.total_students,
      icon: (
        <div className="rounded-md bg-blue-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      ),
      change: {
        value: userStats.loading ? '-' : `${userStats.students} registered`,
        isPositive: true,
      },
    },
    {
      title: 'Total Exams',
      value: totalExams || '-',
      icon: (
        <div className="rounded-md bg-amber-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      ),
      change: {
        value: isLoading || !dashboardData ? '-' : `${dashboardData.recent_exams.length} recent`,
        isPositive: true,
      },
    },
    {
      title: 'Average Score',
      value: isLoading || !dashboardData ? '-' : `${dashboardData.average_score}%`,
      icon: (
        <div className="rounded-md bg-purple-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      ),
      change: {
        value: 'Overall performance',
        isPositive: true,
      },
    },
    {
      title: 'Active Subscriptions',
      value: subscriptionStats.loading ? '-' : subscriptionStats.active,
      icon: (
        <div className="rounded-md bg-green-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
      ),
      change: {
        value: `${subscriptionStats.total} total`,
        isPositive: true,
      },
    }
  ];

  // Updated userRoleDistribution using real data
  const userRoleDistribution = [
    { role: 'Students', count: userStats.students, color: 'bg-blue-500' },
    { role: 'Teachers', count: userStats.teachers, color: 'bg-green-500' },
    { role: 'Admins', count: userStats.admins, color: 'bg-purple-500' },
  ];

  const quickActions = [
    {
      title: 'Manage Users',
      icon: (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      link: '/admin/users',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Manage Courses',
      icon: (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
      link: '/admin/courses',
      color: 'bg-green-100 text-green-700',
    },
    {
      title: 'Manage Subscriptions',
      icon: (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      link: '/admin/subscriptions',
      color: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'System Settings',
      icon: (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      link: '/settings',
      color: 'bg-amber-100 text-amber-700',
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="mb-8 bg-blue-500 rounded-lg shadow-md p-6 mx-8 mt-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-white">Welcome back, {user.name}!</h1>
            {error && (
              <div className="mt-2 text-sm bg-red-50 text-red-600 p-2 rounded-md">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-8 pb-6">
          <div className="max-w-7xl mx-auto">
            {/* Time Period Filter */}
            <div className="mb-6 flex justify-end">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setTimePeriod('last_week')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                    timePeriod === 'last_week' 
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } border border-gray-300`}
                >
                  Last Week
                </button>
                <button
                  type="button"
                  onClick={() => setTimePeriod('last_month')}
                  className={`px-4 py-2 text-sm font-medium ${
                    timePeriod === 'last_month' 
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } border-t border-b border-gray-300`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => setTimePeriod('last_year')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                    timePeriod === 'last_year' 
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } border border-gray-300`}
                >
                  Last Year
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <DashboardStats stats={stats} />

                {/* Quick Actions Section */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <Link key={index} to={action.link}>
                      <Card className="h-full hover:shadow-md transition-shadow duration-200">
                        <div className="p-3 flex flex-col items-center text-center">
                          <div className={`rounded-full p-2 mb-2 ${action.color}`}>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {action.icon.props.children}
                            </svg>
                          </div>
                          <h3 className="text-base font-medium text-gray-900">{action.title}</h3>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* User Distribution and System Status Section */}
                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card title="User Distribution">
                    <div className="space-y-4">
                      {userRoleDistribution.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">{item.role}</span>
                            <span className="text-sm text-gray-500">{item.count}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`${item.color} h-2.5 rounded-full`}
                              style={{ width: `${(item.count / userRoleDistribution.reduce((acc, curr) => acc + curr.count, 0)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}           
                    </div>
                    <div className="mt-6">
                      <Link to="/admin/users">
                        <Button variant="light" fullWidth className="text-blue-600 hover:bg-blue-50">
                          View all users
                        </Button>
                      </Link>
                    </div>
                  </Card>

                  {dashboardData && (
                    <Card title="Top Performing Students">
                      <div className="space-y-4">
                        {dashboardData.top_performers.map(student => (
                          <div key={student.student_id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                            <div className="flex justify-between">
                              <h4 className="text-base font-medium text-gray-900">{student.name}</h4>
                              <span className="text-sm font-medium text-green-600">{student.average_score.toFixed(2)}%</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {student.total_exams} exams completed
                            </p>
                            <div className="mt-1 text-xs text-gray-500">
                              Last exam: {formatDate(student.last_exam_date)}
                            </div>
                          </div>
                        ))}
                        {dashboardData.top_performers.length === 0 && (
                          <div className="py-4 text-center text-sm text-gray-500">
                            No top performers data available
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>

                {dashboardData && (
                  <div className="mt-8">
                    <Card title="Recent Exams">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Exam Title
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Attempts
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Average Score
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {dashboardData.recent_exams.map(exam => (
                              <tr key={exam.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {exam.title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {exam.total_attempts}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {exam.average_score.toFixed(2)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <Link to={`/admin/exams/${exam.id}`} className="text-blue-600 hover:text-blue-900">
                                    View
                                  </Link>
                                </td>
                              </tr>
                            ))}
                            {dashboardData.recent_exams.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                  No recent exams found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;