import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, List, ListItem, ListItemButton, ListItemText, CircularProgress, Typography, Alert,
  Box, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button // Added Button import
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';



const ProductHistory = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(1); // Default to table view (index 1)
  const [dateRange, setDateRange] = useState('1week'); // Default to 1 week

  const formatDateToYMD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateDateRange = (range) => {
    const today = new Date();
    let startDate = null;
    let endDate = formatDateToYMD(today); // End date is always today

    switch (range) {
      case '1week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case '2week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 14);
        break;
      case '1month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'all':
      default:
        startDate = null; // No start date filter
        endDate = null; // No end date filter
        break;
    }
    return { startDate: startDate ? formatDateToYMD(startDate) : null, endDate };
  };

  // Fetch managed products list
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await fetch(`/.netlify/functions/gas-proxy?type=stock&page=managed_products`);
        const result = await response.json();
        // GASは直接商品リストの配列を返すように修正した
        setProducts(result); // resultは直接配列
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Fetch history for selected product and date range
  useEffect(() => {
    if (!selectedProduct) return;

    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        setHistory([]);
        const { startDate, endDate } = calculateDateRange(dateRange);
        let url = `/.netlify/functions/gas-proxy?type=stock&page=inventory_history&productCode=${selectedProduct.productCode}`;
        if (startDate && endDate) {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        }

        const response = await fetch(url);
        const result = await response.json();
        // The GAS API for inventory_history returns the array directly, not an object with success/data properties.
        const transformedHistory = result.map(item => ({
          date: item['日付'], // Assuming '日付' is the date field from GAS
          stock: item['在庫数'] // Assuming '在庫数' is the stock count field from GAS
        }));
        // Sort history by date in descending order (most recent first)
        transformedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        setHistory(transformedHistory);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [selectedProduct, dateRange]); // Add dateRange to dependency array

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setError(null); // Clear previous errors
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const tableHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending for table
  }, [history]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Typography variant="h6" gutterBottom>商品リスト</Typography>
        <Paper style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {loadingProducts ? (
            <CircularProgress />
          ) : (
            <List>
              {products.map((product) => (
                <ListItem key={product.productCode} disablePadding>
                  <ListItemButton
                    selected={selectedProduct?.productCode === product.productCode}
                    onClick={() => handleProductSelect(product)}
                  >
                    <ListItemText primary={product.productName} secondary={`コード: ${product.productCode}`} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Typography variant="h6" gutterBottom>
          {selectedProduct ? `${selectedProduct.productName} の在庫履歴` : '商品を選択してください'}
        </Typography>
        {selectedProduct && (
          <>
            <Box sx={{ mb: 2 }}>
              <Button variant={dateRange === 'all' ? 'contained' : 'outlined'} onClick={() => handleDateRangeChange('all')} sx={{ mr: 1 }}>全期間</Button>
              <Button variant={dateRange === '1week' ? 'contained' : 'outlined'} onClick={() => handleDateRangeChange('1week')} sx={{ mr: 1 }}>過去1週間</Button>
              <Button variant={dateRange === '2week' ? 'contained' : 'outlined'} onClick={() => handleDateRangeChange('2week')} sx={{ mr: 1 }}>過去2週間</Button>
              <Button variant={dateRange === '1month' ? 'contained' : 'outlined'} onClick={() => handleDateRangeChange('1month')} sx={{ mr: 1 }}>過去1ヶ月</Button>
              <Button variant={dateRange === '3month' ? 'contained' : 'outlined'} onClick={() => handleDateRangeChange('3month')}>過去3ヶ月</Button>
            </Box>
            {loadingHistory ? (
              <CircularProgress />
            ) : history.length > 0 ? (
              <Paper>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="history view tabs">
                    <Tab label="グラフ" />
                    <Tab label="表" />
                  </Tabs>
                </Box>
                {tabValue === 0 && (
                  <Box p={2} style={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="stock" name="在庫数" stroke="#8884d8" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}
                {tabValue === 1 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>日付</TableCell>
                          <TableCell align="right">在庫数</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableHistory.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell align="right">{row.stock}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            ) : (
              <Typography>この商品の在庫履歴データはありません。</Typography>
            )}
          </>
        )}
      </Grid>
    </Grid>
  );
};

export { ProductHistory };
