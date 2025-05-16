import React, { createContext, useContext, useState, ReactNode } from 'react';
import apiService from '../services/api';

interface ContentItem {
  id: number;
  title: string;
  description: string;
  content_type: 'video' | 'pdf' | 'document' | 'image' | 'link';
  url: string;
  subject_id: number;
  chapter_id: number | null;
  topic_id: number | null;
  created_by: number;
  created_at: string;
}

interface ContentContextType {
  contentItems: ContentItem[];
  selectedContentItem: ContentItem | null;
  isLoading: boolean;
  error: string | null;
  fetchContentItems: () => Promise<void>;
  fetchContentItemsBySubject: (subjectId: number) => Promise<void>;
  fetchContentItemsByChapter: (chapterId: number) => Promise<void>;
  fetchUserContentItems: () => Promise<void>;
  fetchContentItem: (contentItemId: number) => Promise<ContentItem>;
  selectContentItem: (contentItem: ContentItem) => void;
  createContentItem: (contentItemData: any) => Promise<ContentItem>;
  updateContentItem: (contentItemId: number, contentItemData: any) => Promise<ContentItem>;
  deleteContentItem: (contentItemId: number) => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

interface ContentProviderProps {
  children: ReactNode;
}

export const ContentProvider: React.FC<ContentProviderProps> = ({ children }) => {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedContentItem, setSelectedContentItem] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContentItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.content.getAll({});
      setContentItems(data as ContentItem[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch content items');
      console.error('Error fetching content items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContentItemsBySubject = async (subjectId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.content.getAll({ subject_id: subjectId });
      setContentItems(data as ContentItem[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch content items by subject');
      console.error('Error fetching content items by subject:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContentItemsByChapter = async (chapterId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.content.getAll({ chapter_id: chapterId });
      setContentItems(data as ContentItem[]);   
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch content items by chapter');
      console.error('Error fetching content items by chapter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserContentItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.content.getAll({ user: true });
      setContentItems(data as ContentItem[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch user content items');
      console.error('Error fetching user content items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContentItem = async (contentItemId: number): Promise<ContentItem> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.content.getById(contentItemId);
      const contentItem = data as ContentItem;
      setSelectedContentItem(contentItem);
      return contentItem;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch content item');
      console.error('Error fetching content item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const selectContentItem = (contentItem: ContentItem) => {
    setSelectedContentItem(contentItem);
  };

  const createContentItem = async (contentItemData: any): Promise<ContentItem> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.content.create(contentItemData);
      const newContentItem = data as ContentItem;
      setContentItems([...contentItems, newContentItem]);
      return newContentItem;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create content item');
      console.error('Error creating content item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateContentItem = async (contentItemId: number, contentItemData: any): Promise<ContentItem> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.content.update(contentItemId, contentItemData);
      const updatedContentItem = data as ContentItem;
      setContentItems(contentItems.map(item => item.id === contentItemId ? updatedContentItem : item));
      if (selectedContentItem && selectedContentItem.id === contentItemId) {
        setSelectedContentItem(updatedContentItem);
      }
      return updatedContentItem;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update content item');
      console.error('Error updating content item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteContentItem = async (contentItemId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiService.content.delete(contentItemId);
      setContentItems(contentItems.filter(item => item.id !== contentItemId));
      if (selectedContentItem && selectedContentItem.id === contentItemId) {
        setSelectedContentItem(null);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete content item');
      console.error('Error deleting content item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    contentItems,
    selectedContentItem,
    isLoading,
    error,
    fetchContentItems,
    fetchContentItemsBySubject,
    fetchContentItemsByChapter,
    fetchUserContentItems,
    fetchContentItem,
    selectContentItem,
    createContentItem,
    updateContentItem,
    deleteContentItem,
  };

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};

export const useContent = (): ContentContextType => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
