import React, { useState } from 'react';
import { Tabs, Tab, Box, Container, Typography } from '@mui/material';
import { Outlet, Link, useLocation } from 'react-router-dom';

const tabRoutes = {
  '/shift-manager/calendar': 0,
  '/shift-manager/creation': 1,
  '/shift-manager/registration': 2,
  '/shift-manager/worker-holiday': 3,
  '/shift-manager/office-holiday': 4,
};

function ShiftManagerPage() {
  const location = useLocation();
  const [value, setValue] = useState(tabRoutes[location.pathname] || 0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        シフト管理
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="shift manager tabs">
          <Tab label="シフト表" component={Link} to="calendar" />
          <Tab label="シフト作成・編集" component={Link} to="creation" />
          <Tab label="作業員登録" component={Link} to="registration" />
          <Tab label="作業員の休日設定" component={Link} to="worker-holiday" />
          <Tab label="店舗の休日設定" component={Link} to="office-holiday" />
        </Tabs>
      </Box>
      <Box sx={{ pt: 3 }}>
        <Outlet />
      </Box>
    </Container>
  );
}

export default ShiftManagerPage;
