import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MainLayout, AdminSidebar } from '../../components/layout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
    [key: string]: any;
  };
  onLogout: () => void;
}

interface Subscription {
  id?: number;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  max_exams: number;
  features: 'Premium' | 'Limited' | 'Basic';
  is_active: boolean;
  created_at?: string;
  updated_at?: string | null;
}

const initialFormState: Subscription = {
  name: '',
  description: '',
  duration_days: 30,
  price: 0,
  max_exams: 0,
  features: 'Basic',
  is_active: true,
};

const getFeaturesList = (tier: 'Premium' | 'Limited' | 'Basic') => {
  switch (tier) {
    case 'Premium':
      return [
        '✓ Unlimited access to all courses',
        '✓ Priority support 24/7',
        '✓ Downloadable resources',
        '✓ Certificate of completion',
        '✓ Live mentoring sessions',
        '✓ Access to premium workshops'
      ];
    case 'Limited':
      return [
        '✓ Access to selected courses',
        '✓ Email support',
        '✓ Basic resources',
        '✓ Certificate of completion',
        '✓ Group mentoring sessions'
      ];
    case 'Basic':
      return [
        '✓ Access to basic courses',
        '✓ Community support',
        '✓ Basic resources',
        '✓ Course completion badge'
      ];
    default:
      return [];
  }
};

const getBadgeStyle = (tier: 'Premium' | 'Limited' | 'Basic') => {
  switch (tier) {
    case 'Premium':
      return 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white';
    case 'Limited':
      return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    case 'Basic':
      return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const Subscriptions: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [formData, setFormData] = useState<Subscription>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/subscriptions/subscriptions/`, getAuthHeaders());
      setSubscriptions(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (isEditing && formData.id) {
        await axios.put(
          `${API_URL}/api/subscriptions/subscriptions/${formData.id}/`,
          formData,
          getAuthHeaders()
        );
      } else {
        await axios.post(
          `${API_URL}/api/subscriptions/subscriptions/`,
          formData,
          getAuthHeaders()
        );
      }
      setFormData(initialFormState);
      setIsEditing(false);
      setShowModal(false);
      fetchSubscriptions();
      setError(null);
    } catch (err) {
      setError('Failed to save subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setFormData(subscription);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        setLoading(true);
        await axios.delete(
          `${API_URL}/api/subscriptions/subscriptions/${id}/`,
          getAuthHeaders()
        );
        fetchSubscriptions();
        setError(null);
      } catch (err) {
        setError('Failed to delete subscription');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateNew = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(initialFormState);
    setIsEditing(false);
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="mb-8 bg-blue-500 rounded-lg shadow-md p-6 mx-8 mt-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
            <p className="text-blue-100">Manage your subscription plans and pricing</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-8 pb-6">
          <div className="max-w-7xl mx-auto">
            {/* Action Button */}
            <div className="mb-6 flex justify-end">
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create Plan
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {subscriptions.map((subscription) => (
                  <Card key={subscription.id} className="relative">
                    <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-semibold ${getBadgeStyle(subscription.features)}`}>
                      {subscription.features}
              </div>
              <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900">{subscription.name}</h3>
                      <p className="mt-2 text-sm text-gray-500">{subscription.description}</p>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">${subscription.price}</span>
                        <span className="text-sm text-gray-500">/{subscription.duration_days} days</span>
                      </div>
                      <ul className="mt-6 space-y-4">
                        {getFeaturesList(subscription.features).map((feature, index) => (
                          <li key={index} className="flex text-sm text-gray-500">
                            <span className="text-green-500 mr-2">{feature.charAt(0)}</span>
                            {feature.slice(2)}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 flex space-x-3">
                        <button
                          onClick={() => handleEdit(subscription)}
                          className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => subscription.id && handleDelete(subscription.id)}
                          className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    onClick={closeModal}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Plan Name</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        name="description"
                        id="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price ($)</label>
                        <input
                          type="number"
                          name="price"
                          id="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="duration_days" className="block text-sm font-medium text-gray-700">Duration (days)</label>
                        <input
                          type="number"
                          name="duration_days"
                          id="duration_days"
                          value={formData.duration_days}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="max_exams" className="block text-sm font-medium text-gray-700">Maximum Exams</label>
                      <input
                        type="number"
                        name="max_exams"
                        id="max_exams"
                        value={formData.max_exams}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="features" className="block text-sm font-medium text-gray-700">Features Tier</label>
                      <select
                        name="features"
                        id="features"
                        value={formData.features}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="Basic">Basic</option>
                        <option value="Limited">Limited</option>
                        <option value="Premium">Premium</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                        id="is_active"
                      checked={formData.is_active}
                      onChange={handleCheckboxChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">Active Plan</label>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      {isEditing ? 'Update Plan' : 'Create Plan'}
                    </button>
                  </div>
                </form>
                  </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Subscriptions; 