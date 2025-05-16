import React, { useState, useEffect } from 'react';
import Navbar from '../../../components/layout/Navbar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import AdminSidebar from '../AdminSidebar';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
    [key: string]: any;
  };
  onLogout: () => void;
}

interface SubscriptionBreakdown {
  subscription_id: number;
  name: string;
  total_users: number;
  active_users: number;
  revenue: number;
}

interface SubscriptionOverview {
  total_subscriptions: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  cancelled_subscriptions: number;
  total_revenue: number;
  subscription_breakdown: SubscriptionBreakdown[];
}

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const SubscriptionReports: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [timePeriod, setTimePeriod] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubscriptionOverview | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, [timePeriod]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/subscriptions/overview`, {
        params: { time_period: timePeriod },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setData(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to fetch subscription data. Please try again later.');
      console.error('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!data) return;

    const csvContent = [
      ['Subscription Report'],
      ['Time Period:', timePeriod],
      [''],
      ['Overall Statistics'],
      ['Total Subscriptions:', data.total_subscriptions],
      ['Active Subscriptions:', data.active_subscriptions],
      ['Expired Subscriptions:', data.expired_subscriptions],
      ['Cancelled Subscriptions:', data.cancelled_subscriptions],
      ['Total Revenue:', calculateTotalRevenue(data) > 0 ? `$${calculateTotalRevenue(data)}` : calculateTotalRevenue(data)],
      [''],
      ['Subscription Breakdown'],
      ['Name', 'Total Users', 'Active Users', 'Revenue'],
      ...data.subscription_breakdown.map(sub => [
        sub.name,
        sub.total_users,
        sub.active_users,
        sub.name.toLowerCase() === 'free' ? 0 : (sub.revenue > 0 ? `$${sub.revenue}` : sub.revenue)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `subscription_report_${timePeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateTotalRevenue = (data: SubscriptionOverview) => {
    return data.subscription_breakdown.reduce((total, sub) => {
      if (sub.name.toLowerCase() === 'free') {
        return total;
      }
      return total + sub.revenue;
    }, 0);
  };

  const exportToExcel = () => {
    if (!data) return;

    // Prepare the data for export
    const subscriptionData = data.subscription_breakdown.map(sub => ({
      'Subscription Name': sub.name,
      'Total Users': sub.total_users,
      'Active Users': sub.active_users,
      'Revenue': sub.name.toLowerCase() === 'free' ? 0 : sub.revenue
    }));

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Add overall statistics
    const overallStats = [
      ['Subscription Report Overview'],
      ['Time Period:', timePeriod],
      [''],
      ['Overall Statistics'],
      ['Total Subscriptions:', data.total_subscriptions],
      ['Active Subscriptions:', data.active_subscriptions],
      ['Expired Subscriptions:', data.expired_subscriptions],
      ['Cancelled Subscriptions:', data.cancelled_subscriptions],
      ['Total Revenue:', calculateTotalRevenue(data)],
      ['']
    ];
    
    // Convert overall stats to worksheet
    const ws1 = XLSX.utils.aoa_to_sheet(overallStats);
    XLSX.utils.book_append_sheet(wb, ws1, 'Overview');

    // Convert subscription data to worksheet
    const ws2 = XLSX.utils.json_to_sheet(subscriptionData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Subscription Details');

    // Generate Excel file
    const fileName = `subscription_report_${timePeriod}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex min-h-screen">
        <div className="w-64 bg-white border-r min-h-screen">
          <AdminSidebar />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Subscription Reports</h1>
                <p className="text-gray-600">Monitor subscription metrics and revenue</p>
              </div>
              <div className="flex gap-4">
                <select
                  className="form-select px-3 py-2 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last Quarter</option>
                  <option value="year">Last Year</option>
                </select>
                <button
                  onClick={exportToExcel}
                  disabled={!data || loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    !data || loading
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Export to Excel
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading subscription data...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-red-700">{error}</p>
              </div>
            ) : data && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Total Subscriptions</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.total_subscriptions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Active Subscriptions</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.active_subscriptions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {calculateTotalRevenue(data) > 0 ? `$${calculateTotalRevenue(data).toLocaleString()}` : calculateTotalRevenue(data).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Cancelled Subscriptions</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.cancelled_subscriptions.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg font-medium text-gray-900">Subscription Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Users</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Users</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.subscription_breakdown.map((subscription) => (
                          <tr key={subscription.subscription_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subscription.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subscription.total_users}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subscription.active_users}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {subscription.name.toLowerCase() === 'free' ? 0 : (subscription.revenue > 0 ? `$${subscription.revenue}` : subscription.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionReports; 