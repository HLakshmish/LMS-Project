import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import DashboardStats from '../../components/dashboard/DashboardStats';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const StudentDashboard: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  // Mock data for demonstration
  const stats = [
    {
      title: 'Upcoming Exams',
      value: 3,
      icon: (
        <div className="rounded-md bg-purple-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Recent Results',
      value: '85%',
      icon: (
        <div className="rounded-md bg-green-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      ),
      change: {
        value: '12%',
        isPositive: true,
      },
    },
    {
      title: 'Course Progress',
      value: '68%',
      icon: (
        <div className="rounded-md bg-blue-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      ),
      change: {
        value: '5%',
        isPositive: true,
      },
    },
    {
      title: 'Subscription',
      value: 'Premium',
      icon: (
        <div className="rounded-md bg-amber-500 p-3">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
      ),
    },
  ];

  const activities = [
    {
      id: '1',
      type: 'exam' as const,
      title: 'Mathematics Final',
      description: 'You completed',
      timestamp: '2 hours ago',
      link: '/exams/123/results',
    },
    {
      id: '2',
      type: 'course' as const,
      title: 'Introduction to Physics',
      description: 'You enrolled in',
      timestamp: '1 day ago',
      link: '/courses/456',
    },
    {
      id: '3',
      type: 'content' as const,
      title: 'Chemistry Formulas PDF',
      description: 'You viewed',
      timestamp: '3 days ago',
      link: '/content/789',
    },
    {
      id: '4',
      type: 'subscription' as const,
      title: 'Premium Plan',
      description: 'Your subscription was renewed for',
      timestamp: '1 week ago',
    },
  ];

  const upcomingExams = [
    {
      id: '1',
      title: 'Biology Mid-term',
      date: 'Apr 15, 2025',
      time: '10:00 AM',
      duration: 60,
    },
    {
      id: '2',
      title: 'Chemistry Quiz',
      date: 'Apr 18, 2025',
      time: '2:30 PM',
      duration: 30,
    },
    {
      id: '3',
      title: 'Physics Lab Test',
      date: 'Apr 22, 2025',
      time: '9:00 AM',
      duration: 90,
    },
  ];

  const recommendedContent = [
    {
      id: '1',
      title: 'Algebra Fundamentals',
      type: 'video',
      subject: 'Mathematics',
    },
    {
      id: '2',
      title: 'Chemical Reactions',
      type: 'document',
      subject: 'Chemistry',
    },
    {
      id: '3',
      title: 'Newton\'s Laws of Motion',
      type: 'pdf',
      subject: 'Physics',
    },
  ];

  // Sidebar content for student dashboard
  const sidebarContent = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Main
        </h3>
        <div className="mt-2 space-y-1">
          <Link to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600">
            Dashboard
          </Link>
          <Link to="/courses" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100">
            My Courses
          </Link>
          <Link to="/exams" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100">
            My Exams
          </Link>
          <Link to="/content" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100">
            Learning Materials
          </Link>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Account
        </h3>
        <div className="mt-2 space-y-1">
          <Link to="/profile" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100">
            Profile
          </Link>
          <Link to="/subscription" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100">
            Subscription
          </Link>
          <Link to="/settings" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100">
            Settings
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={sidebarContent}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
        <p className="text-gray-600">Here's what's happening with your learning journey.</p>
      </div>

      <DashboardStats stats={stats} />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} />
        </div>
        <div>
          <Card title="Upcoming Exams">
            <div className="space-y-4">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <h4 className="text-base font-medium text-gray-900">{exam.title}</h4>
                  <div className="mt-1 flex justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{exam.date}</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{exam.time} ({exam.duration} min)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to="/exams">
                <Button variant="light" fullWidth>
                  View all exams
                </Button>
              </Link>
            </div>
          </Card>

          <Card title="Recommended Content" className="mt-6">
            <div className="space-y-4">
              {recommendedContent.map((content) => (
                <div key={content.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <h4 className="text-base font-medium text-gray-900">{content.title}</h4>
                  <div className="mt-1 flex justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>{content.subject}</span>
                    </div>
                    <div className="capitalize text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {content.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to="/content">
                <Button variant="light" fullWidth>
                  View all content
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default StudentDashboard;
