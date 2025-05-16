import React, { useEffect, useState } from 'react';
import MainLayout from '../../../components/layout/MainLayout';
import AdminSidebar from '../AdminSidebar';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface Creator {
  email: string;
  username: string;
  role: string;
  id: number;
  created_at: string;
  updated_at: string | null;
}

interface Course {
  id: number;
  name: string;
  description: string;
  level: string;
  duration: number;
}

interface Package {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: Creator;
  courses: Course[];
}

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

interface PackageSubscriptionMapping {
  id: number;
  package_id: number | any;  // Keep for backward compatibility
  subscription_id: number;
  created_at: string;
  package?: Package;
  subscription?: Subscription;
  package_name?: string;
  subscription_name?: string;
  package_ids?: number[];  // Added for new API structure
  packages?: Package[];    // Added for new API structure
  updated_at?: string | null;
}

const PackageMappingPage: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [mappings, setMappings] = useState<PackageSubscriptionMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<number[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<number | null>(null);
  const [editingMapping, setEditingMapping] = useState<PackageSubscriptionMapping | null>(null);

  useEffect(() => {
    fetchPackages();
    fetchSubscriptions();
    fetchMappings();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API_URL}/api/packages/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        
      });
      setPackages(response.data);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError('Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${API_URL}/api/subscriptions/subscriptions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setSubscriptions(response.data);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to fetch subscriptions');
    }
  };

  const fetchMappings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${API_URL}/api/subscription-packages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Raw API response data:', response.data);
      
      // Process the data to handle both old and new API structures
      const processedMappings = response.data.map((mapping: any) => {
        console.log('Processing mapping:', mapping);
        
        // Handle the updated API response structure with multiple packages
        const processed = {
          ...mapping,
          // For display in the table, join package names if multiple
          package_name: mapping.packages && mapping.packages.length > 0 
            ? mapping.packages.map((pkg: Package) => pkg.name).join(', ')
            : (mapping.package ? mapping.package.name : 
              (typeof mapping.package_name === 'object' ? mapping.package_name.name : mapping.package_name || 'Multiple Packages')),
          
          subscription_name: mapping.subscription ? mapping.subscription.name : 
                          (typeof mapping.subscription_name === 'object' ? mapping.subscription_name.name : mapping.subscription_name),
          
          // Ensure package_ids is always available
          package_ids: mapping.package_ids || 
            (mapping.package_id ? [typeof mapping.package_id === 'object' ? mapping.package_id.id : mapping.package_id] : []),
            
          // Ensure package_id is available for backward compatibility
          package_id: mapping.package_id || 
            (mapping.package_ids && mapping.package_ids.length > 0 ? mapping.package_ids[0] : null)
        };
        
        console.log('Processed mapping:', processed);
        return processed;
      });
      
      setMappings(processedMappings);
    } catch (err) {
      console.error('Error fetching mappings:', err);
      // Mock data for demonstration if API doesn't exist yet
      setMappings([]);
    }
  };

  const handleCreateMapping = async () => {
    if (!selectedSubscription) {
      setError('Please select a subscription');
      return;
    }

    if (selectedPackages.length === 0) {
      setError('Please select at least one package');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Prepare the data for API submission
      const mappingData = {
        subscription_id: selectedSubscription,
        package_ids: selectedPackages
      };
      
      // Use the correct API endpoint
      await axios.post(`${API_URL}/api/subscription-packages/bulk`, mappingData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setShowCreateModal(false);
      setSelectedSubscription(null);
      setSelectedPackages([]);
      fetchMappings();
    } catch (err) {
      console.error('Error creating mapping:', err);
      setError('Failed to create mapping');
    }
  };

  const handleEditMapping = async () => {
    if (!selectedSubscription) {
      setError('Please select a subscription');
      return;
    }

    if (selectedPackages.length === 0) {
      setError('Please select at least one package');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Prepare the data for API submission
      const mappingData = {
        subscription_id: selectedSubscription,
        package_ids: selectedPackages
      };
      
      // First delete the existing mapping
      if (editingMapping) {
        await axios.delete(`${API_URL}/api/subscription-packages/${editingMapping.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
      }
      
      // Then create the new mapping
      await axios.post(`${API_URL}/api/subscription-packages/bulk`, mappingData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      setShowEditModal(false);
      setEditingMapping(null);
      setSelectedSubscription(null);
      setSelectedPackages([]);
      fetchMappings();
    } catch (err) {
      console.error('Error updating mapping:', err);
      setError('Failed to update mapping');
    }
  };

  const handleDeleteMapping = async (mappingId: number) => {
    if (!window.confirm('Are you sure you want to delete this mapping?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Use the correct API endpoint
          await axios.delete(`${API_URL}/api/subscription-packages/${mappingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      fetchMappings();
    } catch (err) {
      console.error('Error deleting mapping:', err);
      setError('Failed to delete mapping');
    }
  };

  // Handle package selection/deselection
  const togglePackageSelection = (packageId: number) => {
    if (selectedPackages.includes(packageId)) {
      setSelectedPackages(selectedPackages.filter(id => id !== packageId));
    } else {
      setSelectedPackages([...selectedPackages, packageId]);
    }
  };

  // Handle opening the edit modal
  const openEditModal = (mapping: PackageSubscriptionMapping) => {
    setEditingMapping(mapping);
    setSelectedSubscription(mapping.subscription_id);
    
    // Handle multiple package IDs in the new structure
    if (mapping.package_ids && mapping.package_ids.length > 0) {
      // Use the array of package IDs directly
      setSelectedPackages(mapping.package_ids);
    } else if (typeof mapping.package_id !== 'undefined') {
      // Backward compatibility for old structure
    const packageId = typeof mapping.package_id === 'object' && mapping.package_id !== null
      ? (mapping.package_id as any).id 
      : mapping.package_id;
    
    setSelectedPackages([packageId]);
    } else {
      setSelectedPackages([]);
    }
    
    setShowEditModal(true);
  };

  // Add new function to get unmapped subscriptions
  const getUnmappedSubscriptions = () => {
    // Get all subscription IDs that are already mapped
    const mappedSubscriptionIds = new Set(mappings.map(mapping => mapping.subscription_id));
    
    // Filter out subscriptions that are already mapped
    return subscriptions.filter(subscription => !mappedSubscriptionIds.has(subscription.id));
  };

  // Add new function to get unmapped subscriptions plus current subscription for edit modal
  const getUnmappedSubscriptionsForEdit = (currentSubscriptionId: number) => {
    // Get all subscription IDs that are already mapped
    const mappedSubscriptionIds = new Set(mappings.map(mapping => mapping.subscription_id));
    
    // Remove the current subscription ID from the mapped set
    mappedSubscriptionIds.delete(currentSubscriptionId);
    
    // Filter out subscriptions that are already mapped, except the current one
    return subscriptions.filter(subscription => 
      !mappedSubscriptionIds.has(subscription.id) || subscription.id === currentSubscriptionId
    );
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8 bg-blue-500 p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="mr-4 bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-lg shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                  <path d="M15 15H9v-3a3 3 0 0 1 6 0v3z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Package Subscription Mapping</h1>
                <p className="text-blue-100 text-sm mt-1">Manage package to subscription mappings</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-blue-600 px-4 py-2 rounded-md shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white transition-colors duration-150 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Mapping
            </button>
          </div>

          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          {!loading && !error && mappings.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <h2 className="text-xl font-medium text-gray-700 mb-2">No package subscription mappings available</h2>
              <p className="text-gray-500 mb-6">Create your first package subscription mapping by clicking the button above.</p>
            </div>
          )}
          
          {!loading && !error && mappings.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription
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
                  {mappings.map(mapping => (
                    <tr key={mapping.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {mapping.packages && mapping.packages.length > 0 ? (
                            <div>
                              <span className="font-semibold">{mapping.packages.length} packages:</span>
                              <ul className="mt-1 space-y-1">
                                {mapping.packages.slice(0, 3).map((pkg: Package) => (
                                  <li key={pkg.id} className="text-gray-600">{pkg.name}</li>
                                ))}
                                {mapping.packages.length > 3 && (
                                  <li className="text-gray-500 text-xs italic">
                                    + {mapping.packages.length - 3} more packages
                                  </li>
                                )}
                              </ul>
                            </div>
                          ) : (
                            mapping.package_name || 
                           (mapping.package && mapping.package.name) || 
                            'Unknown Package'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {mapping.subscription_name || 
                           (mapping.subscription && mapping.subscription.name) || 
                           'Unknown Subscription'}
                          </div>
                          {mapping.package_ids && mapping.package_ids.length > 0 && (
                            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              {mapping.package_ids.length} packages
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mapping.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(mapping)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteMapping(mapping.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Mapping Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[550px] max-h-[90vh] overflow-hidden">
            <div className="bg-blue-50 py-4 px-6 border-b border-blue-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-800">Create New Package Subscription Mapping</h2>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSubscription(null);
                  setSelectedPackages([]);
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-110px)]">
              <div className="space-y-5">
                {error && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded shadow-sm text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Subscription</label>
                  <select
                    value={selectedSubscription || ''}
                    onChange={(e) => setSelectedSubscription(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select a subscription --</option>
                    {getUnmappedSubscriptions().map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name} (${sub.price} / {sub.duration_days} days)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Select Packages</label>
                    <div className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {selectedPackages.length} selected
                    </div>
                  </div>
                  <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto">
                    {packages.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No packages available
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {packages.map(pkg => (
                          <div 
                            key={pkg.id} 
                            className={`p-3 hover:bg-gray-50 cursor-pointer ${
                              selectedPackages.includes(pkg.id) ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => togglePackageSelection(pkg.id)}
                          >
                            <div className="flex items-start">
                              <input
                                type="checkbox"
                                checked={selectedPackages.includes(pkg.id)}
                                onChange={() => togglePackageSelection(pkg.id)}
                                className="h-4 w-4 mt-1 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <div className="ml-3">
                                <div className="font-medium text-gray-800">{pkg.name}</div>
                                <div className="text-sm text-gray-500 line-clamp-2">{pkg.description}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {pkg.courses.length} course{pkg.courses.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSubscription(null);
                  setSelectedPackages([]);
                  setError(null);
                }}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMapping}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mapping Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[550px] max-h-[90vh] overflow-hidden">
            <div className="bg-blue-50 py-4 px-6 border-b border-blue-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-800">Edit Package Subscription Mapping</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMapping(null);
                  setSelectedSubscription(null);
                  setSelectedPackages([]);
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-110px)]">
              <div className="space-y-5">
                {error && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded shadow-sm text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Subscription</label>
                  <select
                    value={selectedSubscription || ''}
                    onChange={(e) => setSelectedSubscription(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select a subscription --</option>
                    {editingMapping && getUnmappedSubscriptionsForEdit(editingMapping.subscription_id).map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name} (${sub.price} / {sub.duration_days} days)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Select Packages</label>
                    <div className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {selectedPackages.length} selected
                    </div>
                  </div>
                  <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto">
                    {packages.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No packages available
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {packages.map(pkg => (
                          <div 
                            key={pkg.id} 
                            className={`p-3 hover:bg-gray-50 cursor-pointer ${
                              selectedPackages.includes(pkg.id) ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => togglePackageSelection(pkg.id)}
                          >
                            <div className="flex items-start">
                              <input
                                type="checkbox"
                                checked={selectedPackages.includes(pkg.id)}
                                onChange={() => togglePackageSelection(pkg.id)}
                                className="h-4 w-4 mt-1 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <div className="ml-3">
                                <div className="font-medium text-gray-800">{pkg.name}</div>
                                <div className="text-sm text-gray-500 line-clamp-2">{pkg.description}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {pkg.courses.length} course{pkg.courses.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMapping(null);
                  setSelectedSubscription(null);
                  setSelectedPackages([]);
                  setError(null);
                }}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMapping}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Update Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default PackageMappingPage;