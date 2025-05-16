import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sidebarContent,
  user,
  onLogout,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar 
        user={user} 
        onLogout={onLogout} 
      />
      
      <div className="flex flex-1 relative">
        {sidebarContent && (
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
          >
            {sidebarContent}
          </Sidebar>
        )}
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Mobile sidebar toggle */}
          {sidebarContent && (
            <button
              className="md:hidden mb-4 p-2 rounded-md bg-white shadow text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setIsSidebarOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
