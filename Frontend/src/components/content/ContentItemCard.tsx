import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface ContentItemCardProps {
  contentItem: {
    id: string;
    title: string;
    description: string;
    type: 'video' | 'pdf' | 'document' | 'image' | 'link';
    url: string;
    subject: string;
    chapter?: string;
    uploadDate: string;
    createdBy: string;
  };
  onView: (id: string, url: string, type: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isTeacher?: boolean;
}

const ContentItemCard: React.FC<ContentItemCardProps> = ({
  contentItem,
  onView,
  onEdit,
  onDelete,
  isTeacher = false,
}) => {
  const getTypeIcon = () => {
    switch (contentItem.type) {
      case 'video':
        return (
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'pdf':
        return (
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'document':
        return (
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'image':
        return (
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'link':
        return (
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 flex-grow">
        <div className="flex items-start mb-4">
          {getTypeIcon()}
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{contentItem.title}</h3>
            <p className="text-sm text-gray-500 capitalize">{contentItem.type}</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{contentItem.description}</p>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>{contentItem.subject}</span>
          </div>
          
          {contentItem.chapter && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{contentItem.chapter}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{contentItem.uploadDate}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{contentItem.createdBy}</span>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        {isTeacher ? (
          <div className="flex space-x-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onView(contentItem.id, contentItem.url, contentItem.type)}
            >
              View
            </Button>
            <Button
              variant="info"
              size="sm"
              fullWidth
              onClick={() => onEdit && onEdit(contentItem.id)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={() => onDelete && onDelete(contentItem.id)}
            >
              Delete
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => onView(contentItem.id, contentItem.url, contentItem.type)}
          >
            View Content
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ContentItemCard;
