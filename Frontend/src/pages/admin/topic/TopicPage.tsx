import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaSave, FaTimes, FaList, FaClock } from 'react-icons/fa';
import AdminSidebar from '../AdminSidebar';
import MainLayout from '../../../components/layout/MainLayout';
import { IconType, IconBaseProps } from 'react-icons';
import axios from 'axios';
import ReactModal from 'react-modal';

interface TopicPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface Topic {
  id: string;
  name: string;
  description: string;
  chapter: string;
  chapterObj?: {
    id: number;
    name: string;
    description: string;
    subject_id: number;
    subject?: {
      id: number;
      name: string;
      code: string;
      description: string;
      stream_id: number;
      stream?: {
        id: number;
        name: string;
        description: string;
        class_id: number;
        class_?: {
          id: number;
          name: string;
          description: string;
        }
      }
    }
  };
  createdAt: Date;
}

interface ApiTopic {
  id: number;
  name: string;
  description: string;
  stream: string;
  class: string;
  subject: string;
  chapter: string | { name: string; id?: number; description?: string; };
  duration: number;
  created_at: string;
}

interface Stream {
  id: number;
  name: string;
  description?: string;
  class_id?: number;
  class_?: {
    id: number;
    name: string;
    description?: string;
  };
}

interface Class {
  id: number;
  name: string;
  stream_id: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  stream_id?: number;
  stream?: Stream;
}

interface Chapter {
  id: number;
  name: string | { name: string };
  subject_id: number;
  description?: string;
  chapter_number?: number;
  subject?: Subject;
  topics?: any[];
  creator?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

const TopicPage: React.FC<TopicPageProps> = ({ user, onLogout }) => {
  // State for topics data
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  // Add form validation errors state
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // State for dropdowns data
  const [streams, setStreams] = useState<Stream[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  // Loading states for dropdowns
  const [loadingStreams, setLoadingStreams] = useState<boolean>(false);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(false);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  // API configuration
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterStream, setFilterStream] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterChapter, setFilterChapter] = useState('all');
  
  // Form state
  const [newTopic, setNewTopic] = useState({ 
    name: '', 
    description: '', 
    chapter: ''
  });
  const [editTopic, setEditTopic] = useState<Topic | null>(null);

  // Filtered classes based on selected stream
  const [filteredClasses, setFilteredClasses] = useState(classes);
  
  // Filtered subjects based on selected class
  const [filteredSubjects, setFilteredSubjects] = useState(subjects);

  // Filtered chapters based on selected subject
  const [filteredChapters, setFilteredChapters] = useState(chapters);

  // Add modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch streams
  const fetchStreams = async () => {
    setLoadingStreams(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await axios.get(`${API_URL}/api/streams/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setStreams(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching streams:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.response?.data?.message || err.message);
      } else {
        setError('Failed to fetch streams');
      }
    } finally {
      setLoadingStreams(false);
    }
  };

  // Fetch classes
  const fetchClasses = async (streamId?: number) => {
    setLoadingClasses(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const params: any = {};
      if (streamId) {
        params.stream_id = streamId;
      }

      const response = await axios.get(`${API_URL}/api/classes/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params
      });

      setClasses(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching classes:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.response?.data?.message || err.message);
      } else {
        setError('Failed to fetch classes');
      }
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch subjects
  const fetchSubjects = async (streamId?: number) => {
    setLoadingSubjects(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const params: any = {};
      if (streamId) {
        params.stream_id = streamId;
      }

      const response = await axios.get(`${API_URL}/api/subjects/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params
      });

      setSubjects(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.response?.data?.message || err.message);
      } else {
        setError('Failed to fetch subjects');
      }
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fetch chapters
  const fetchChapters = async (subjectId?: number) => {
    setLoadingChapters(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const params: any = {};
      if (subjectId) {
        params.subject_id = subjectId;
      }

      const response = await axios.get(`${API_URL}/api/chapters/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params
      });

      setChapters(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.response?.data?.message || err.message);
      } else {
        setError('Failed to fetch chapters');
      }
    } finally {
      setLoadingChapters(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchStreams();
    fetchClasses();
    fetchSubjects();
    fetchChapters();
  }, []);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle add new topic
  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewTopic({ 
      name: '', 
      description: '', 
      chapter: ''
    });
    setIsEditModalOpen(true);
  };

  // Check if a topic name already exists for the selected chapter
  const isTopicNameDuplicateForChapter = (name: string, chapterId: number | string, currentId?: string): boolean => {
    // If no name or chapter, can't be a duplicate
    if (!name.trim() || !chapterId) return false;
    
    return topics.some(topic => 
      topic.name.toLowerCase().trim() === name.toLowerCase().trim() && 
      (topic.chapter === getChapterById(Number(chapterId)) || 
       topic.chapter === String(chapterId)) && 
      (!currentId || topic.id !== currentId)
    );
  };

  // Get chapter name by ID for validation purposes
  const getChapterById = (id: number): string => {
    const chapter = chapters.find(ch => ch.id === id);
    if (!chapter) return "";
    return getChapterName(chapter.name);
  };

  // Validate form before submission
  const validateTopicForm = (name: string, chapterId: number | string, isEdit: boolean = false, currentId?: string): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Check for empty name
    if (!name.trim()) {
      errors.name = 'Topic name is required';
    }
    
    // Check for empty chapter
    if (!chapterId) {
      errors.chapter = 'Chapter is required';
    }
    
    // Check for duplicate topic name in the same chapter
    if (name.trim() && chapterId && 
        isTopicNameDuplicateForChapter(name, chapterId, isEdit ? currentId : undefined)) {
      errors.name = 'A topic with this name already exists in this chapter';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear error when input changes
  const handleInputChange = (field: string, value: string, isEdit: boolean = false) => {
    // Clear error for this field
    if (formErrors[field]) {
      const newErrors = {...formErrors};
      delete newErrors[field];
      setFormErrors(newErrors);
    }
    
    // Update the correct state based on whether we're editing or adding
    if (isEdit && editTopic) {
      setEditTopic({...editTopic, [field]: value});
    } else {
      setNewTopic({...newTopic, [field]: value});
    }
  };

  // Handle save new topic with validation
  const handleSaveNew = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Find the selected chapter ID
      const selectedChapter = chapters.find(chap => chap.name === newTopic.chapter);
      if (!selectedChapter) {
        setError('Please select a valid chapter');
        return;
      }

      // Validate form before submission
      if (!validateTopicForm(newTopic.name, selectedChapter.id)) {
        return; // Stop if validation fails
      }

      // Prepare the request body with only the required fields
      const requestBody = {
        name: newTopic.name,
        description: newTopic.description || '',
        chapter_id: selectedChapter.id
      };

      console.log('Sending request:', requestBody);

      const response = await axios.post(
        `${API_URL}/api/topics/`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('API Response:', response.data);

      if (response.data) {
        // Reset form
    setIsAddingNew(false);
    setNewTopic({ 
      name: '', 
      description: '', 
          chapter: ''
        });
        setError(null);
        setFormErrors({});
        
        // Refresh the topics list
        fetchTopics();
      }
    } catch (err) {
      console.error('Error creating topic:', err);
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response?.data);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please login again');
        } else if (err.response?.status === 403) {
          setError('Forbidden: You do not have permission to create topics');
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Failed to create topic: ${err.response?.data?.message || err.message}`);
        }
      } else {
        setError('Failed to create topic');
      }
    }
  };
  
  // Handle edit topic
  const handleEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setEditTopic({ ...topic });
    setIsEditModalOpen(true);
  };
  
  // Handle save edit with validation
  const handleSaveEdit = async () => {
    console.log('Starting save edit with:', { editTopic, editingId });
    
    if (!editTopic || !editingId) {
      console.error('No topic or editing ID found');
      setError('No topic or editing ID found');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Get the current topic to find its chapter if not changed
      const currentTopic = topics.find(t => t.id === editingId);
      if (!currentTopic) {
        setError('Topic not found');
        return;
      }

      // Use the current chapter if not changed, otherwise use the selected one
      const chapterName = editTopic.chapter || currentTopic.chapter;
      const selectedChapter = chapters.find(chap => chap.name === chapterName);
      
      if (!selectedChapter) {
        setError('Please select a valid chapter');
        return;
      }

      // Validate form before submission
      if (!validateTopicForm(editTopic.name, selectedChapter.id, true, editingId)) {
        return; // Stop if validation fails
      }

      // Prepare the request body according to API specification
      const requestBody = {
        name: editTopic.name.trim(),
        description: editTopic.description?.trim() || '',
        chapter_id: selectedChapter.id
      };

      const apiUrl = `${API_URL}/api/topics/${editingId}`;
      console.log('Making API call to:', apiUrl);
      console.log('With request body:', requestBody);

      const response = await axios.put(
        apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('API Response:', response);

      // Reset editing state and refresh topics list
      setEditingId(null);
      setEditTopic(null);
      setError(null);
      setFormErrors({});
      setIsEditModalOpen(false);
      
      // Refresh the topics list
      await fetchTopics();

    } catch (err) {
      console.error('Error updating topic:', err);
      if (axios.isAxiosError(err)) {
        console.error('API Error details:', {
          status: err.response?.status,
          data: err.response?.data,
          headers: err.response?.headers
        });
        
        if (err.response?.status === 401) {
          setError('Unauthorized: Please login again');
        } else if (err.response?.status === 403) {
          setError('Forbidden: You do not have permission to update topics');
        } else if (err.response?.status === 404) {
          setError('Topic not found');
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Failed to update topic: ${err.response?.data?.message || err.message}`);
        }
      } else {
        setError('Failed to update topic');
      }
    }
  };
  
  // Handle delete topic
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      console.log('Deleting topic:', id);
      const response = await axios.delete(
        `${API_URL}/api/topics/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Delete response:', response);

      // Remove the topic from the local state
      setTopics(topics.filter(topic => topic.id !== id));
      setError(null);

    } catch (err) {
      console.error('Error deleting topic:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Unauthorized: Please login again');
        } else if (err.response?.status === 403) {
          setError('Forbidden: You do not have permission to delete topics');
        } else if (err.response?.status === 404) {
          setError('Topic not found');
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Failed to delete topic: ${err.response?.data?.message || err.message}`);
        }
      } else {
        setError('Failed to delete topic');
      }
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setEditTopic(null);
    setIsEditModalOpen(false);
  };
  
  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  // Handle stream filter change
  const handleFilterStreamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStream(e.target.value);
    
    // Reset dependent filters when stream changes
    if (e.target.value !== filterStream) {
      setFilterSubject('all');
      setFilterChapter('all');
    }
  };

  // Handle class filter change
  const handleFilterClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterClass(e.target.value);
    
    // Reset dependent filters when class changes
    if (e.target.value !== filterClass) {
      setFilterStream('all');
      setFilterSubject('all'); 
      setFilterChapter('all');
    }
  };

  // Handle subject filter change
  const handleFilterSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterSubject(e.target.value);
    
    // Reset dependent filters when subject changes
    if (e.target.value !== filterSubject) {
      setFilterChapter('all');
    }
  };
  
  // Handle chapter filter change
  const handleFilterChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterChapter(e.target.value);
  };
  
  // Filter and sort topics
  const filteredAndSortedTopics = React.useMemo(() => {
    let result = [...topics];
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(topic => 
        topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply hierarchical filters (class, stream, subject, chapter)
    
    // Filter by class
    if (filterClass !== 'all') {
      result = result.filter(topic => 
        topic.chapterObj?.subject?.stream?.class_?.name === filterClass
      );
    }
    
    // Filter by stream (only if class filter passes)
        if (filterStream !== 'all') {
      result = result.filter(topic => 
        topic.chapterObj?.subject?.stream?.name === filterStream
      );
    }
    
    // Filter by subject (only if stream filter passes)
    if (filterSubject !== 'all') {
      result = result.filter(topic => 
        topic.chapterObj?.subject?.name === filterSubject
      );
    }
    
    // Filter by chapter (only if subject filter passes)
    if (filterChapter !== 'all') {
      result = result.filter(topic => 
        topic.chapter === filterChapter
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'chapter-asc':
        result.sort((a, b) => a.chapter.localeCompare(b.chapter));
        break;
      case 'chapter-desc':
        result.sort((a, b) => b.chapter.localeCompare(a.chapter));
        break;
      case 'date-asc':
        result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'date-desc':
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      default:
        break;
    }
    
    return result;
  }, [topics, searchTerm, sortBy, filterClass, filterStream, filterSubject, filterChapter]);

  // Generate unique options for filter dropdowns based on topics data
  const uniqueClasses = React.useMemo(() => {
    const classSet = new Set<string>();
    topics.forEach(topic => {
      if (topic.chapterObj?.subject?.stream?.class_?.name) {
        classSet.add(topic.chapterObj.subject.stream.class_.name);
      }
    });
    return Array.from(classSet).sort();
  }, [topics]);

  const uniqueStreams = React.useMemo(() => {
    const streamSet = new Set<string>();
    topics.forEach(topic => {
      if (topic.chapterObj?.subject?.stream?.name) {
        // If class filter is set, only include streams from that class
        if (filterClass === 'all' || 
            (topic.chapterObj.subject.stream.class_ && 
             topic.chapterObj.subject.stream.class_.name === filterClass)) {
          streamSet.add(topic.chapterObj.subject.stream.name);
        }
      }
    });
    return Array.from(streamSet).sort();
  }, [topics, filterClass]);

  const uniqueSubjects = React.useMemo(() => {
    const subjectSet = new Set<string>();
    topics.forEach(topic => {
      if (topic.chapterObj?.subject?.name) {
        // Only include subjects from selected stream (if filter is applied)
        if (filterStream === 'all' || 
            (topic.chapterObj.subject.stream && 
             topic.chapterObj.subject.stream.name === filterStream)) {
          // And from selected class (if filter is applied)
          if (filterClass === 'all' || 
              (topic.chapterObj.subject.stream?.class_ && 
               topic.chapterObj.subject.stream.class_.name === filterClass)) {
            subjectSet.add(topic.chapterObj.subject.name);
          }
        }
      }
    });
    return Array.from(subjectSet).sort();
  }, [topics, filterStream, filterClass]);

  const uniqueChapters = React.useMemo(() => {
    const chapterSet = new Set<string>();
    topics.forEach(topic => {
      if (topic.chapter) {
        // Only include chapters from selected subject (if filter is applied)
        if (filterSubject === 'all' || 
            (topic.chapterObj?.subject && 
             topic.chapterObj.subject.name === filterSubject)) {
          // And from selected stream (if filter is applied)
          if (filterStream === 'all' || 
              (topic.chapterObj?.subject?.stream && 
               topic.chapterObj.subject.stream.name === filterStream)) {
            // And from selected class (if filter is applied)
            if (filterClass === 'all' || 
                (topic.chapterObj?.subject?.stream?.class_ && 
                 topic.chapterObj.subject.stream.class_.name === filterClass)) {
              chapterSet.add(topic.chapter);
            }
          }
        }
      }
    });
    return Array.from(chapterSet).sort();
  }, [topics, filterSubject, filterStream, filterClass]);
  
  // Helper function to render icons properly
  const renderIcon = (Icon: IconType, customClassName?: string) => {
    return React.createElement(Icon as React.ComponentType<IconBaseProps>, { 
      className: customClassName || "h-5 w-5",
      size: 20
    });
  };

  // Fetch topics from API
  const fetchTopics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        setTopics([]);
        setLoading(false);
        return;
      }
      const params: any = {};
      if (selectedChapterId) {
        params.chapter_id = selectedChapterId;
      }
      const response = await axios.get(`${API_URL}/api/topics/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });
      
      // Assume response.data is an array of topics
      const apiTopics: ApiTopic[] = response.data.items || response.data || [];
      setTotal(response.data.total || apiTopics.length);
      
      console.log('API Topics:', apiTopics); // Debug log
      
      // Transform API response to our internal format
      setTopics(apiTopics.map(t => {
        // Extract chapter name and object
        let chapterName: string;
        let chapterObj: any = null;
        
        if (typeof t.chapter === 'object' && t.chapter !== null) {
          chapterObj = t.chapter;
          chapterName = t.chapter.name;
        } else {
          chapterName = t.chapter as string;
        }
        
        return {
        id: t.id.toString(),
        name: t.name,
        description: t.description,
          chapter: chapterName,
          chapterObj: chapterObj, // Store the complete chapter object
        createdAt: new Date(t.created_at),
        };
      }));
      setError(null);
    } catch (err) {
      setTopics([]);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.response?.data?.message || err.message);
      } else {
        setError('Failed to fetch topics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
    // eslint-disable-next-line
  }, [selectedChapterId]);

  // Update the helper function to format chapter names with subject, stream, and class
  const getChapterName = (chapter: string | { name: string }): string => {
    if (typeof chapter === 'object' && chapter !== null && 'name' in chapter) {
      return chapter.name;
    }
    return chapter as string;
  };

  // Add a new function to format the chapter display name with subject, stream, and class info
  const getChapterDisplayName = (chapter: Chapter): string => {
    // Get the basic chapter name
    let chapterName: string;
    if (typeof chapter.name === 'object' && chapter.name !== null && 'name' in chapter.name) {
      chapterName = chapter.name.name;
    } else {
      chapterName = chapter.name as string;
    }
    
    // If we have the subject and stream info, include it in the display
    if (chapter.subject) {
      const subjectName = chapter.subject.name;
      
      if (chapter.subject.stream) {
        const streamName = chapter.subject.stream.name;
        
        if (chapter.subject.stream.class_) {
          const className = chapter.subject.stream.class_.name;
          return `${chapterName} (${subjectName} -> ${streamName} ${className})`;
        }
        
        return `${chapterName} (${subjectName} -> ${streamName})`;
      }
      
      return `${chapterName} (${subjectName})`;
    }
    
    return chapterName;
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="bg-blue-600 text-white py-4 px-6 flex-none">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              {renderIcon(FaList, "text-xl")}
              <div>
                <h1 className="text-xl font-semibold">Manage Topics</h1>
                <p className="text-sm text-blue-100">Add and manage educational topics</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters & Actions Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex-none overflow-x-auto">
  <div className="max-w-7xl mx-auto flex flex-col gap-4">

    {/* Button Row */}
    <div className="flex justify-end">
      <button
        onClick={handleAddNew}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
      >
        {renderIcon(FaPlus)}
        <span>Add Topic</span>
      </button>
    </div>

    {/* Search + Filters Row */}
    <div className="flex items-center gap-4 flex-nowrap">

      {/* Search */}
      <div className="relative w-64">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {renderIcon(FaSearch, "text-gray-400")}
        </div>
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm"
        />
      </div>

      {/* Filters */}
      <select
        value={filterClass}
        onChange={handleFilterClassChange}
        className="w-40 form-select rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-blue-500 focus:border-blue-500"
        disabled={loadingClasses}
      >
        <option value="all">All Classes</option>
        {uniqueClasses.map(className => (
          <option key={className} value={className}>{className}</option>
        ))}
      </select>

      <select
        value={filterStream}
        onChange={handleFilterStreamChange}
        className="w-40 form-select rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-blue-500 focus:border-blue-500"
        disabled={loadingStreams || uniqueStreams.length === 0}
      >
        <option value="all">All Streams</option>
        {uniqueStreams.map(streamName => (
          <option key={streamName} value={streamName}>{streamName}</option>
        ))}
      </select>

      <select
        value={filterSubject}
        onChange={handleFilterSubjectChange}
        className="w-40 form-select rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-blue-500 focus:border-blue-500"
        disabled={loadingSubjects || uniqueSubjects.length === 0}
      >
        <option value="all">All Subjects</option>
        {uniqueSubjects.map(subjectName => (
          <option key={subjectName} value={subjectName}>{subjectName}</option>
        ))}
      </select>

      <select
        value={filterChapter}
        onChange={handleFilterChapterChange}
        className="w-40 form-select rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-blue-500 focus:border-blue-500"
        disabled={loadingChapters || uniqueChapters.length === 0}
      >
        <option value="all">All Chapters</option>
        {uniqueChapters.map(chapterName => (
          <option key={chapterName} value={chapterName}>{chapterName}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={handleSortChange}
        className="w-48 form-select rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="chapter-asc">Chapter (A-Z)</option>
        <option value="chapter-desc">Chapter (Z-A)</option>
        <option value="date-asc">Date (Oldest first)</option>
        <option value="date-desc">Date (Newest first)</option>
      </select>

    </div>
  </div>
</div>


        
        {/* Main Content */}
        <div className="flex-grow overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Topics Table */}
            <div className="bg-white shadow-md rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Topic Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chapter
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedTopics.map(topic => (
                    <tr key={topic.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{topic.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{topic.chapter}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs">{topic.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(topic.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleEdit(topic)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {renderIcon(FaEdit)}
                          </button>
                          <button
                            onClick={() => handleDelete(topic.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {renderIcon(FaTrash)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAndSortedTopics.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchTerm ? 'No topics match your search criteria.' : 'No topics available. Add your first topic!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Topic Modal */}
      <ReactModal
        isOpen={isEditModalOpen}
        onRequestClose={handleCancel}
        contentLabel={editingId ? "Edit Topic" : "Add Topic"}
        ariaHideApp={false}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-30 z-40"
      >
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6 relative">
          <button
            onClick={handleCancel}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
            aria-label="Close"
          >
            &times;
          </button>
          <h2 className="text-lg font-semibold mb-4">{editingId ? "Edit Topic" : "Add Topic"}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Topic Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editingId ? (editTopic?.name || '') : newTopic.name}
                onChange={e => handleInputChange('name', e.target.value, !!editingId)}
                className={`mt-1 block w-full border ${formErrors.name ? 'border-red-300 ring-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Enter topic name"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Chapter <span className="text-red-500">*</span></label>
              <select
                value={editingId ? (editTopic?.chapter || '') : newTopic.chapter}
                onChange={e => handleInputChange('chapter', e.target.value, !!editingId)}
                className={`mt-1 block w-full border ${formErrors.chapter ? 'border-red-300 ring-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              >
                <option value="">Select a chapter</option>
                {chapters.map(chapter => (
                  <option key={chapter.id} value={getChapterName(chapter.name)}>
                    {getChapterDisplayName(chapter)}
                  </option>
                ))}
              </select>
              {formErrors.chapter && (
                <p className="mt-1 text-sm text-red-600">{formErrors.chapter}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={editingId ? (editTopic?.description || '') : newTopic.description}
                onChange={e => handleInputChange('description', e.target.value, !!editingId)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter topic description"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={editingId ? handleSaveEdit : handleSaveNew}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingId ? "Save Changes" : "Save Topic"}
              </button>
            </div>
          </div>
        </div>
      </ReactModal>
    </MainLayout>
  );
};

export default TopicPage;