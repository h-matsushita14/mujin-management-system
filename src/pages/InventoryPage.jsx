import React, { useState } from 'react';
import { Container, Typography, Box, Tabs, Tab, Button, Stack, CircularProgress, Alert } from '@mui/material';
import InventoryList from '../components/InventoryList';
import ProductHistory from '../components/ProductHistory';
import DiscrepancyHistory from '../components/DiscrepancyHistory';
import { EXTERNAL_SERVICES } from '../config/externalServices';

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleUpdate = async (action) => {
    setLoading(true);
    setMessage({ type: 'info', text: '在庫データの更新処理を開始しました...' });

    try {
      const response = await fetch(EXTERNAL_SERVICES.gasApi.stockApp.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ action }),
        mode: 'cors',
      });
      
      // Netlifyのプロキシは常に200を返す可能性があるため、中のJSONで成否を判断
      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: `処理が成功しました: ${result.message}` });
        // TODO: 在庫一覧を再読み込みする処理をここに実装
      } else {
        throw new Error(result.message || '不明なエラーが発生しました。');
      }

    } catch (error) {
      setMessage({ type: 'error', text: `エラーが発生しました: ${error.message}` });
      console.error('Failed to update inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        在庫管理
      </Typography>

      <Box sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button 
            variant="contained" 
            onClick={() => handleUpdate('updateToday')}
            disabled={loading}
          >
            今日の在庫を更新
          </Button>
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={() => handleUpdate('updateAllHistory')}
            disabled={loading}
          >
            全履歴を再計算
          </Button>
          {loading && <CircularProgress size={24} />}
        </Stack>
        {message.text && (
          <Alert severity={message.type} sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}
      </Box>
      
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