import React from 'react';
import Card from '../ui/Card';

interface DashboardStatsProps {
  stats: {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    change?: {
      value: string | number;
      isPositive: boolean;
    };
    bgColor?: string;
  }[];
  className?: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, className = '' }) => {
  return (
    <div className={`flex flex-nowrap space-x-4 overflow-x-auto ${className}`}>
      {stats.map((stat, index) => (
        <Card key={index} className={`flex-1 min-w-[200px] overflow-hidden ${stat.bgColor || ''}`}>
          <div className="p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {stat.icon || (
                  <div className="rounded-md bg-blue-500 p-2">
                    <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 truncate">{stat.title}</dt>
                  <dd>
                    <div className="text-base font-medium text-gray-900">{stat.value}</div>
                  </dd>
                  {stat.change && (
                    <dd className={`flex items-baseline text-xs ${stat.change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="flex items-center">
                        {stat.change.isPositive ? (
                          <svg className="h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="ml-1">{stat.change.value}</span>
                      </span>
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
