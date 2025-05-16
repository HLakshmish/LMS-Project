import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import DashboardStats from '../../components/dashboard/DashboardStats';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useCourse } from '../../contexts/CourseContext';
import StudentSidebar from './components/StudentSidebar';
import axios from 'axios';
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
  student_id: number;
  exam_id: number;
  status: string;
  id: number;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string | null;
  student: {
    email: string;
    username: string;
    role: string;
    id: number;
    full_name: string;
    created_at: string;
    updated_at: string | null;
    last_login: string | null;
  };
  exam: {
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
    creator: {
      username: string;
      email: string;
      id: number;
      role: string;
      created_at: string;
      updated_at: string | null;
    };
  };
  score?: number;
}

interface ContentItem {
  id: number;
  title: string;
  description: string;
  type: string;
  url: string;
  course: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string | null;
  creator?: {
    username: string;
  };
}

interface PerformanceStats {
  totalExams: number;
  averageScore: number;
  bestScore: number;
  totalAttempts: number;
  passedExams: number;
  completedExams: number;
  upcomingExams: number;
  inProgressExams: number;
}

interface Course {
  id: number;
  name: string;
  description: string;
  duration: number;
  is_active: boolean;
  level: string;
  created_at: string;
  updated_at: string | null;
}

interface Package {
  id: number;
  courses: Course[];
}

interface SubscriptionPlanPackage {
  id: number;
  packages: Package[];
}

interface Subscription {
  id: number;
  subscription_plan_package: SubscriptionPlanPackage;
}

interface ExamAttempt {
  id: number;
  exam: {
    id: number;
    name: string;
  };
  score: number;
  status: string;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

interface ExamReport {
  exam_id: number;
  exam_title: string;
  student_id: number;
  student_name: string;
  total_attempts: number;
  avg_score: number;
  best_score: number;
  attempts_remaining: number;
  max_attempts: number;
  attempts: {
    attempt_number: number;
    score_percentage: number;
    obtained_marks: number;
    max_marks: number;
    total_questions: number;
    correct_answers: number;
    passed: boolean;
    attempt_date: string;
  }[];
  improvement_percentage: number | null;
}

interface UpcomingExam {
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
  };
}

const getAuthHeaders = () => ({
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

const Dashboard: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const { courses, fetchUserCourses } = useCourse();
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscribedCourseCount, setSubscribedCourseCount] = useState(0);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    totalExams: 0,
    averageScore: 0,
    bestScore: 0,
    totalAttempts: 0,
    passedExams: 0,
    completedExams: 0,
    upcomingExams: 0,
    inProgressExams: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID not found');
        }

        await Promise.all([
          fetchSubscriptionData(userId),
          fetchExamData(),
          fetchRecentContent(),
          fetchPerformanceData(userId)
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchSubscriptionData = async (userId: number) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/subscriptions/subscriptions/user/${userId}/active`,
        getAuthHeaders()
      );

      // Extract unique courses from all active subscriptions
      const uniqueCourses = new Set();
      response.data.forEach((subscription: Subscription) => {
        subscription.subscription_plan_package.packages.forEach((pkg) => {
          pkg.courses.forEach((course) => {
            uniqueCourses.add(course.id);
          });
        });
      });

      setPerformanceStats(prev => ({
        ...prev,
        totalExams: uniqueCourses.size // Update with actual number of unique courses
      }));

    } catch (err) {
      console.error('Error fetching subscription data:', err);
    }
  };

  const fetchExamData = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        console.error('User ID not found');
        return;
      }

      // Fetch exam attempts data
      const response = await axios.get<ExamReport[]>(
        `${API_URL}/api/reports/student/${userId}/attempts`,
        getAuthHeaders()
      );

      const examReports = response.data;
      
      // Calculate metrics
      const completedExams = examReports.length;
      const passedExams = examReports.filter((report: ExamReport) => 
        report.attempts.some((attempt) => attempt.passed)
      ).length;
      
      // Calculate overall average score
      const avgScore = examReports.length > 0
        ? examReports.reduce((sum: number, report: ExamReport) => sum + report.avg_score, 0) / examReports.length
        : 0;

      // Fetch upcoming exams
      const examsResponse = await axios.get<UpcomingExam[]>(
        `${API_URL}/api/exams/exams/`,
        getAuthHeaders()
      );

      // Get latest 3 upcoming exams sorted by start date
      const currentDate = new Date();
      const upcomingExamsList = (examsResponse.data || [])
        .filter((exam: UpcomingExam) => exam && exam.start_datetime && new Date(exam.start_datetime) > currentDate)
        .sort((a: UpcomingExam, b: UpcomingExam) => 
          new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
        )
        .slice(0, 3);

      setUpcomingExams(upcomingExamsList);

      setPerformanceStats(prev => ({
        ...prev,
        completedExams,
        passedExams,
        averageScore: Math.round(avgScore * 100) / 100, // Round to 2 decimal places
        upcomingExams: upcomingExamsList.length
      }));

    } catch (error) {
      console.error('Error fetching exam data:', error);
      // Set default values in case of error
      setUpcomingExams([]);
      setPerformanceStats(prev => ({
        ...prev,
        completedExams: 0,
        passedExams: 0,
        averageScore: 0,
        upcomingExams: 0
      }));
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        console.error('User ID not found');
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/subscriptions/subscriptions/user/${userId}/active`,
        getAuthHeaders()
      );

      // Extract unique courses from all active subscriptions
      const allCourses = response.data.reduce((acc: Course[], subscription: any) => {
        if (subscription.subscription_plan_package && 
            subscription.subscription_plan_package.packages) {
          subscription.subscription_plan_package.packages.forEach((pkg: any) => {
            if (pkg.courses) {
              acc.push(...pkg.courses);
            }
          });
        }
        return acc;
      }, []);

      // Remove duplicates based on course ID
      const uniqueCourses = Array.from(
        new Map(allCourses.map((course: Course) => [course.id, course])).values()
      );

      setPerformanceStats(prev => ({
        ...prev,
        totalExams: uniqueCourses.length
      }));

    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
  };

  const fetchRecentContent = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      const subscriptionResponse = await axios.get(
        `${API_URL}/api/subscriptions/subscriptions/user/${userId}/active`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const subscribedCourseIds = new Set(
        subscriptionResponse.data.reduce((acc: number[], subscription: any) => {
          if (subscription.subscription_plan_package?.packages) {
            subscription.subscription_plan_package.packages.forEach((pkg: any) => {
              if (pkg.courses) {
                acc.push(...pkg.courses.map((course: any) => course.id));
              }
            });
          }
          return acc;
        }, [])
      );

      const contentResponse = await axios.get(`${API_URL}/api/content/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const filteredContent = contentResponse.data
        .filter((content: ContentItem) => content.course && subscribedCourseIds.has(content.course.id))
        .sort((a: ContentItem, b: ContentItem) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 3);

      setRecentContent(filteredContent);
    } catch (error) {
      console.error('Failed to fetch recent content:', error);
    }
  };

  const fetchPerformanceData = async (userId: number) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/reports/student/${userId}/attempts`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Additional performance metrics can be calculated here if needed
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  };

  const getUserId = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        return parsedUser.id;
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  };

  const stats = [
    {
      title: 'Enrolled Courses',
      value: subscribedCourseCount,
      icon: (
        <div className="rounded-md bg-blue-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Average Score',
      value: `${performanceStats.averageScore.toFixed(1)}%`,
      icon: (
        <div className="rounded-md bg-green-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Upcoming Exams',
      value: performanceStats.upcomingExams,
      icon: (
        <div className="rounded-md bg-purple-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Completed Exams',
      value: performanceStats.completedExams,
      icon: (
        <div className="rounded-md bg-yellow-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Passed Exams',
      value: performanceStats.passedExams,
      icon: (
        <div className="rounded-md bg-indigo-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
      ),
    }
  ];

  if (isLoading) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="min-h-screen bg-gray-50">
        {/* Welcome Section */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600">Here's what's happening with your learning journey.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6">
          {/* Enrolled Courses */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-blue-600 text-sm font-medium">Enrolled Courses</p>
                <p className="text-2xl font-semibold text-gray-900">{performanceStats.totalExams || 0}</p>
              </div>
              <div className="ml-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-green-600 text-sm font-medium">Average Score</p>
                <p className="text-2xl font-semibold text-gray-900">{performanceStats.averageScore || 0}%</p>
              </div>
              <div className="ml-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Completed Exams */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-purple-600 text-sm font-medium">Completed Exams</p>
                <p className="text-2xl font-semibold text-gray-900">{performanceStats.completedExams || 0}</p>
              </div>
              <div className="ml-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Passed Exams */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-yellow-600 text-sm font-medium">Passed Exams</p>
                <p className="text-2xl font-semibold text-gray-900">{performanceStats.passedExams || 0}</p>
              </div>
              <div className="ml-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid - Horizontal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 px-6 pb-6">
          {/* Recent Content Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Content</h2>
                <p className="text-sm text-gray-500">Latest learning materials</p>
              </div>
              <div className="space-y-4">
                {recentContent.map((content) => (
                  <div
                    key={content.id}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition cursor-pointer"
                    onClick={() => {
                      if (content.url) {
                        window.open(content.url, '_blank');
                      }
                    }}
                  >
                    <div className="flex items-start">
                      <div className="mr-4">
                        {content.type === 'video' ? (
                          <div className="rounded-md bg-blue-100 p-2">
                            <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="rounded-md bg-gray-100 p-2">
                            <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{content.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{content.description}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-400">
                          <span>{new Date(content.created_at).toLocaleDateString()}</span>
                          {content.creator && (
                            <>
                              <span className="mx-2">•</span>
                              <span>By {content.creator.username}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!recentContent || recentContent.length === 0) && (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No content available</h3>
                    <p className="mt-1 text-sm text-gray-500">Check back later for new content.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Exams Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Exams</h2>
                <p className="text-sm text-gray-500">Your next scheduled examinations</p>
              </div>
              <div className="space-y-4">
                {upcomingExams.map((exam) => (
                  <div key={exam.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{exam.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(exam.start_datetime).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {exam.duration_minutes} minutes
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {upcomingExams.length === 0 && (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming exams</h3>
                    <p className="mt-1 text-sm text-gray-500">Check back later for scheduled exams.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard; 