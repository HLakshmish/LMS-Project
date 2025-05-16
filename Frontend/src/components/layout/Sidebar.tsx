import React from 'react';

interface SidebarProps {
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  children, 
  isOpen = true, 
  onClose 
}) => {
  // Custom style to hide scrollbar across browsers
  const hideScrollbarStyle = {
    scrollbarWidth: 'none' as 'none', // Firefox
    msOverflowStyle: 'none', // IE and Edge
    '&::-webkit-scrollbar': { 
      display: 'none' // Chrome, Safari, newer versions of Opera
    }
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 md:hidden" 
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 bottom-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-0 md:h-screen md:sticky md:top-0
      `}>
        <div className="h-full flex flex-col">
          {/* Sidebar content with hidden scrollbar but still scrollable */}
          <div 
            className="flex-1 overflow-y-auto p-4 max-h-screen" 
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none'
            }}
          >
            {children}
          </div>
          {/* Additional style for WebKit browsers */}
          <style>
            {`.overflow-y-auto::-webkit-scrollbar { display: none; }`}
          </style>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
