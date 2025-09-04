import { useEffect } from 'react';
import { EXTERNAL_SERVICES } from '../config/externalServices';

function SalesPage() {
  useEffect(() => {
    // Redirect to the external Looker Studio URL
    window.location.href = EXTERNAL_SERVICES.lookerStudio.salesReport.url;
  }, []);

  return (
    <div>
      <p>Redirecting to Sales Report...</p>
    </div>
  );
}

export default SalesPage;
