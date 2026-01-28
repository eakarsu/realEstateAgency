import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './components/layouts/DashboardLayout';
import PublicLayout from './components/layouts/PublicLayout';
import PortalLayout from './components/layouts/PortalLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';

// Lead Pages
import LeadsList from './pages/leads/LeadsList';
import LeadDetail from './pages/leads/LeadDetail';
import LeadForm from './pages/leads/LeadForm';

// Property Pages
import PropertiesList from './pages/properties/PropertiesList';
import PropertyDetail from './pages/properties/PropertyDetail';
import PropertyForm from './pages/properties/PropertyForm';

// Transaction Pages
import TransactionsList from './pages/transactions/TransactionsList';
import TransactionDetail from './pages/transactions/TransactionDetail';
import TransactionForm from './pages/transactions/TransactionForm';

// Team Pages
import AgentsList from './pages/team/AgentsList';
import AgentDetail from './pages/team/AgentDetail';
import TeamsList from './pages/team/TeamsList';

// Marketing Pages
import CampaignsList from './pages/marketing/CampaignsList';
import CampaignForm from './pages/marketing/CampaignForm';
import OpenHousesList from './pages/marketing/OpenHousesList';
import SocialPostsList from './pages/marketing/SocialPostsList';
import FlyersList from './pages/marketing/FlyersList';

// Documents Pages
import DocumentsList from './pages/documents/DocumentsList';

// Messages Pages
import MessagesList from './pages/messages/MessagesList';

// Schedule Pages
import ShowingsList from './pages/schedule/ShowingsList';
import TasksList from './pages/schedule/TasksList';

// Reports Pages
import MarketReports from './pages/reports/MarketReports';
import PerformanceReports from './pages/reports/PerformanceReports';
import CommissionsReport from './pages/reports/CommissionsReport';

// Settings Pages
import Settings from './pages/settings/Settings';
import Integrations from './pages/settings/Integrations';

// AI Pages
import AIHub from './pages/ai/AIHub';

// Client Portal Pages
import ClientPortal from './pages/portal/ClientPortal';
import PropertySearch from './pages/portal/PropertySearch';
import Favorites from './pages/portal/Favorites';
import SavedSearches from './pages/portal/SavedSearches';

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Dashboard Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Leads */}
        <Route path="leads" element={<LeadsList />} />
        <Route path="leads/new" element={<LeadForm />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="leads/:id/edit" element={<LeadForm />} />

        {/* Properties */}
        <Route path="properties" element={<PropertiesList />} />
        <Route path="properties/new" element={<PropertyForm />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="properties/:id/edit" element={<PropertyForm />} />

        {/* Transactions */}
        <Route path="transactions" element={<TransactionsList />} />
        <Route path="transactions/new" element={<TransactionForm />} />
        <Route path="transactions/:id" element={<TransactionDetail />} />
        <Route path="transactions/:id/edit" element={<TransactionForm />} />

        {/* Team */}
        <Route path="agents" element={<AgentsList />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="teams" element={<TeamsList />} />

        {/* Marketing */}
        <Route path="campaigns" element={<CampaignsList />} />
        <Route path="campaigns/new" element={<CampaignForm />} />
        <Route path="campaigns/:id/edit" element={<CampaignForm />} />
        <Route path="open-houses" element={<OpenHousesList />} />
        <Route path="social-posts" element={<SocialPostsList />} />
        <Route path="flyers" element={<FlyersList />} />

        {/* Documents */}
        <Route path="documents" element={<DocumentsList />} />

        {/* Messages */}
        <Route path="messages" element={<MessagesList />} />

        {/* Schedule */}
        <Route path="showings" element={<ShowingsList />} />
        <Route path="tasks" element={<TasksList />} />

        {/* Reports */}
        <Route path="market-reports" element={<MarketReports />} />
        <Route path="performance" element={<PerformanceReports />} />
        <Route path="commissions" element={<CommissionsReport />} />

        {/* Settings */}
        <Route path="settings" element={<Settings />} />
        <Route path="integrations" element={<Integrations />} />

        {/* AI Hub */}
        <Route path="ai-hub" element={<AIHub />} />
      </Route>

      {/* Client Portal Routes */}
      <Route
        path="/portal"
        element={
          <PrivateRoute>
            <PortalLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<ClientPortal />} />
        <Route path="search" element={<PropertySearch />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="saved-searches" element={<SavedSearches />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
