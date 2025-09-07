import React, { useState } from 'react';
import { Container, Typography, Box, Tabs, Tab } from '@mui/material';
import InventoryList from '../components/InventoryList';
import ProductHistory from '../components/ProductHistory';
import DiscrepancyHistory from '../components/DiscrepancyHistory';

// TabPanel component to associate content with a tab
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `inventory-tab-${index}`,
    'aria-controls': `inventory-tabpanel-${index}`,
  };
}

function InventoryPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        在庫管理
      </Typography>
      
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange} aria-label="inventory tabs">
            <Tab label="在庫一覧" {...a11yProps(0)} />
            <Tab label="商品毎在庫履歴" {...a11yProps(1)} />
            <Tab label="差異履歴" {...a11yProps(2)} />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <InventoryList />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ProductHistory />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <DiscrepancyHistory />
        </TabPanel>
      </Box>
    </Container>
  );
}

export default InventoryPage;