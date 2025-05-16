import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface SubscriptionCardProps {
  subscription: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number; // in days
    features: string[];
    isPopular?: boolean;
    isActive?: boolean;
  };
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onSelect,
  onEdit,
  onDelete,
  isAdmin = false,
}) => {
  return (
    <Card className={`h-full flex flex-col relative ${subscription.isPopular ? 'border-2 border-blue-500' : ''}`}>
      {subscription.isPopular && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
          Popular
        </div>
      )}
      
      <div className="p-6 flex-grow">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{subscription.name}</h3>
        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900">${subscription.price}</span>
          <span className="text-gray-500 ml-1">/ {subscription.duration} days</span>
        </div>
        
        <p className="text-sm text-gray-500 mb-6">{subscription.description}</p>
        
        <ul className="space-y-3 mb-6">
          {subscription.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        {isAdmin ? (
          <div className="flex space-x-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onEdit && onEdit(subscription.id)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={() => onDelete && onDelete(subscription.id)}
            >
              Delete
            </Button>
          </div>
        ) : (
          <Button
            variant={subscription.isActive ? 'light' : 'primary'}
            fullWidth
            onClick={() => onSelect(subscription.id)}
            disabled={subscription.isActive}
          >
            {subscription.isActive ? 'Current Plan' : 'Select Plan'}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default SubscriptionCard;
