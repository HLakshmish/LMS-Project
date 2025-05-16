import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { useAuth } from '../../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface TeacherExamViewProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
  max_questions: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  course_id: number | null;
  class_id: number | null;
  subject_id: number | null;
  chapter_id: number | null;
  topic_id: number | null;
  creator: {
    email: string;
    username: string;
    role: string;
    id: number;
    created_at: string;
    updated_at: string | null;
  };
}

interface AssociatedEntity {
  id: number;
  name: string;
  description?: string;
  // Other common properties can be added here
}

const TeacherExamView: React.FC<TeacherExamViewProps> = ({ user, onLogout }) => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [associatedEntity, setAssociatedEntity] = useState<AssociatedEntity | null>(null);
  const [loadingAssociation, setLoadingAssociation] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/exams/exams/${examId}`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch exam details');
        }

        const data = await response.json();
        setExam(data);
        
        // Fetch associated entity details
        await fetchAssociatedEntity(data);
      } catch (err) {
        console.error('Error fetching exam:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch exam details');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, token]);

  // Function to determine which entity type is associated and fetch its details
  const fetchAssociatedEntity = async (examData: Exam) => {
    try {
      setLoadingAssociation(true);
      let entityType = '';
      let entityId: number | null = null;
      
      if (examData.topic_id) {
        entityType = 'topics';
        entityId = examData.topic_id;
      } else if (examData.chapter_id) {
        entityType = 'chapters';
        entityId = examData.chapter_id;
      } else if (examData.subject_id) {
        entityType = 'subjects';
        entityId = examData.subject_id;
      } else if (examData.class_id) {
        entityType = 'classes';
        entityId = examData.class_id;
      } else if (examData.course_id) {
        entityType = 'courses';
        entityId = examData.course_id;
      }
      
      if (entityType && entityId) {
        const response = await fetch(`${API_URL}/api/${entityType}/${entityId}`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const entityData = await response.json();
          setAssociatedEntity(entityData);
        } else {
          console.warn(`Could not fetch ${entityType} details`);
          setAssociatedEntity(null);
        }
      } else {
        setAssociatedEntity(null);
      }
    } catch (err) {
      console.error('Error fetching associated entity:', err);
      setAssociatedEntity(null);
    } finally {
      setLoadingAssociation(false);
    }
  };

  const handleEdit = () => {
    navigate(`/teacher/exams/${examId}/edit`);
  };

  const handleBack = () => {
    navigate('/teacher/exams');
  };

  // Format date function
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Function to get the association type name for display
  const getAssociationTypeName = (): string => {
    if (!exam) return '';
    
    if (exam.topic_id) return 'Topic';
    if (exam.chapter_id) return 'Chapter';
    if (exam.subject_id) return 'Subject';
    if (exam.class_id) return 'Class';
    if (exam.course_id) return 'Course';
    
    return 'Not Associated';
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !exam) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error || 'Exam not found'}</span>
          </div>
          <div className="mt-4">
            <Button onClick={handleBack} variant="primary">
              Back to Exams
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Exam Details</h1>
          <div className="space-x-4">
            <Button onClick={handleBack} variant="secondary">
              Back to Exams
            </Button>
            <Button onClick={handleEdit} variant="primary">
              Edit Exam
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Title</h2>
              <p className="text-gray-700">{exam.title}</p>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{exam.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold">Start Date & Time</h2>
                <p className="text-gray-700">{formatDate(exam.start_datetime)}</p>
              </div>
              
              
              
              <div>
                <h2 className="text-lg font-semibold">Duration</h2>
                <p className="text-gray-700">{exam.duration_minutes} minutes</p>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold">Maximum Marks</h2>
                <p className="text-gray-700">{exam.max_marks}</p>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold">Maximum Questions</h2>
                <p className="text-gray-700">{exam.max_questions}</p>
              </div>
              
              {associatedEntity && (
                <div>
                  <h2 className="text-lg font-semibold">{getAssociationTypeName()}</h2>
                  <p className="text-gray-700">{associatedEntity.name}</p>
                  {associatedEntity.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{associatedEntity.description}</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold">Created By</h2>
                <p className="text-gray-700">{exam.creator.username} ({exam.creator.email})</p>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold">Created On</h2>
                <p className="text-gray-700">{formatDate(exam.created_at)}</p>
              </div>
              
              {exam.updated_at && (
                <div>
                  <h2 className="text-lg font-semibold">Last Updated</h2>
                  <p className="text-gray-700">{formatDate(exam.updated_at)}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="light"
                onClick={() => navigate(`/teacher/exams/${examId}/assign-questions`)}
              >
                Assign Questions
              </Button>
              <Button 
                variant="light"
                onClick={() => navigate(`/teacher/exams/${examId}/results`)}
              >
                View Results
              </Button>
              
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TeacherExamView; 