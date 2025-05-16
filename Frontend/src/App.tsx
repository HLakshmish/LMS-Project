import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CourseProvider } from './contexts/CourseContext';
import { ErrorHandlingProvider } from './utils/errorHandling';
import PackagePage from './pages/admin/package/PackagePage';
import PackageMappingPage from './pages/admin/package/PackageMappingPage';
import StudentResults from './pages/admin/StudentResults';
import ExamAnswers from './pages/student/ExamAnswers';
import AssessmentReports from './pages/admin/reports/AssessmentReports';
import StudentPerformanceReports from './pages/admin/reports/StudentPerformanceReports';
import SubscriptionReports from './pages/admin/reports/SubscriptionReports';
import ExamAttemptsReport from './pages/admin/reports/ExamAttemptsReport';

// Direct imports for components that are having issues with lazy loading
import ExamTaking from './pages/student/ExamTaking';
import ExamResults from './pages/student/ExamResults';
import ExamResult from './pages/student/ExamResult';

// Define the common props interface for dashboard components
interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
    [key: string]: any;
  };
  onLogout: () => void;
}

// Lazy load pages instead of importing them directly
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Student pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StudentCourses = lazy(() => import('./pages/student/Courses')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const Exams = lazy(() => import('./pages/student/Exams')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StudentContent = lazy(() => import('./pages/student/Content')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
// const StudentPerformance = lazy(() => import('./pages/student/Performance')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StudentReports = lazy(() => import('./pages/student/Reports')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StudentSubscription = lazy(() => import('./pages/student/Subscription')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StudentAvailCourses = lazy(() => import('./pages/student/AvailCourses')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const CourseDetail = lazy(() => import('./pages/student/CourseDetail')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StudentProfile = lazy(() => import('./pages/student/StudentProfile')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StudentSetting = lazy(() => import('./pages/student/StudentSetting')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const ExamDetails = lazy(() => import('./pages/student/ExamDetails')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
// Teacher pages
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const ExamsPage = lazy(() => import('./pages/admin/ExamsPage'));
const CoursesPage = lazy(() => import('./pages/admin/CoursesPage'));
const Subscriptions = lazy(() => import('./pages/admin/Subscriptions'));

const AdminProfilePage = lazy(() => import('./pages/admin/AdminProfilePage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StreamPage = lazy(() => import('./pages/admin/stream/StreamPage'));
const ClassPage = lazy(() => import('./pages/admin/class/ClassPage'));
const SubjectPage = lazy(() => import('./pages/admin/subject/SubjectPage'));
const ChapterPage = lazy(() => import('./pages/admin/chapter/ChapterPage'));
const TopicPage = lazy(() => import('./pages/admin/topic/TopicPage'));
// const ExamAnalyticsPage = lazy(() => import('./pages/reports/ExamAnalyticsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
// const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherDashboard = lazy(() => import('./pages/teacher/dashboard/TeacherDashboard')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherStreamsPage = lazy(() => import('./pages/teacher/stream/TeacherStreamsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherClassesPage = lazy(() => import('./pages/teacher/class/TeacherClassesPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherCoursesPage = lazy(() => import('./pages/teacher/course/TeacherCoursesPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherCourseView = lazy(() => import('./pages/teacher/course/TeacherCourseView')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherCourseEdit = lazy(() => import('./pages/teacher/course/TeacherCourseEdit')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherCreateCoursePage = lazy(() => import('./pages/teacher/course/TeacherCreateCoursePage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherExamsPage = lazy(() => import('./pages/teacher/exam/TeacherExamsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherUploadContentPage = lazy(() => import('./pages/teacher/content/TeacherUploadContentPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherCreateExamPage = lazy(() => import('./pages/teacher/exam/TeacherCreateExamPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherExamView = lazy(() => import('./pages/teacher/exam/TeacherExamView')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherExamEdit = lazy(() => import('./pages/teacher/exam/TeacherExamEdit')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const AssignQuestionsPage = lazy(() => import('./pages/teacher/exam/AssignQuestionsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherQuestionsPage = lazy(() => import('./pages/teacher/question/TeacherQuestionsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherCreateQuestionPage = lazy(() => import('./pages/teacher/question/TeacherCreateQuestionPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherEditQuestionPage = lazy(() => import('./pages/teacher/question/TeacherEditQuestionPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherContentPage = lazy(() => import('./pages/teacher/content/TeacherContentPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherSettingsPage = lazy(() => import('./pages/teacher/TeacherSettingsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const ChapterList = lazy(() => import('./pages/teacher/chapter/ChapterList')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
// const StudentPerformancePage = lazy(() => import('./pages/student/Performance')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const StudentExamAnalyticsPage = lazy(() => import('./pages/student/Exams')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
// const TeacherExamAnalyticsPage = lazy(() => import('./pages/teacher/TeacherExamAnalyticsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherExamResults = lazy(() => import('./pages/teacher/exam/TeacherExamResults')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherSubjectsPage = lazy(() => import('./pages/teacher/subject/TeacherSubjectsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherCreateSubjectPage = lazy(() => import('./pages/teacher/subject/TeacherCreateSubjectPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
const TeacherTopicsPage = lazy(() => import('./pages/teacher/topic/TeacherTopicsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
// Shared pages
const SettingsPage = lazy(() => import('./pages/SettingsPage')) as React.LazyExoticComponent<React.FC<DashboardPageProps>>;
// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [] 
}) => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'student') {
      return <Navigate to="/student/dashboard" />;
    } else if (user.role === 'teacher') {
      return <Navigate to="/teacher/dashboard" />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" />;
    }
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// Dashboard wrapper component to provide common props
interface DashboardWrapperProps {
  children: React.ReactElement<any>;
}

const DashboardWrapper: React.FC<DashboardWrapperProps> = ({ children }) => {
  const { user, logout } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return React.cloneElement(children, {
    user: {
      name: user.name || user.email,
      role: user.role,
      avatar: user.avatar
    },
    onLogout: logout
  });
};

// Helper components for redirects with params
const CourseViewRedirect = () => {
  const { courseId } = useParams();
  return <Navigate to={`/teacher/courses/${courseId}/view`} replace />;
};

const CourseEditRedirect = () => {
  const { courseId } = useParams();
  return <Navigate to={`/teacher/courses/${courseId}/edit`} replace />;
};

const AppRoutes: React.FC = () => {
  const { user, logout } = useAuth();

  return (
              <Routes>
                {/* ===============================
                    PUBLIC ROUTES - Accessible without authentication 
                    =============================== */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                
                {/* ===============================
                    SHARED ROUTES - For authenticated users of any role
                    =============================== */}
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <DashboardWrapper>
                        <SettingsPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* ===============================
                    ADMIN ROUTES - For system administrators
                    =============================== */}
                {/* Admin Dashboard */}
                <Route 
                  path="/admin/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <AdminDashboard user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                {/* Admin Analytics Routes */}
                <Route 
                  path="/admin/student-results" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <StudentResults user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/reports/assessments" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <AssessmentReports user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/reports/performance" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <StudentPerformanceReports user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/reports/exam-attempts" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <ExamAttemptsReport user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/reports/subscriptions" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <SubscriptionReports user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                {/* Admin User Management */}
                <Route 
                  path="/admin/users" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UsersPage 
                        user={{
                          name: user?.username || '',
                          role: user?.role || 'admin',
                          avatar: user?.avatar
                        }}
                        onLogout={logout}
                      />
                    </ProtectedRoute>
                  } 
                />

                {/* Admin Content Management */}
                <Route 
                  path="/admin/courses" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <CoursesPage 
                        user={{
                          name: user?.username || '',
                          role: user?.role || 'admin',
                          avatar: user?.avatar
                        }}
                        onLogout={logout}
                      />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/subscriptions" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <Subscriptions user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/exams" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ExamsPage 
                        user={{
                          name: user?.username || '',
                          role: user?.role || 'admin',
                          avatar: user?.avatar
                        }}
                        onLogout={logout}
                      />
                    </ProtectedRoute>
                  } 
                />
                {/* Admin Profile Route */}
                <Route 
                  path="/admin/profile" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <AdminProfilePage user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                {/* Admin Settings Route */}
                <Route 
                  path="/admin/settings" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardWrapper>
                        <AdminSettingsPage user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin Master Management Routes */}
                <Route 
                  path="/admin/stream" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <StreamPage 
                        user={{
                          name: user?.username || '',
                          role: user?.role || 'admin',
                          avatar: user?.avatar
                        }}
                        onLogout={logout}
                      />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/admin/class" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ClassPage 
                        user={{
                          name: user?.username || '',
                          role: user?.role || 'admin',
                          avatar: user?.avatar
                        }}
                        onLogout={logout}
                      />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/subject" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SubjectPage 
                        user={{
                          name: user?.username || '',
                          role: user?.role || 'admin',
                          avatar: user?.avatar
                        }}
                        onLogout={logout}
                      />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/chapter" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ChapterPage user={user!} onLogout={logout} />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/topics" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <TopicPage user={{ name: '', role: 'admin' }} onLogout={() => {}} />
                    </ProtectedRoute>
                  } 
                />
                {/* ===============================
                    TEACHER ROUTES - For educators and content creators
                    =============================== */}
                {/* Teacher Dashboard */}
                <Route 
                  path="/teacher/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherDashboard user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                {/* Teacher Stream Management */}
                <Route 
                  path="/teacher/streams" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherStreamsPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                {/* Teacher Class Management */}
                <Route 
                  path="/teacher/classes" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherClassesPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Teacher Subject Management */}
                <Route 
                  path="/teacher/subjects" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherSubjectsPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/subjects/create" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherCreateSubjectPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/topics" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherTopicsPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/chapters" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <ChapterList user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Teacher Content Management */}
                <Route 
                  path="/teacher/content" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherContentPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Teacher Course Management */}
                {/* Handle typo in route - redirect from /teacher/cources to /teacher/courses */}
                <Route 
                  path="/teacher/cources" 
                  element={<Navigate to="/teacher/courses" replace />} 
                />
                
                <Route 
                  path="/teacher/courses" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherCoursesPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/courses/create" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherCreateCoursePage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Handle course view and edit routes */}
                <Route 
                  path="/teacher/courses/:courseId/view" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherCourseView user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/courses/:courseId/edit" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherCourseEdit user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Handle typo redirects for course view and edit */}
                <Route 
                  path="/teacher/cources/:courseId/view" 
                  element={<CourseViewRedirect />} 
                />
                
                <Route 
                  path="/teacher/cources/:courseId/edit" 
                  element={<CourseEditRedirect />} 
                />
                
                {/* Teacher Exam Management */}
                <Route 
                  path="/teacher/exams" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherExamsPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/exams/create" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherCreateExamPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/exams/:examId" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherExamView user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/exams/:examId/edit" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherExamEdit user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/exams/:examId/assign-questions" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <AssignQuestionsPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                
                
                {/* Teacher Question Management */}
                <Route 
                  path="/teacher/questions" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherQuestionsPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/questions/create" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherCreateQuestionPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/questions/:questionId/edit" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherEditQuestionPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Handle typo in question creation route */}
                <Route 
                  path="/teacher/question/create" 
                  element={<Navigate to="/teacher/questions/create" replace />} 
                />
                
                
                
                {/* Teacher Settings Page */}
                <Route 
                  path="/teacher/settings" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherSettingsPage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
               
                <Route 
                  path="/teacher/profile" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherProfilePage user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/teacher/exams/:examId/results" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <DashboardWrapper>
                        <TeacherExamResults user={{ name: '', role: 'teacher' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />

                {/* ===============================
                    STUDENT ROUTES - For learners and course participants
                    =============================== */}
                {/* Student Dashboard and Course Routes */}
                <Route 
                  path="/student/*" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <CourseProvider>
                        <Routes>
                          <Route 
                            path="dashboard" 
                            element={
                              <DashboardWrapper>
                                <StudentDashboard user={{ name: '', role: 'student' }} onLogout={() => {}} />
                              </DashboardWrapper>
                            } 
                          />
                          <Route 
                            path="courses" 
                            element={
                              <DashboardWrapper>
                                <StudentCourses user={{ name: '', role: 'student' }} onLogout={() => {}} />
                              </DashboardWrapper>
                            } 
                          />
                          <Route 
                            path="avail-courses" 
                            element={
                              <DashboardWrapper>
                                <StudentAvailCourses user={{ name: '', role: 'student' }} onLogout={() => {}} />
                              </DashboardWrapper>
                            } 
                          />
                        </Routes>
                      </CourseProvider>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/student/exams/:studentExamId/details" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <ExamDetails user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/student/course-detail/:courseId" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <CourseDetail user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Student Exam Routes */}
                <Route 
                  path="/student/exams" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <Exams user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/student/exams/:examId/take" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ExamTaking 
                        user={{ name: 'Test User', role: 'student' }} 
                        onLogout={() => console.log('Logout clicked')} 
                      />
                    </ProtectedRoute>
                  } 
                />

                {/* student answers changes */}

                <Route 
                  path="/student/exams/:studentExamId/answers" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <ExamAnswers 
                          user={{ name: 'Test User', role: 'student' }} 
                          onLogout={() => console.log('Logout clicked')} 
                        />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/student/exams/:examId/results" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                      <ExamResults 
                        user={{ name: 'Test User', role: 'student' }} 
                        onLogout={() => console.log('Logout clicked')} 
                      />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/student/exams/:examId/result" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <ExamResult 
                          user={{ name: 'Test User', role: 'student' }} 
                          onLogout={() => console.log('Logout clicked')} 
                        />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                {/* Student Content and Learning Material */}
                <Route 
                  path="/student/content" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <StudentContent user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Student Performance and Reports
                <Route 
                  path="/student/performance" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <StudentPerformance user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                /> */}
                
                
                <Route 
                  path="/student/reports" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <StudentReports user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                
                {/* Student Subscription Management */}
                <Route 
                  path="/student/subscription" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <StudentSubscription user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                {/* Student Routes */}
                <Route 
                  path="/student/profile" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <StudentProfile user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                {/* Student Settings */}
                <Route 
                  path="/student/settings" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DashboardWrapper>
                        <StudentSetting user={{ name: '', role: 'student' }} onLogout={() => {}} />
                      </DashboardWrapper>
                    </ProtectedRoute>
                  } 
                />
                
                {/* ===============================
                    UTILITY ROUTES - Redirects and catch-all routes
                    =============================== */}
                {/* Redirect based on role */}
                <Route 
                  path="/" 
                  element={<RoleBasedRedirect />} 
                />
                
                {/* Catch all - redirect to login */}
                <Route path="*" element={<Navigate to="/login" />} />
                <Route path="/admin/packages" element={<PackagePage user={user} onLogout={logout} />} />
                <Route path="/admin/package-mapping" element={<PackageMappingPage user={user} onLogout={logout} />} />
              </Routes>
  );
};

const RoleBasedRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

    if (user.role === 'student') {
      return <Navigate to="/student/dashboard" />;
    } else if (user.role === 'teacher') {
      return <Navigate to="/teacher/dashboard" />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" />;
  }

  return <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <ErrorHandlingProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <AppRoutes />
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorHandlingProvider>
  );
};

export default App;
