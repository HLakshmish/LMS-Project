import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface TeacherSidebarProps {
  className?: string;
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ className = '' }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Helper function to determine if a link is active
  const isActiveLink = (path: string) => {
    switch (path) {
      case '/dashboard':
        return currentPath === '/teacher/dashboard';
      case '/courses':
        return currentPath === '/teacher/courses';
      case '/subjects':
        return currentPath === '/teacher/subjects';
      case '/chapters':
        return currentPath === '/teacher/chapters';
      case '/topics':
        return currentPath === '/teacher/topics';
      case '/exams':
        return currentPath === '/teacher/exams';
      case '/questions':
        return currentPath === '/teacher/questions';
      case '/content':
        return currentPath === '/teacher/content';
      case '/profile':
        return currentPath === '/teacher/profile';
      case '/settings':
        return currentPath === '/teacher/settings';
      case '/account':
        return currentPath.includes('/teacher/profile') || currentPath.includes('/teacher/settings');
      case '/streams':
        return currentPath === '/teacher/streams';
      case '/classes':
        return currentPath === '/teacher/classes';
      default:
        return currentPath.startsWith(path);
    }
  };

  // Determine if account section should be open based on current path
  const isAccountOpen = currentPath.includes('/teacher/profile') || currentPath.includes('/teacher/settings');

  return (
    <div className={`space-y-6 h-full overflow-y-auto ${className}`}>
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Main
        </h3>
        <div className="mt-2 space-y-1">
          <Link 
            to="/teacher/dashboard" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/dashboard') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Dashboard
          </Link>
          <Link 
            to="/teacher/classes" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/classes') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            Classes
          </Link>
          <Link 
            to="/teacher/streams" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/streams') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5z" />
              <path d="M13 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
            </svg>
            Streams
          </Link>
          <Link 
            to="/teacher/subjects" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/subjects') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            Subjects
          </Link>
          <Link 
            to="/teacher/courses" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/courses') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            Courses
          </Link>
         
          <Link 
            to="/teacher/chapters" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/chapters') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
              <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
            </svg>
            Chapters
          </Link>
          <Link 
            to="/teacher/topics" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/topics') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            Topics
          </Link>
          <Link 
            to="/teacher/exams" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/exams') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            Exams
          </Link>
          <Link 
            to="/teacher/questions" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/questions') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Questions
          </Link>
          <Link 
            to="/teacher/content" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/content') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            Content
          </Link>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Account
        </h3>
        <div className={`mt-2 space-y-1`}>
          <Link 
            to="/teacher/profile" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/profile') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Profile
          </Link>
          <Link 
            to="/teacher/settings" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/settings') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherSidebar; 