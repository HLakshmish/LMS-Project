import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const StudentSidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Learning
        </h3>
        <div className="mt-2 space-y-1">
          <Link
            to="/student/dashboard"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/dashboard')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          <Link
            to="/student/avail-courses"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/avail-courses')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Available Courses
          </Link>
          <Link
            to="/student/courses"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/courses')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            My Courses
          </Link>
          <Link
            to="/student/exams"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/exams')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            My Exams
          </Link>
          <Link
            to="/student/content"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/content')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Learning Materials
          </Link>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Performance
        </h3>
        <div className="mt-2 space-y-1">
          <Link
            to="/student/reports"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/reports')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reports
          </Link>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Account
        </h3>
        <div className="mt-2 space-y-1">
          <Link
            to="/student/profile"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/profile')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </Link>
          <Link
            to="/student/subscription"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/subscription')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Subscription
          </Link>
          <Link
            to="/student/settings"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActive('/student/settings')
                ? 'text-white bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentSidebar; 