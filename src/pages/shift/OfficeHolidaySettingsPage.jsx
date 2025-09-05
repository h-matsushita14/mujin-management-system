import React from 'react';
import { Typography, Container } from '@mui/material';

function OfficeHolidaySettingsPage() {
  return (
    <Container>
      <Typography variant="h5" component="h2" gutterBottom>
        店舗の休日設定
      </Typography>
      <Typography>
        このページで店舗の休日や棚卸日を設定します。
      </Typography>
    </Container>
  );
}

export default OfficeHolidaySettingsPage;
