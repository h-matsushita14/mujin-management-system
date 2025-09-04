import { Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ShiftManagerPage from './pages/ShiftManagerPage';
import SalesPage from './pages/SalesPage';
import InventoryPage from './pages/InventoryPage';
import OrderingPage from './pages/OrderingPage'; // New import
import DeliveryPage from './pages/DeliveryPage'; // New import
import CollectionPage from './pages/CollectionPage'; // New import
import ReportingPage from './pages/ReportingPage'; // New import
import StocktakingPage from './pages/StocktakingPage'; // New import
import './App.css';

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/ordering" element={<OrderingPage />} /> {/* New route */}
          <Route path="/delivery" element={<DeliveryPage />} /> {/* New route */}
          <Route path="/collection" element={<CollectionPage />} /> {/* New route */}
          <Route path="/reporting" element={<ReportingPage />} /> {/* New route */}
          <Route path="/stocktaking" element={<StocktakingPage />} /> {/* New route */}
          <Route path="/shift-manager" element={<ShiftManagerPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
