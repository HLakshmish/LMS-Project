import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface ExamCardProps {
  exam: {
    id: string;
    title: string;
    description: string;
    date: string;
    duration: number; // in minutes
    questionCount: number;
    totalMarks: number;
    status: 'upcoming' | 'active' | 'completed' | 'expired';
  };
  onStart?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isTeacher?: boolean;
}

const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  onStart,
  onEdit,
  onDelete,
  isTeacher = false,
}) => {
  const getStatusBadge = () => {
    switch (exam.status) {
      case 'upcoming':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Upcoming</span>;
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Completed</span>;
      case 'expired':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Expired</span>;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900">{exam.title}</h3>
          {getStatusBadge()}
        </div>
        
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{exam.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{exam.date}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{exam.duration} min</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{exam.questionCount} Questions</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{exam.totalMarks} Marks</span>
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
              onClick={() => onEdit && onEdit(exam.id)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={() => onDelete && onDelete(exam.id)}
            >
              Delete
            </Button>
          </div>
        ) : (
          <>
            {exam.status === 'active' ? (
              <Button 
                variant="success" 
                size="sm" 
                fullWidth
                onClick={() => onStart && onStart(exam.id)}
              >
                Start Exam
              </Button>
            ) : exam.status === 'completed' ? (
              <Link to={`/exams/${exam.id}/results`}>
                <Button variant="info" size="sm" fullWidth>
                  View Results
                </Button>
              </Link>
            ) : (
              <Link to={`/exams/${exam.id}`}>
                <Button variant="primary" size="sm" fullWidth>
                  View Details
                </Button>
              </Link>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default ExamCard;
