import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconType, IconBaseProps } from 'react-icons';
import { FaUsers, FaBook, FaChartLine, FaCog, FaServer, FaCreditCard, FaUserCircle, FaGraduationCap, FaLayerGroup, FaStream, FaBookOpen, FaChalkboardTeacher, FaList } from 'react-icons/fa';

interface AdminSidebarProps {
  className?: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ className = '' }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [reportsOpen, setReportsOpen] = useState(
    currentPath.includes('/admin/user-growth') || 
    currentPath.includes('/admin/subscription-metrics') || 
    currentPath.includes('/admin/system-usage')
  );
  
  const [systemOpen, setSystemOpen] = useState(
    currentPath.includes('/admin/settings') || 
    currentPath.includes('/admin/profile')
  );

  const [masterOpen, setMasterOpen] = useState(
    currentPath.includes('/admin/stream') || 
    currentPath.includes('/admin/class') || 
    currentPath.includes('/admin/subject') ||
    currentPath.includes('/admin/chapter') ||
    currentPath.includes('/admin/topics')
  );

  // Helper function to determine if a link is active
  const isActiveLink = (path: string) => {
    switch (path) {
      case '/dashboard':
        return currentPath === '/admin/dashboard';
      case '/users':
        return currentPath === '/admin/users';
      case '/courses':
        return currentPath === '/admin/courses';
      case '/subscriptions':
        return currentPath === '/admin/subscriptions';
      case '/user-growth':
        return currentPath === '/admin/user-growth';
      case '/subscription-metrics':
        return currentPath === '/admin/subscription-metrics';
      case '/system-usage':
        return currentPath === '/admin/system-usage';
      case '/settings':
        return currentPath === '/admin/settings';
      case '/profile':
        return currentPath === '/admin/profile';
      case '/reports/exam-attempts':
        return currentPath === '/admin/reports/exam-attempts';
      case '/reports/performance':
        return currentPath === '/admin/reports/performance';
      case '/reports/subscriptions':
        return currentPath === '/admin/reports/subscriptions';
      case '/reports':
        return currentPath.includes('/admin/reports/exam-attempts') || 
               currentPath.includes('/admin/reports/performance') || 
               currentPath.includes('/admin/reports/subscriptions');
      case '/system':
        return currentPath.includes('/admin/settings') || 
               currentPath.includes('/admin/profile');
      case '/stream':
        return currentPath === '/admin/stream';
      case '/class':
        return currentPath === '/admin/class';
      case '/subject':
        return currentPath === '/admin/subject';
      case '/chapter':
        return currentPath === '/admin/chapter';
      case '/topics':
        return currentPath === '/admin/topics';
      case '/master':
        return currentPath.includes('/admin/stream') || 
               currentPath.includes('/admin/class') || 
               currentPath.includes('/admin/subject') ||
               currentPath.includes('/admin/chapter') ||
               currentPath.includes('/admin/topics');
      case '/packages':
        return currentPath === '/admin/packages';
      case '/package-mapping':
        return currentPath === '/admin/package-mapping';
      case '/student-results':
        return currentPath === '/admin/student-results';
      default:
        return currentPath.startsWith(path);
    }
  };

  const toggleReports = () => {
    setReportsOpen(!reportsOpen);
  };

  const toggleSystem = () => {
    setSystemOpen(!systemOpen);
  };

  const toggleMaster = () => {
    setMasterOpen(!masterOpen);
  };

  const renderIcon = (Icon: IconType) => {
    return React.createElement(Icon as React.ComponentType<IconBaseProps>, { 
      className: "h-5 w-5 mr-2"
    });
  };

  return (
    <div className={`space-y-6 h-full overflow-y-auto ${className}`}>
        <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Main
        </h3>
        <div className="mt-2 space-y-1">
          <Link 
            to="/admin/dashboard"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/dashboard') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaChartLine)}
            Dashboard
          </Link>
          <Link 
            to="/admin/users"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/users') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaUsers)}
            Users
          </Link>
          <Link 
            to="/admin/courses"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/courses') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaBook)}
            Courses
          </Link>
          <Link 
            to="/admin/subscriptions"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/subscriptions') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaCreditCard)}
            Subscriptions
          </Link>
          <Link 
            to="/admin/student-results"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/student-results') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaGraduationCap)}
            Student Results
          </Link>
          <Link 
            to="/admin/packages"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/packages') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="w-5 h-5 mr-2 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" viewBox="0 0 24 24" fill="none" 
                stroke={isActiveLink('/packages') ? 'white' : 'currentColor'} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            Packages
          </Link>
           <Link 
            to="/admin/package-mapping"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                isActiveLink('/package-mapping') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="w-5 h-5 mr-2 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" viewBox="0 0 24 24" fill="none" 
                stroke={isActiveLink('/package-mapping') ? 'white' : 'currentColor'} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            Package Mapping
          </Link>
        </div>
      </div>
      
      <div>
        <div 
          className={`flex justify-between items-center cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider`}
          onClick={toggleMaster}
        >
          <h3>Manage Master</h3>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transform transition-transform duration-200 ${masterOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className={`mt-2 space-y-1 overflow-hidden transition-all duration-200 ${masterOpen ? 'max-h-60' : 'max-h-0'}`}>
        <Link 
            to="/admin/class" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/class') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaChalkboardTeacher)}
            Class
        </Link>
          <Link 
            to="/admin/stream" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/stream') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaStream)}
            Stream
          </Link>
         
          <Link 
            to="/admin/subject" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/subject') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaBookOpen)}
            Subject
          </Link>
          <Link 
            to="/admin/chapter" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/chapter') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaLayerGroup)}
            Chapter
          </Link>
          <Link 
            to="/admin/topics" 
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/topics') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaList)}
            Topics
          </Link>
        </div>
        </div>

      <div>
        <div 
          className={`flex justify-between items-center cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider`}
          onClick={toggleReports}
        >
          <h3>Reports</h3>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transform transition-transform duration-200 ${reportsOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className={`mt-2 space-y-1 overflow-hidden transition-all duration-200 ${reportsOpen ? 'max-h-40' : 'max-h-0'}`}>
          <Link 
            to="/admin/reports/exam-attempts"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/reports/exam-attempts') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaGraduationCap)}
            Reports of Assessments
          </Link>
          <Link 
            to="/admin/reports/performance"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/reports/performance') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaChartLine)}
            Performances of Student
          </Link>
          <Link 
            to="/admin/reports/subscriptions"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/reports/subscriptions') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaCreditCard)}
            Subscriptions Reports
          </Link>
        </div>
        </div>

        <div>
        <div 
          className={`flex justify-between items-center cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider`}
          onClick={toggleSystem}
        >
          <h3>ACCOUNT</h3>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transform transition-transform duration-200 ${systemOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className={`mt-2 space-y-1 overflow-hidden transition-all duration-200 ${systemOpen ? 'max-h-40' : 'max-h-0'}`}>
          <Link 
            to="/admin/settings"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/settings') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaCog)}
            Settings
          </Link>
          <Link 
            to="/admin/profile"
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/profile') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {renderIcon(FaUserCircle)}
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;