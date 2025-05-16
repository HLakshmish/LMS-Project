import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    subjectCount: number;
    teacherName: string;
    progress?: number;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isTeacher?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onEdit,
  onDelete,
  isTeacher = false,
}) => {
  return (
    <Card className="h-full flex flex-col">
      <div className="relative">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{course.title.charAt(0)}</span>
          </div>
        )}
        {course.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 text-white text-xs px-2 py-1">
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
              <span>{course.progress}%</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 flex-grow">
        <h3 className="text-lg font-medium text-gray-900 mb-1">{course.title}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>
        
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{course.subjectCount} {course.subjectCount === 1 ? 'Subject' : 'Subjects'}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-500">
          <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{course.teacherName}</span>
        </div>
      </div>
      
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        {isTeacher ? (
          <div className="flex space-x-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onEdit && onEdit(course.id)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={() => onDelete && onDelete(course.id)}
            >
              Delete
            </Button>
          </div>
        ) : (
          <Link to={`/courses/${course.id}`}>
            <Button variant="primary" size="sm" fullWidth>
              View Course
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
};

export default CourseCard;
