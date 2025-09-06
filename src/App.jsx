import { Route, Routes, Navigate } from 'react-router-dom';
import { Toolbar } from '@mui/material';
import Footer from './components/Footer';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ShiftManagerPage from './pages/ShiftManagerPage';
import ShiftCreationPage from './pages/shift/ShiftCreationPage';
import ShiftCalendarPage from './pages/shift/ShiftCalendarPage';
import WorkerRegistrationPage from './pages/shift/WorkerRegistrationPage';
import WorkerHolidaySettingsPage from './pages/shift/WorkerHolidaySettingsPage';
import OfficeHolidaySettingsPage from './pages/shift/OfficeHolidaySettingsPage';
import SalesPage from './pages/SalesPage';
import InventoryPage from './pages/InventoryPage';
import OrderingPage from './pages/OrderingPage';
import DeliveryPage from './pages/DeliveryPage';
import CollectionPage from './pages/CollectionPage';
import ReportingPage from './pages/ReportingPage';
import StocktakingPage from './pages/StocktakingPage';
import ProductSettingsPage from './pages/ProductSettingsPage';
import EquipmentSettingsPage from './pages/EquipmentSettingsPage';
import ManualSettingsPage from './pages/ManualSettingsPage';
import ManualsPage from './pages/ManualsPage';
import { ManualProvider } from './context/ManualContext';
import './App.css';

function App() {
  return (
    <div className="App">
      <ManualProvider>
        <Header />
        <main>
          <Toolbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/ordering" element={<OrderingPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/stocktaking" element={<StocktakingPage />} />
            <Route path="/shift-manager" element={<ShiftManagerPage />}>
              <Route index element={<Navigate to="calendar" replace />} />
              <Route path="calendar" element={<ShiftCalendarPage />} />
              <Route path="creation" element={<ShiftCreationPage />} />
              <Route path="registration" element={<WorkerRegistrationPage />} />
              <Route path="worker-holiday" element={<WorkerHolidaySettingsPage />} />
              <Route path="office-holiday" element={<OfficeHolidaySettingsPage />} />
            </Route>
            <Route path="/product-settings" element={<ProductSettingsPage />} />
            <Route path="/equipment-settings" element={<EquipmentSettingsPage />} />
            <Route path="/manual-settings" element={<ManualSettingsPage />} />
            <Route path="/manuals" element={<ManualsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </ManualProvider>
    </div>
  );
}

export default App;
