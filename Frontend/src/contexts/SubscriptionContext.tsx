import React, { createContext, useContext, useState, ReactNode } from 'react';
import apiService from '../services/api';

interface Subscription {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

interface UserSubscription {
  id: number;
  user_id: number;
  subscription_id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  subscription?: Subscription;
}

interface SubscriptionContextType {
  subscriptions: Subscription[];
  userSubscriptions: UserSubscription[];
  activeUserSubscription: UserSubscription | null;
  selectedSubscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  fetchSubscriptions: () => Promise<void>;
  fetchAllSubscriptions: () => Promise<void>;
  fetchSubscription: (subscriptionId: number) => Promise<Subscription>;
  fetchUserSubscriptions: (userId: number) => Promise<void>;
  fetchActiveUserSubscription: (userId: number) => Promise<UserSubscription | null>;
  selectSubscription: (subscription: Subscription) => void;
  createSubscription: (subscriptionData: any) => Promise<Subscription>;
  updateSubscription: (subscriptionId: number, subscriptionData: any) => Promise<Subscription>;
  deleteSubscription: (subscriptionId: number) => Promise<void>;
  createUserSubscription: (userSubscriptionData: any) => Promise<UserSubscription>;
  updateUserSubscription: (userSubscriptionId: number, userSubscriptionData: any) => Promise<UserSubscription>;
  cancelUserSubscription: (userSubscriptionId: number) => Promise<UserSubscription>;
  renewUserSubscription: (userId: number, subscriptionId: number) => Promise<UserSubscription>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [activeUserSubscription, setActiveUserSubscription] = useState<UserSubscription | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.subscriptions.getAll({});
      setSubscriptions(data as Subscription[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch subscriptions');
      console.error('Error fetching subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllSubscriptions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.subscriptions.getAll({ all: true });
      setSubscriptions(data as Subscription[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch all subscriptions');
      console.error('Error fetching all subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscription = async (subscriptionId: number): Promise<Subscription> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.subscriptions.getById(subscriptionId);
      const subscription = data as Subscription;
      setSelectedSubscription(subscription);
      return subscription;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch subscription');
      console.error('Error fetching subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSubscriptions = async (userId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.userSubscriptions.getByUserId(userId);
      setUserSubscriptions(data as UserSubscription[]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch user subscriptions');
      console.error('Error fetching user subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveUserSubscription = async (userId: number): Promise<UserSubscription | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.userSubscriptions.getByUserId(userId);
      const userSubscriptions = data as UserSubscription[];
      const activeSubscription = userSubscriptions.find(sub => sub.is_active) || null;
      setActiveUserSubscription(activeSubscription);
      return activeSubscription;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No active subscription found, not an error
        setActiveUserSubscription(null);
        return null;
      }
      setError(error.response?.data?.detail || 'Failed to fetch active user subscription');
      console.error('Error fetching active user subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const selectSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
  };

  const createSubscription = async (subscriptionData: any): Promise<Subscription> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.subscriptions.create(subscriptionData);
      const newSubscription = data as Subscription;
      setSubscriptions([...subscriptions, newSubscription]);
      return newSubscription;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create subscription');
      console.error('Error creating subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubscription = async (subscriptionId: number, subscriptionData: any): Promise<Subscription> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.subscriptions.update(subscriptionId, subscriptionData);
      const updatedSubscription = data as Subscription;
      setSubscriptions(subscriptions.map(sub => sub.id === subscriptionId ? updatedSubscription : sub));
      if (selectedSubscription && selectedSubscription.id === subscriptionId) {
        setSelectedSubscription(updatedSubscription);
      }
      return updatedSubscription;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update subscription');
      console.error('Error updating subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSubscription = async (subscriptionId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiService.subscriptions.delete(subscriptionId);
      setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionId));
      if (selectedSubscription && selectedSubscription.id === subscriptionId) {
        setSelectedSubscription(null);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete subscription');
      console.error('Error deleting subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createUserSubscription = async (userSubscriptionData: any): Promise<UserSubscription> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.userSubscriptions.create(userSubscriptionData);
      const newUserSubscription = data as UserSubscription;
      setUserSubscriptions([...userSubscriptions, newUserSubscription]);
      if (newUserSubscription.is_active) {
        setActiveUserSubscription(newUserSubscription);
      }
      return newUserSubscription;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create user subscription');
      console.error('Error creating user subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserSubscription = async (userSubscriptionId: number, userSubscriptionData: any): Promise<UserSubscription> => {
    setIsLoading(true);
    setError(null);
    try {
      // Since there's no update method, we'll cancel the existing subscription and create a new one
      await apiService.userSubscriptions.cancel(userSubscriptionId);
      const { data } = await apiService.userSubscriptions.create(userSubscriptionData);
      const newUserSubscription = data as UserSubscription;
      setUserSubscriptions(userSubscriptions.map(sub => sub.id === userSubscriptionId ? newUserSubscription : sub));
      if (activeUserSubscription && activeUserSubscription.id === userSubscriptionId) {
        setActiveUserSubscription(newUserSubscription);
      }
      return newUserSubscription;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update user subscription');
      console.error('Error updating user subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelUserSubscription = async (userSubscriptionId: number): Promise<UserSubscription> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.userSubscriptions.cancel(userSubscriptionId);
      const updatedUserSubscription = data as UserSubscription;
      setUserSubscriptions(userSubscriptions.map(sub => sub.id === userSubscriptionId ? updatedUserSubscription : sub));
      if (activeUserSubscription && activeUserSubscription.id === userSubscriptionId) {
        setActiveUserSubscription(null);
      }
      return updatedUserSubscription;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to cancel user subscription');
      console.error('Error canceling user subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const renewUserSubscription = async (userId: number, subscriptionId: number): Promise<UserSubscription> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiService.userSubscriptions.create({ user_id: userId, subscription_id: subscriptionId });
      const newUserSubscription = data as UserSubscription;
      setUserSubscriptions([...userSubscriptions, newUserSubscription]);
      setActiveUserSubscription(newUserSubscription);
      return newUserSubscription;
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to renew user subscription');
      console.error('Error renewing user subscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    subscriptions,
    userSubscriptions,
    activeUserSubscription,
    selectedSubscription,
    isLoading,
    error,
    fetchSubscriptions,
    fetchAllSubscriptions,
    fetchSubscription,
    fetchUserSubscriptions,
    fetchActiveUserSubscription,
    selectSubscription,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    createUserSubscription,
    updateUserSubscription,
    cancelUserSubscription,
    renewUserSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
