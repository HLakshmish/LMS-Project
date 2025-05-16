export interface DashboardPageProps {
  user: {
    id: number;
    name?: string;
    role: string;
    avatar?: string;
    email?: string;
    username?: string;
  };
  onLogout: () => void;
} 