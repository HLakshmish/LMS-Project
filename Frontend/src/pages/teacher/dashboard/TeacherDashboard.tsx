import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import DashboardStats from '../../../components/dashboard/DashboardStats';
import RecentActivity from '../../../components/dashboard/RecentActivity';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
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

interface Course {
  id: string;
  name: string;
  description: string;
  status: string;
  studentCount: number;
  progress: number;
}

interface Exam {
  id: string;
  title: string;
  description: string;
}

const TeacherDashboard: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const { token } = useAuth();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [totalCourses, setTotalCourses] = useState<number>(0);
  const [totalExams, setTotalExams] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<string>('last_month');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/reports/dashboard?time_period=${timePeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses/my-courses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const data = await response.json();
      setCourses(data);
      
      // Fetch total courses count
      const totalCoursesResponse = await fetch(`${API_URL}/api/courses/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!totalCoursesResponse.ok) {
        throw new Error('Failed to fetch total courses');
      }
      
      const totalCoursesData = await totalCoursesResponse.json();
      setTotalCourses(totalCoursesData.length || 0);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await fetch(`${API_URL}/api/exams/exams/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch exams');
      }
      
      const data = await response.json();
      setTotalExams(data.length || 0);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        fetchDashboardData(),
        fetchCourses(),
        fetchExams()
      ]);
    };
    
    fetchAllData();
  }, [token, timePeriod]);

  const handleTimePeriodChange = (period: string) => {
    setTimePeriod(period);
  };

  const quickActions = [
    {
      title: 'Create Exam',
      icon: (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      link: '/teacher/exams/create',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Upload Content',
      icon: (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      link: '/teacher/content',
      color: 'bg-green-100 text-green-700',
    },
    {
      title: 'Add Question',
      icon: (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      link: '/teacher/questions/create',
      color: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'Create Course',
      icon: (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
      link: '/teacher/courses/create',
      color: 'bg-amber-100 text-amber-700',
    },
  ];
  
  const generateStats = () => {
    if (!dashboardData) return [];
    
    return [
      {
        title: 'Total Students',
        value: dashboardData.total_students,
        icon: (
          <div className="rounded-md bg-blue-500 p-3">
            <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        ),
      },
      {
        title: 'Created Courses',
        value: totalCourses,
        icon: (
          <div className="rounded-md bg-green-500 p-3">
            <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
            </svg>
          </div>
        ),
      },
      {
        title: 'Total Exams',
        value: totalExams,
        icon: (
          <div className="rounded-md bg-amber-500 p-3">
            <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        ),
      },
      {
        title: 'Average Score',
        value: `${dashboardData.average_score}%`,
        icon: (
          <div className="rounded-md bg-purple-500 p-3">
            <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        ),
      },
    ];
  };
  
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
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
        <p className="text-gray-600">Here's what's happening with your teaching activities.</p>
      </div>

      {/* Time Period Filter */}
      <div className="mb-6 flex justify-end">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => handleTimePeriodChange('last_week')}
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
            onClick={() => handleTimePeriodChange('last_month')}
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
            onClick={() => handleTimePeriodChange('last_year')}
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
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : (
        <>
          <DashboardStats stats={generateStats()} />

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.link}>
                <Card className="h-full hover:shadow-md transition-shadow duration-200">
                  <div className="p-4 flex flex-col items-center text-center">
                    <div className={`rounded-full p-3 mb-4 ${action.color}`}>
                      {action.icon}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{action.title}</h3>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recent Exams Section */}
            <div className="lg:col-span-2">
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
                      {dashboardData?.recent_exams.map(exam => (
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
                            <Link to={`/teacher/exams/${exam.id}`} className="text-blue-600 hover:text-blue-900">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {dashboardData?.recent_exams.length === 0 && (
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

            {/* Top Performers Section */}
            <div>
              <Card title="Top Performing Students">
                <div className="space-y-4">
                  {dashboardData?.top_performers.map(student => (
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
                  {dashboardData?.top_performers.length === 0 && (
                    <div className="py-4 text-center text-sm text-gray-500">
                      No top performers data available
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
};

export default TeacherDashboard;
