import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Subscription {
  id: number;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  max_exams: number;
  features: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface User {
  username: string;
  email: string;
  id: number;
  role: string;
  created_at: string;
  updated_at: string | null;
}

export interface ActiveUserSubscription {
  user_id: number;
  subscription_plan_packages_id: number;
  start_date: string;
  end_date: string;
  status: string;
  id: number;
  created_at: string;
  updated_at: string | null;
  user: User;
  subscription_plan_package: {
    id: number;
    subscription_id: number;
    package_id: number;
    created_at: string;
  };
}

export interface Stream {
  id: number;
  name: string;
  description: string;
  class_id: number;
  class_: {
    id: number;
    name: string;
    description: string;
  };
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  description: string;
  stream_id: number;
  stream: Stream;
}

export interface Chapter {
  id: number;
  name: string;
  description: string;
  subject_id: number;
  chapter_number: number;
  subject: Subject;
}

export interface Topic {
  id: number;
  name: string;
  description: string;
  chapter_id: number;
  chapter: Chapter;
}

export interface Creator {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface Course {
  id: number;
  name: string;
  description: string;
  duration: number;
  is_active: boolean;
  level: string;
  created_at: string;
  updated_at: string | null;
  stream: Stream;
  subject: Subject;
  chapter: Chapter;
  topic: Topic;
  creator: Creator;
}

export interface Package {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: Creator;
  courses: Course[];
}

export interface SubscriptionPackage {
  subscription_id: number;
  package_id?: number;  // Make optional for backward compatibility
  id: number;
  created_at: string;
  updated_at: string | null;
  subscription: Subscription;
  package?: Package;  // Make optional for backward compatibility
  // Add new properties for the updated API structure
  package_ids?: number[];
  packages?: Package[];
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  };
};

const transformSubscription = (data: any): Subscription => {
  return {
    id: data.id,
    name: data.name || '',
    description: data.description || '',
    duration_days: Number(data.duration_days) || 0,
    price: Number(data.price) || 0,
    max_exams: Number(data.max_exams) || 0,
    features: data.features || '',
    is_active: Boolean(data.is_active),
    created_at: data.created_at || '',
    updated_at: data.updated_at || null
  };
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/subscriptions/subscriptions/`,
      getAuthHeaders()
    );
    // Transform each subscription in the response
    return Array.isArray(response.data) 
      ? response.data.map(transformSubscription)
      : [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to view subscriptions');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch subscriptions');
    }
    throw error;
  }
};

export const getSubscriptionById = async (id: number): Promise<Subscription> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/subscriptions/subscriptions/${id}`,
      getAuthHeaders()
    );
    return transformSubscription(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to view subscription details');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch subscription');
    }
    throw error;
  }
};

export const getActiveUserSubscription = async (userId: number): Promise<ActiveUserSubscription[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/subscriptions/subscriptions/user/${userId}/active`,
      getAuthHeaders()
    );
    // If the response is an array, return it, otherwise wrap the single item in an array
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to view your subscription');
      }
      if (error.response?.status === 404) {
        throw new Error('No active subscription found');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch active subscription');
    }
    throw error;
  }
};

interface CreateSubscriptionRequest {
  user_id: number;
  subscription_plan_packages_id: number;
  start_date: string;
  end_date: string;
  status: string;
}

export const createUserSubscription = async (data: CreateSubscriptionRequest): Promise<ActiveUserSubscription> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/subscriptions/subscriptions/user`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to create a subscription');
      }
      throw new Error(error.response?.data?.detail || 'Failed to create subscription');
    }
    throw error;
  }
};

export const cancelUserSubscription = async (userSubscriptionId: number): Promise<ActiveUserSubscription> => {
  try {
    const response = await axios.put(
      `${API_URL}/api/subscriptions/subscriptions/user/${userSubscriptionId}/cancel`,
      {},
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to cancel subscription');
      }
      if (error.response?.status === 404) {
        throw new Error('Subscription not found');
      }
      throw new Error(error.response?.data?.detail || 'Failed to cancel subscription');
    }
    throw error;
  }
};

export const renewUserSubscription = async (userId: number, subscriptionPackageId: number): Promise<ActiveUserSubscription> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/subscriptions/subscriptions/user/${userId}/renew/${subscriptionPackageId}`,
      {},
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to renew subscription');
      }
      if (error.response?.status === 404) {
        throw new Error('User or subscription not found');
      }
      throw new Error(error.response?.data?.detail || 'Failed to renew subscription');
    }
    throw error;
  }
};

export const getSubscriptionPackages = async (): Promise<SubscriptionPackage[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/subscription-packages`,
      getAuthHeaders()
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Please login to view subscription packages');
      }
      throw new Error(error.response?.data?.detail || 'Failed to fetch subscription packages');
    }
    throw error;
  }
}; 