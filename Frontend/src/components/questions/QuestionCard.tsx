import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface QuestionCardProps {
  question: {
    id: string;
    content: string;
    difficulty: 'easy' | 'medium' | 'hard';
    subject: string;
    chapter?: string;
    topic?: string;
    answerCount: number;
    image?: string;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  isTeacher?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onEdit,
  onDelete,
  onView,
  isTeacher = false,
}) => {
  const getDifficultyBadge = () => {
    switch (question.difficulty) {
      case 'easy':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Easy</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Medium</span>;
      case 'hard':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Hard</span>;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-2">
          {getDifficultyBadge()}
        </div>
        
        {question.image && (
          <div className="mb-3">
            <img 
              src={question.image} 
              alt="Question" 
              className="w-full h-32 object-cover rounded-md"
            />
          </div>
        )}
        
        <p className="text-base text-gray-800 mb-4 line-clamp-3">{question.content}</p>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>{question.subject}</span>
          </div>
          
          {question.chapter && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{question.chapter}</span>
            </div>
          )}
          
          {question.topic && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>{question.topic}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-gray-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{question.answerCount} Answers</span>
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
              onClick={() => onEdit && onEdit(question.id)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={() => onDelete && onDelete(question.id)}
            >
              Delete
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => onView && onView(question.id)}
          >
            View Question
          </Button>
        )}
      </div>
    </Card>
  );
};

export default QuestionCard;
