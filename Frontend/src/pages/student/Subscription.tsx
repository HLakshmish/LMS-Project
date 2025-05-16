import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
import jsPDF from 'jspdf';
import { 
  getSubscriptions, 
  getSubscriptionById, 
  getActiveUserSubscription,
  createUserSubscription,
  cancelUserSubscription,
  renewUserSubscription,
  getSubscriptionPackages,
  Subscription as SubscriptionType,
  ActiveUserSubscription,
  Course,
  Package,
  SubscriptionPackage,
  Stream,
  Subject,
  Chapter,
  Topic,
  Creator
} from '../../services/subscriptionService';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface SubscriptionPlan extends SubscriptionType {
  isCurrent?: boolean;
  package?: Package;
  package_ids?: number[];
  packages?: Package[];
}

interface CurrentSubscription {
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  nextBillingDate: string;
  price: number;
  interval: 'month' | 'year';
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface SubscriptionPackageResponse {
  subscription_id: number;
  package_id?: number;  // Optional for backward compatibility
  id: number;
  created_at: string;
  updated_at: string;
  subscription: {
    name: string;
    description: string;
    duration_days: number;
    price: number;
    max_exams: number;
    features: string;
    is_active: boolean;
    id: number;
    created_at: string;
    updated_at: string;
  };
  package?: Package;  // Optional for backward compatibility
  // New fields for multiple packages
  package_ids?: number[];
  packages?: Package[];
}

interface BillingRecord {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  subscription_id: number;
  subscription_name: string;
  receipt_url?: string;
}

const Subscription: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscriptions, setCurrentSubscriptions] = useState<ActiveUserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null);
  const [selectedSubscriptionPackageId, setSelectedSubscriptionPackageId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingPlanDetails, setLoadingPlanDetails] = useState(false);
  const [showPlanDetailsModal, setShowPlanDetailsModal] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<SubscriptionPlan | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [availableSubscriptions, setAvailableSubscriptions] = useState<SubscriptionPackageResponse[]>([]);
  const [selectedUpgradeSubscription, setSelectedUpgradeSubscription] = useState<SubscriptionPackageResponse | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentSubscriptionDetails, setCurrentSubscriptionDetails] = useState<Record<number, SubscriptionType | null>>({});
  // Add a loading state for plan details
  const [planDetailsLoading, setPlanDetailsLoading] = useState(false);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);

  // Get user ID from localStorage
  const getUserId = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        return parsedUser.id;
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  };

  // Function to generate PDF receipt
  const generateReceipt = async (record: BillingRecord) => {
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Add logo or header
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 255);
      doc.text('CREATIVE-LMS', 105, 20, { align: 'center' });
      
      // Add receipt title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('RECEIPT', 105, 30, { align: 'center' });
      
      // Add receipt details
      doc.setFontSize(12);
      doc.text('Receipt No:', 20, 50);
      doc.text(record.id, 80, 50);
      
      doc.text('Date:', 20, 60);
      doc.text(formatDate(record.date), 80, 60);
      
      doc.text('Description:', 20, 70);
      doc.text(record.description, 80, 70);
      
      doc.text('Status:', 20, 80);
      doc.text(record.status.toUpperCase(), 80, 80);
      
      // Add amount with a line
      doc.line(20, 90, 190, 90);
      doc.setFontSize(14);
      doc.text('Amount:', 20, 100);
      doc.text(`$${record.amount.toFixed(2)}`, 80, 100);
      doc.line(20, 110, 190, 110);
      
      // Add footer
      doc.setFontSize(10);
      doc.text('Your subscription has been activated successfully. Thank you for choosing us.!', 105, 130, { align: 'center' });
      doc.text('This is a computer-generated receipt.', 105, 140, { align: 'center' });
      
      // Save the PDF
      doc.save(`receipt-${record.id}.pdf`);
    } catch (err) {
      console.error('Error generating receipt:', err);
      alert('Failed to generate receipt!');
    }
  };

  // Function to generate billing records from subscriptions
  const generateBillingRecords = (subscriptions: ActiveUserSubscription[], details: Record<number, SubscriptionType | null>) => {
    const records: BillingRecord[] = [];
    
    subscriptions.forEach(subscription => {
      const subscriptionDetails = details[subscription.subscription_plan_packages_id];
      if (subscriptionDetails) {
        // Create a record for the initial subscription
        records.push({
          id: `${subscription.id}-initial`,
          date: subscription.created_at,
          amount: subscriptionDetails.price,
          status: 'paid',
          description: `${subscriptionDetails.name} Subscription`,
          subscription_id: subscriptionDetails.id,
          subscription_name: subscriptionDetails.name
        });

        // If the subscription has been renewed, create records for renewals
        if (subscription.updated_at && subscription.updated_at !== subscription.created_at) {
          records.push({
            id: `${subscription.id}-renewal`,
            date: subscription.updated_at,
            amount: subscriptionDetails.price,
            status: 'paid',
            description: `${subscriptionDetails.name} Subscription Renewal`,
            subscription_id: subscriptionDetails.id,
            subscription_name: subscriptionDetails.name
          });
        }
      }
    });

    // Sort records by date in descending order
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user ID
        const userId = getUserId();
        console.log('User ID:', userId);

        if (!userId) {
          throw new Error('User ID not found');
        }

        // Get token for API request
        const token = localStorage.getItem('token');
        if (token) {
          // Fetch all subscription packages to display IDs on page load
          try {
            const response = await axios.get(`${API_URL}/api/subscription-packages/`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'accept': 'application/json'
              }
            });
            
            // Log all subscription package IDs on page load
            console.log('------ SUBSCRIPTION PLAN PACKAGES IDs ------');
            response.data.forEach((pkg: any) => {
              // Handle both new and old API response formats
              if (pkg.package_ids) {
                console.log(`subscription_plan_packages_id: ${pkg.id}, subscription_id: ${pkg.subscription_id}, package_ids: [${pkg.package_ids.join(', ')}]`);
              } else {
              console.log(`subscription_plan_packages_id: ${pkg.id}, subscription_id: ${pkg.subscription_id}, package_id: ${pkg.package_id}`);
              }
            });
            console.log('------------------------------------');
          } catch (error) {
            console.error('Error fetching subscription packages on page load:', error);
          }
        }

        // Fetch subscription packages using the new service function
        const packages = await getSubscriptionPackages();
        
        // Transform the data to match our SubscriptionPlan interface
        const plans = packages.map((pkg: SubscriptionPackage) => {
          let planData: SubscriptionPlan = {
          ...pkg.subscription,
            isCurrent: false
          };
          
          // Handle both single and multiple packages per subscription
          if (Array.isArray(pkg.packages)) {
            planData.packages = pkg.packages;
            planData.package_ids = pkg.package_ids || pkg.packages.map((p: Package) => p.id);
          } else if (pkg.package) {
            planData.package = pkg.package;
          }
          
          return planData;
        });
        
        // Fetch active subscriptions
        try {
          const activeSubscriptions = await getActiveUserSubscription(userId);
          console.log('Active subscriptions:', activeSubscriptions);
          setCurrentSubscriptions(activeSubscriptions);
          setHasActiveSubscription(activeSubscriptions.length > 0);

          // Create a map to store subscription details and track active subscription package IDs
          const subscriptionDetailsMap: Record<number, SubscriptionType | null> = {};
          const activeSubscriptionPackageIds: number[] = [];
          
          // Fetch subscription details for each active subscription
          for (const subscription of activeSubscriptions) {
            activeSubscriptionPackageIds.push(subscription.subscription_plan_packages_id);
            
            if (subscription.subscription_plan_package && 
                subscription.subscription_plan_package.subscription_id) {
              try {
                const subscriptionDetails = await getSubscriptionById(
                  subscription.subscription_plan_package.subscription_id
                );
                subscriptionDetailsMap[subscription.subscription_plan_packages_id] = subscriptionDetails;
              } catch (subscriptionError) {
                console.error(`Error fetching subscription details for subscription_plan_packages_id: ${subscription.subscription_plan_packages_id}:`, subscriptionError);
                subscriptionDetailsMap[subscription.subscription_plan_packages_id] = null;
              }
            }
          }
          
          // Set the subscription details
          setCurrentSubscriptionDetails(subscriptionDetailsMap);
          
          // Log active subscription package IDs
          console.log('Active subscription_plan_packages_ids:', activeSubscriptionPackageIds);
          
          // Mark plans as current if they match any active subscription
          const plansWithCurrent = plans.map((plan: SubscriptionPlan) => {
            // For plans with multiple packages
            if (plan.packages && plan.packages.length > 0) {
              // Check if this subscription's ID matches any active subscription
              const matchingActiveSubscription = activeSubscriptions.find(
                sub => sub.subscription_plan_package.subscription_id === plan.id
              );
              
              // If there's a matching active subscription, mark as current
              const isCurrentPlan = !!matchingActiveSubscription;
              
              console.log(`Plan ${plan.name} (ID: ${plan.id}, Multiple Packages): isCurrent = ${isCurrentPlan}`);
              
              return {
            ...plan,
                isCurrent: isCurrentPlan
              };
            } else {
              // Original logic for single package plans
            const isCurrentPlan = packages.some((pkg: SubscriptionPackage) => {
              // First check if subscription and package exist
              if (!pkg.subscription || !pkg.package) return false;
              
              // Then check if this is the current plan
              return pkg.subscription.id === plan.id && 
                     pkg.package.id === plan.package?.id && 
                     activeSubscriptionPackageIds.includes(pkg.id);
            });
            
            console.log(`Plan ${plan.name} (ID: ${plan.id}, Package: ${plan.package?.id}): isCurrent = ${isCurrentPlan}`);
            
            return {
              ...plan,
              isCurrent: isCurrentPlan
            };
            }
          });
          
          setSubscriptionPlans(plansWithCurrent);
        } catch (err) {
          if (err instanceof Error && !err.message.includes('No active subscription found')) {
            throw err;
          }
          setHasActiveSubscription(false);
          setSubscriptionPlans(plans);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription plans';
        setError(errorMessage);
        console.error('Error fetching subscriptions:', err);
        
        if (errorMessage.includes('Please login')) {
          navigate('/login', { state: { from: '/student/subscription' } });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    // Update billing records whenever subscriptions or details change
    const records = generateBillingRecords(currentSubscriptions, currentSubscriptionDetails);
    setBillingRecords(records);
  }, [currentSubscriptions, currentSubscriptionDetails]);

  const handleSelectPlan = async (planId: number, packageId?: number) => {
    try {
      setLoadingPlanDetails(true);
      
      // Get the token for API request
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      try {
        // Fetch all subscription packages to find the exact subscription_packages_id
        const response = await axios.get(`${API_URL}/api/subscription-packages/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        });
        
        // Find all matching subscription packages for this subscription
        const matchingPackages = response.data.filter(
          (pkg: any) => pkg.subscription_id === planId
        );
        
        if (matchingPackages.length > 0) {
          // Check if the package has multiple packages
          if (matchingPackages[0].package_ids && matchingPackages[0].packages) {
            console.log('Subscription has multiple packages:', matchingPackages[0].packages.map((p: any) => p.name).join(', '));
            
            // If a specific packageId was provided, ensure it's in the package_ids array
          if (packageId) {
              if (matchingPackages[0].package_ids.includes(packageId)) {
                console.log('Selected subscription_plan_packages_id with multiple packages:', matchingPackages[0].id);
                setSelectedSubscriptionPackageId(matchingPackages[0].id);
              } else {
                console.error('Provided packageId is not in the package_ids array');
                setSelectedSubscriptionPackageId(null);
              }
            } else {
              // If no packageId provided, use the first matching package
              console.log('Selected subscription_plan_packages_id with multiple packages:', matchingPackages[0].id);
              setSelectedSubscriptionPackageId(matchingPackages[0].id);
            }
          } else if (packageId) {
            // Original logic for single package per subscription
            const exactPackage = matchingPackages.find(
              (pkg: SubscriptionPackageResponse) => pkg.package_id === packageId
            );
            
            if (exactPackage) {
              // Log the subscription_plan_packages_id which will be used to mark as current plan
              console.log('Selected subscription_plan_packages_id:', exactPackage.id);
              setSelectedSubscriptionPackageId(exactPackage.id);
            } else {
              // Show all matching IDs if no packageId is provided
              console.log('------ AVAILABLE SUBSCRIPTION PACKAGE IDs ------');
              matchingPackages.forEach((pkg: SubscriptionPackageResponse) => {
                console.log(`subscription_plan_packages_id: ${pkg.id}, subscription_id: ${pkg.subscription_id}, package_id: ${pkg.package_id}`);
              });
              console.log('------------------------------------');
              // Use the first one as fallback
              setSelectedSubscriptionPackageId(matchingPackages[0].id);
            }
          } else {
            // Show all matching IDs if no packageId is provided
            console.log('------ AVAILABLE SUBSCRIPTION PACKAGE IDs ------');
            matchingPackages.forEach((pkg: any) => {
              if (pkg.package_ids) {
                console.log(`subscription_plan_packages_id: ${pkg.id}, subscription_id: ${pkg.subscription_id}, package_ids: [${pkg.package_ids.join(', ')}]`);
              } else {
              console.log(`subscription_plan_packages_id: ${pkg.id}, subscription_id: ${pkg.subscription_id}, package_id: ${pkg.package_id}`);
              }
            });
            console.log('------------------------------------');
            // Use the first one as fallback
            setSelectedSubscriptionPackageId(matchingPackages[0].id);
          }
        } else {
          console.log('No matching subscription package found for subscription ID:', planId);
          setSelectedSubscriptionPackageId(null);
        }
      } catch (error) {
        console.error('Error fetching subscription packages:', error);
        setSelectedSubscriptionPackageId(null);
      }
      
      const plan = await getSubscriptionById(planId);
      setSelectedPlan(plan);
      setShowModal(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plan details';
      console.error('Error fetching plan details:', err);
    } finally {
      setLoadingPlanDetails(false);
    }
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlan || !selectedSubscriptionPackageId) return;
    
    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Calculate start and end dates
      const startDate = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

      const subscriptionData = {
        user_id: userId,
        subscription_plan_packages_id: selectedSubscriptionPackageId,
        start_date: startDate,
        end_date: endDate.toISOString(),
        status: 'active'
      };

      const response = await createUserSubscription(subscriptionData);
      
      // Add the new subscription to the list
      setCurrentSubscriptions(prevSubscriptions => {
        // Create a new array to avoid mutations
        return [...prevSubscriptions, response];
      });
      setHasActiveSubscription(true);
      
      // Add the new subscription details
      if (response.subscription_plan_package && 
          response.subscription_plan_package.subscription_id) {
        try {
          const subscriptionDetails = await getSubscriptionById(
            response.subscription_plan_package.subscription_id
          );
          setCurrentSubscriptionDetails(prev => ({
            ...prev,
            [response.subscription_plan_packages_id]: subscriptionDetails
          }));
        } catch (subscriptionError) {
          console.error(`Error fetching subscription details for subscription_plan_packages_id: ${response.subscription_plan_packages_id}:`, subscriptionError);
        }
      }
      
      // Update the subscription plans to mark the new plan as current
      setSubscriptionPlans(prevPlans => 
        prevPlans.map(plan => {
          // Find if this plan matches the new subscription
          // Plan is current only if its subscription_id matches AND 
          // the subscription_plan_packages_id from the response matches the selected one
          const isCurrentPlan = 
            plan.id === response.subscription_plan_package.subscription_id && 
                               response.subscription_plan_packages_id === selectedSubscriptionPackageId;
          
          console.log(`Checking plan ${plan.name} (${plan.id}): isCurrent = ${isCurrentPlan}`, 
                     `Selected subscription_plan_packages_id: ${selectedSubscriptionPackageId}`);
          
          return {
          ...plan,
            isCurrent: plan.isCurrent || isCurrentPlan // Keep other current plans
          };
        })
      );

      setShowModal(false);

      // Optional: Show success message
      alert('Subscription confirmed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm subscription';
      console.error('Error confirming subscription:', err);
      alert(errorMessage);
    }
  };

  const handleUpgradePlan = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await axios.get(`${API_URL}/api/subscription-packages/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json'
        }
      });

      setAvailableSubscriptions(response.data);
      setShowUpgradeModal(true);
    } catch (err) {
      console.error('Error fetching subscription packages:', err);
      alert('Failed to fetch available subscriptions');
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedUpgradeSubscription) {
      alert('Please select a subscription to upgrade to');
      return;
    }

    try {
      setIsUpgrading(true);
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Use the subscription_plan_packages_id directly
      const subscriptionPackageId = selectedUpgradeSubscription.id;
      console.log("Upgrading to subscription package with ID:", subscriptionPackageId);

      const response = await axios.post(
        `${API_URL}/api/subscriptions/subscriptions/user/${userId}/renew/${subscriptionPackageId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      );

      // Update the current subscription state with the new subscription
      setCurrentSubscriptions(prevSubscriptions => [...prevSubscriptions, response.data]);
      
      // Update the subscription plans to mark the new plan as current
      console.log('Upgrade response data:', response.data);
      console.log('Selected upgrade subscription:', selectedUpgradeSubscription);
      
      setSubscriptionPlans(prevPlans => 
        prevPlans.map(plan => {
          // A plan is current if its subscription_id matches the subscription_id in the response
          const isCurrentPlan = selectedUpgradeSubscription && 
                               response.data.subscription_plan_package &&
                               plan.id === response.data.subscription_plan_package.subscription_id;
          
          return {
          ...plan,
            isCurrent: isCurrentPlan
          };
        })
      );

      setShowUpgradeModal(false);
      alert('Subscription upgraded successfully!');
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      alert('Failed to upgrade subscription');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleRenewSubscription = async () => {
    if (currentSubscriptions.length === 0) return;

    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Use the subscription_plan_packages_id directly
      const subscriptionPackageIds = currentSubscriptions.map(s => s.subscription_plan_packages_id);
      console.log("Renewing subscription packages with IDs:", subscriptionPackageIds);
      
      const responsePromises = subscriptionPackageIds.map(id => renewUserSubscription(userId, id));
      const responses = await Promise.all(responsePromises);
      
      // Update the current subscription state with the renewed subscriptions
      setCurrentSubscriptions(prevSubscriptions => {
        // Filter out the old subscriptions that were renewed
        const nonRenewedSubscriptions = prevSubscriptions.filter(sub => 
          !subscriptionPackageIds.includes(sub.subscription_plan_packages_id)
        );
        // Add the new renewed subscriptions
        return [...nonRenewedSubscriptions, ...responses];
      });

      // Fetch updated subscription details
      const newSubscriptionDetails = {...currentSubscriptionDetails};
      
      for (const response of responses) {
        if (response.subscription_plan_package && 
            response.subscription_plan_package.subscription_id) {
          try {
            const subscriptionDetails = await getSubscriptionById(
              response.subscription_plan_package.subscription_id
            );
            newSubscriptionDetails[response.subscription_plan_packages_id] = subscriptionDetails;
          } catch (subscriptionError) {
            console.error(`Error fetching subscription details for subscription_plan_packages_id: ${response.subscription_plan_packages_id}:`, subscriptionError);
          }
        }
      }
      
      // Update subscription details state with all the new details
      setCurrentSubscriptionDetails(newSubscriptionDetails);
      
      // Update the subscription plans to mark the renewed plans as current
      console.log('Marking plans as current after renewal - subscription_plan_packages_ids:', 
                 subscriptionPackageIds);
      
      setSubscriptionPlans(prevPlans => 
        prevPlans.map(plan => {
          // Check if any active subscription is for this plan
          const isCurrentPlan = responses.some(sub => 
            sub.subscription_plan_package?.subscription_id === plan.id
          );
          
          return {
          ...plan,
            isCurrent: isCurrentPlan
          };
        })
      );

      // Show success message
      alert('Subscriptions renewed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to renew subscriptions';
      console.error('Error renewing subscriptions:', err);
      alert(errorMessage);
    }
  };

  const handleCancelSubscription = async () => {
    if (currentSubscriptions.length === 0) return;

    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to cancel your subscriptions? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const responses = await Promise.all(currentSubscriptions.map(s => cancelUserSubscription(s.id)));
      
      // Update the current subscription state with the cancelled subscriptions
      setCurrentSubscriptions([]);
      
      // Update the subscription plans to remove the current plan markers
      setSubscriptionPlans(prevPlans => 
        prevPlans.map(plan => ({
          ...plan,
          isCurrent: false
        }))
      );

      // Show success message
      alert('Subscriptions cancelled successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscriptions';
      console.error('Error cancelling subscriptions:', err);
      alert(errorMessage);
    }
  };

  const handleRenewSingleSubscription = async (subscription: ActiveUserSubscription) => {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Use the subscription_plan_packages_id directly
      const subscriptionPackageId = subscription.subscription_plan_packages_id;
      console.log("Renewing subscription package with ID:", subscriptionPackageId);
      
      const response = await renewUserSubscription(userId, subscriptionPackageId);
      
      // Update the current subscriptions list
      setCurrentSubscriptions(prevSubscriptions => 
        prevSubscriptions.map(sub => 
          sub.id === subscription.id ? response : sub
        )
      );

      // Fetch updated subscription details
      if (response.subscription_plan_package && 
          response.subscription_plan_package.subscription_id) {
        try {
          const subscriptionDetails = await getSubscriptionById(
            response.subscription_plan_package.subscription_id
          );
          setCurrentSubscriptionDetails(prev => ({
            ...prev,
            [response.subscription_plan_packages_id]: subscriptionDetails
          }));
        } catch (subscriptionError) {
          console.error(`Error fetching subscription details for subscription_plan_packages_id: ${response.subscription_plan_packages_id}:`, subscriptionError);
        }
      }

      // Show success message
      alert('Subscription renewed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to renew subscription';
      console.error('Error renewing subscription:', err);
      alert(errorMessage);
    }
  };

  const handleCancelSingleSubscription = async (subscription: ActiveUserSubscription) => {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to cancel this subscription? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const response = await cancelUserSubscription(subscription.id);
      
      // Remove the cancelled subscription from the list
      setCurrentSubscriptions(prevSubscriptions => 
        prevSubscriptions.filter(sub => sub.id !== subscription.id)
      );
      
      // Update the subscription plans to remove the current plan marker for this subscription
      setSubscriptionPlans(prevPlans => 
        prevPlans.map(plan => {
          // Check if this plan matches the cancelled subscription
          const isCancelledPlan = 
            plan.id === subscription.subscription_plan_package.subscription_id && 
            subscription.subscription_plan_packages_id === subscription.subscription_plan_packages_id;
          
          // If it's the cancelled plan, remove the current flag
          return {
            ...plan,
            isCurrent: plan.isCurrent && !isCancelledPlan
          };
        })
      );

      // Show success message
      alert('Subscription cancelled successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      console.error('Error cancelling subscription:', err);
      alert(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
          Active
        </span>
      );
    } else if (status === 'expired') {
      return (
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
          Expired
        </span>
      );
    } else {
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
          {status}
        </span>
      );
    }
  };

  const getPaymentStatusBadge = (status: 'paid' | 'pending' | 'failed') => {
    if (status === 'paid') {
      return (
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
          Paid
        </span>
      );
    } else if (status === 'pending') {
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
          Pending
        </span>
      );
    } else {
      return (
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
          Failed
        </span>
      );
    }
  };

  const handleViewPlanDetails = async (plan: SubscriptionPlan) => {
    try {
      // Set loading state
      setPlanDetailsLoading(true);
      setSelectedPlanDetails(null);
    setShowPlanDetailsModal(true);
      
      // Check if the plan has packages (multiple packages)
      if (plan.packages && plan.packages.length > 0) {
        // Create a copy of the plan to avoid modifying the original
        const planWithCourses = { ...plan };
        
        // Fetch detailed package data for each package to get courses
        const packagesWithCourses = await Promise.all(
          plan.packages.map(async (pkg) => {
            try {
              const token = localStorage.getItem('token');
              if (!token) throw new Error('Authentication token not found');
              
              const response = await axios.get(`${API_URL}/api/packages/${pkg.id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'accept': 'application/json'
                }
              });
              
              console.log(`Fetched package ${pkg.id} details:`, response.data);
              return response.data;
            } catch (error) {
              console.error(`Error fetching package ${pkg.id} details:`, error);
              // If error, return the original package
              return pkg;
            }
          })
        );
        
        // Update the plan with the detailed package data
        planWithCourses.packages = packagesWithCourses;
        setSelectedPlanDetails(planWithCourses);
      } 
      // For single package plans
      else if (plan.package && plan.package.id) {
        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('Authentication token not found');
          
          const response = await axios.get(`${API_URL}/api/packages/${plan.package.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json'
            }
          });
          
          console.log(`Fetched package ${plan.package.id} details:`, response.data);
          
          // Create a copy of the plan and update the package with detailed data
          const planWithCourses = { ...plan, package: response.data };
          setSelectedPlanDetails(planWithCourses);
        } catch (error) {
          console.error(`Error fetching package ${plan.package.id} details:`, error);
          setSelectedPlanDetails(plan);
        }
      } else {
        // If no packages or package, just use the plan as is
        setSelectedPlanDetails(plan);
      }
    } catch (error) {
      console.error('Error preparing plan details:', error);
      setSelectedPlanDetails(plan);
    } finally {
      setPlanDetailsLoading(false);
    }
  };

  const isRenewalAllowed = (endDate: string): boolean => {
    const end = new Date(endDate);
    const now = new Date();
    
    // Set both dates to start of day for comparison
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    return end.getTime() === now.getTime();
  };

  // Replace the existing billingHistory array with our new billingRecords state
  const billingHistory = billingRecords;

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      {/* Header Section with improved styling */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="mt-2 text-lg text-gray-600">Choose the plan that best fits your learning needs.</p>
          
          {/* Quick Navigation Links */}
          <div className="mt-4 flex space-x-4">
            <a 
              href="#current-subscriptions" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              Current Subscriptions
            </a>
            <a
              href="#available-plans"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              Available Plans
            </a>
            <a
              href="#billing-history"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              Billing History
            </a>
          </div>

        </div>

        {/* Error/Loading States with better visibility */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Current Subscription Cards */}
        {currentSubscriptions.length > 0 && (
          <div className="mb-8" id="current-subscriptions">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscriptions</h2>
            <div className="space-y-4">
              {currentSubscriptions.map((subscription) => {
                const details = currentSubscriptionDetails[subscription.subscription_plan_packages_id];
                return (
                  <Card key={subscription.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
        <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 mr-3">
                              {details?.name || 'Subscription'}
                      </h3>
                            {getStatusBadge(subscription.status)}
              </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="flex items-center mb-2">
                          <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                                Start Date: {formatDate(subscription.start_date)}
                        </p>
                        <p className="flex items-center mb-2">
                          <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                                End Date: {formatDate(subscription.end_date)}
                        </p>
                      </div>
                      <div>
                        <p className="flex items-center mb-2">
                          <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                                Duration: {details?.duration_days || 0} days
                        </p>
                        <p className="flex items-center mb-2">
                          <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                                Max Exams: {details?.max_exams || 0}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Features:</h4>
                            <p className="text-sm text-gray-600">{details?.features || 'No features available'}</p>
                </div>
            </div>

                  <div className="mt-6 lg:mt-0 lg:ml-6 flex flex-col space-y-2">
                    <Button 
                            onClick={() => handleRenewSingleSubscription(subscription)}
                      className="w-full px-4 py-1.5 text-sm rounded-full shadow-sm transform transition-all duration-200 ease-in-out bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Renew Plan
                    </Button>
                    <Button 
                            onClick={() => handleCancelSingleSubscription(subscription)}
                      className="w-full border border-red-200 text-red-600 px-4 py-1.5 text-sm rounded-full transform transition-all duration-200 ease-in-out hover:bg-red-50 hover:border-red-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
                );
              })}
            </div>
          </div>
      )}

        {/* Available Plans Section with improved card design */}
        <div className="mb-8" id="available-plans">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Plans</h2>
      {!hasActiveSubscription && !loading && !error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You don't have an active subscription. Choose a plan below to get started!
              </p>
            </div>
          </div>
        </div>
      )}
      {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading subscription plans...</p>
        </div>
      ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptionPlans.map((plan) => (
                <Card 
                  key={`plan-${plan.id}-package-${plan.package?.id || 'default'}`} 
                  className={`transform transition-all duration-200 hover:scale-105 ${
                    plan.isCurrent ? 'border-2 border-blue-500 shadow-lg' : 'hover:shadow-lg'
                  }`}
                >
            <div className="p-6">
              {plan.isCurrent && (
                      <div className="absolute top-0 right-0 mt-4 mr-4">
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      Current Plan
                    </span>
                </div>
              )}
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    
              <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-gray-600 ml-1">/Plan</span>
                </div>

                    <div className="space-y-4 mb-6">
                  <p className="text-gray-600">{plan.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-600">Duration: {plan.duration_days} days</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-600">Max Exams: {plan.max_exams}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Features:</h4>
                        <p className="text-sm text-gray-600">{plan.features}</p>
                      </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={() => handleViewPlanDetails(plan)}
                    className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-1.5 text-sm rounded-full transform transition-all duration-200 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    disabled={planDetailsLoading}
                  >
                    {planDetailsLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading Details...
                      </span>
                    ) : "View Plan Details"}
                  </Button>

                <Button 
                      className={`w-full px-4 py-1.5 text-sm rounded-full transform transition-all duration-200 ease-in-out ${
                        plan.isCurrent 
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                      }`}
                  disabled={plan.isCurrent || loadingPlanDetails}
                  onClick={() => {
                    if (!plan.isCurrent) {
                      console.log('Plan package ID:', plan.package?.id);
                      handleSelectPlan(plan.id, plan.package?.id);
                    }
                  }}
                >
                      {loadingPlanDetails ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </span>
                      ) : plan.isCurrent ? 'Current Plan' : 'Select Plan'}
                </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>

        {/* Billing History Section */}
        <div className="mb-8" id="billing-history">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Download Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${record.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => generateReceipt(record)}
                      className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {billingRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No billing history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </div>

        {/* Subscription Details Modal with improved design */}
        {showModal && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedPlan.name}</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Price</span>
                    <span className="text-2xl font-bold text-gray-900">${selectedPlan.price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Duration</span>
                    <span className="text-gray-900">{selectedPlan.duration_days} days</span>
              </div>
            </div>
                
            <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Description</h4>
                  <p className="text-gray-600">{selectedPlan.description}</p>
            </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Features</h4>
                  <p className="text-gray-600">{selectedPlan.features}</p>
          </div>
        </div>

              <div className="mt-6 flex space-x-3">
                <Button 
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-1.5 text-sm rounded-full shadow-sm transform transition-all duration-200 ease-in-out hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={handleConfirmSubscription}
                >
                  Confirm Subscription
                </Button>
                <Button 
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-1.5 text-sm rounded-full transform transition-all duration-200 ease-in-out hover:bg-gray-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Plan Details Modal */}
        {showPlanDetailsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedPlanDetails?.name || 'Subscription Plan'} - Detailed Information
                </h3>
                <button
                  onClick={() => setShowPlanDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {planDetailsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-600">Loading plan details...</p>
                </div>
              ) : selectedPlanDetails ? (
              <div className="space-y-6">
                {/* Basic Plan Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <span className="ml-2 text-xl font-bold text-gray-900">${selectedPlanDetails.price}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 text-gray-900">{selectedPlanDetails.duration_days} days</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Exams:</span>
                      <span className="ml-2 text-gray-900">{selectedPlanDetails.max_exams}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2">{selectedPlanDetails.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>

                  {/* Multiple Packages Section */}
                  {selectedPlanDetails.packages && selectedPlanDetails.packages.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900">Available Packages ({selectedPlanDetails.packages.length})</h4>
                      <div className="grid gap-4">
                        {selectedPlanDetails.packages.map((pkg: Package) => (
                          <div key={pkg.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <svg className="h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                              </svg>
                              <h5 className="text-md font-medium text-gray-900">{pkg.name}</h5>
                            </div>
                            <p className="text-gray-600 mb-4">{pkg.description}</p>
                            
                            {/* Courses */}
                            {pkg.courses && pkg.courses.length > 0 ? (
                              <div className="pl-4 border-l-2 border-indigo-100 mt-4">
                                <h6 className="text-sm font-medium text-gray-900 mb-2">Available Courses ({pkg.courses.length})</h6>
                                <div className="grid gap-4">
                                  {pkg.courses.map((course: Course) => (
                                    <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                      <div className="flex items-center space-x-2 mb-3">
                                        <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                        </svg>
                                        <h6 className="text-lg font-semibold text-gray-900">{course.name}</h6>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                        <div>
                                          <span className="text-gray-600">Duration:</span>
                                          <span className="ml-2 text-gray-900">{course.duration} hours</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Level:</span>
                                          <span className="ml-2 text-gray-900">{course.level}</span>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        {/* Stream */}
                                        {course.stream && (
                                          <div className="flex items-center space-x-2">
                                            <svg className="h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                              <span className="font-medium">Stream:</span>
                                              <span className="ml-2">{course.stream.name}</span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Subject */}
                                        {course.subject && (
                                          <div className="flex items-center space-x-2 ml-6">
                                            <svg className="h-4 w-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                            </svg>
                                            <div>
                                              <span className="font-medium">Subject:</span>
                                              <span className="ml-2">{course.subject.name}</span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Chapter */}
                                        {course.chapter && (
                                          <div className="flex items-center space-x-2 ml-12">
                                            <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                              <span className="font-medium">Chapter {course.chapter.chapter_number}:</span>
                                              <span className="ml-2">{course.chapter.name}</span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Topic */}
                                        {course.topic && (
                                          <div className="flex items-center space-x-2 ml-16">
                                            <svg className="h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                              <span className="font-medium">Topic:</span>
                                              <span className="ml-2">{course.topic.name}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic pl-4 border-l-2 border-gray-200">
                                No courses available in this package.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Single Package Section - Fallback for backward compatibility
                    selectedPlanDetails.package ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Package Information</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-md font-medium text-gray-900">{selectedPlanDetails.package.name}</h5>
                        <p className="text-gray-600">{selectedPlanDetails.package.description}</p>
                      </div>

                      {/* Courses */}
                          {selectedPlanDetails.package.courses && selectedPlanDetails.package.courses.length > 0 ? (
                        <div className="space-y-4">
                              <h5 className="text-md font-medium text-gray-900">Available Courses ({selectedPlanDetails.package.courses.length})</h5>
                          <div className="grid gap-4">
                            {selectedPlanDetails.package.courses.map((course: Course) => (
                                  <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center space-x-2 mb-3">
                                  <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                  </svg>
                                  <h6 className="text-lg font-semibold text-gray-900">{course.name}</h6>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="ml-2 text-gray-900">{course.duration} hours</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Level:</span>
                                    <span className="ml-2 text-gray-900">{course.level}</span>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {/* Stream */}
                                  {course.stream && (
                                    <div className="flex items-center space-x-2">
                                      <svg className="h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                      </svg>
                                      <div>
                                        <span className="font-medium">Stream:</span>
                                        <span className="ml-2">{course.stream.name}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Subject */}
                                  {course.subject && (
                                    <div className="flex items-center space-x-2 ml-6">
                                      <svg className="h-4 w-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                      </svg>
                                      <div>
                                        <span className="font-medium">Subject:</span>
                                        <span className="ml-2">{course.subject.name}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Chapter */}
                                  {course.chapter && (
                                    <div className="flex items-center space-x-2 ml-12">
                                      <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                      </svg>
                                      <div>
                                        <span className="font-medium">Chapter {course.chapter.chapter_number}:</span>
                                        <span className="ml-2">{course.chapter.name}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Topic */}
                                  {course.topic && (
                                    <div className="flex items-center space-x-2 ml-16">
                                      <svg className="h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                      </svg>
                                      <div>
                                        <span className="font-medium">Topic:</span>
                                        <span className="ml-2">{course.topic.name}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              No courses available in this package.
                        </div>
                      )}
                    </div>
                  </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        No package information available for this subscription plan.
                      </div>
                    )
                )}
              </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No details available for this plan.
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowPlanDetailsModal(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">Upgrade Subscription</h3>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid gap-4">
                  {availableSubscriptions.map((subscription) => (
                    <div
                      key={subscription.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedUpgradeSubscription?.id === subscription.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedUpgradeSubscription(subscription)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{subscription.subscription.name}</h4>
                          <p className="text-sm text-gray-600">{subscription.subscription.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">${subscription.subscription.price}</p>
                          <p className="text-sm text-gray-600">{subscription.subscription.duration_days} days</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmUpgrade}
                  disabled={!selectedUpgradeSubscription || isUpgrading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    !selectedUpgradeSubscription || isUpgrading
                      ? 'bg-blue-300'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isUpgrading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Upgrading...
                    </span>
                  ) : (
                    'Confirm Upgrade'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
    </MainLayout>
  );
};

export default Subscription; 