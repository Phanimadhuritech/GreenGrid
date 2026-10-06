import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/Organizations";
import Buildings from "./pages/Buildings";
import Units from "./pages/Units";
import Meters from "./pages/Meters";
import AdminMeters from "./pages/admin/Meters";
import ManagerMeters from "./pages/manager/Meters";
import Readings from "./pages/manager/Readings";
import ResidentConsumption from "./pages/resident/Consumption";
import Tariffs from "./pages/admin/Tariffs";
import BillingCalculator from "./pages/admin/BillingCalculator";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing & Authentication Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Phase 10 Role-Based Dashboards */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Phase 3 Infrastructure Routes */}
        <Route
          path="/organizations"
          element={
            <ProtectedRoute>
              <Organizations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buildings"
          element={
            <ProtectedRoute>
              <Buildings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/units"
          element={
            <ProtectedRoute>
              <Units />
            </ProtectedRoute>
          }
        />

        {/* Phase 4 Meter Management Routes */}
        <Route
          path="/meters"
          element={
            <ProtectedRoute>
              <Meters />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/meters"
          element={
            <ProtectedRoute>
              <AdminMeters />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manager/meters"
          element={
            <ProtectedRoute>
              <ManagerMeters />
            </ProtectedRoute>
          }
        />

        {/* Phase 5 Readings & Consumption Routes */}
        <Route
          path="/manager/readings"
          element={
            <ProtectedRoute>
              <Readings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/readings"
          element={
            <ProtectedRoute>
              <Readings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resident/consumption"
          element={
            <ProtectedRoute>
              <ResidentConsumption />
            </ProtectedRoute>
          }
        />

        <Route
          path="/consumption"
          element={
            <ProtectedRoute>
              <ResidentConsumption />
            </ProtectedRoute>
          }
        />

        {/* Phase 6 Tariff & Billing Engine Routes */}
        <Route
          path="/admin/tariffs"
          element={
            <ProtectedRoute>
              <Tariffs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tariffs"
          element={
            <ProtectedRoute>
              <Tariffs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/billing-calculator"
          element={
            <ProtectedRoute>
              <BillingCalculator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/billing-calculator"
          element={
            <ProtectedRoute>
              <BillingCalculator />
            </ProtectedRoute>
          }
        />

        {/* Phase 7 Invoice Management Routes */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/invoices"
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/invoices"
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/invoices"
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/invoices"
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          }
        />

        {/* Phase 8 Payment Management Routes */}
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/payments"
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/payments"
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
        />

        {/* Phase 9 Maintenance Management Routes */}
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/maintenance"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/maintenance"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/maintenance"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technician/maintenance"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />

        {/* Phase 11 Analytics & Reports Routes */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;