import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, List, ListItem, ListItemButton, ListItemText, CircularProgress, Typography, Alert,
  Box, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';



const ProductHistory = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

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

  // Fetch history for selected product
  useEffect(() => {
    if (!selectedProduct) return;

    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        setHistory([]);
        const response = await fetch(`/.netlify/functions/gas-proxy?type=stock&page=inventory_history&productCode=${selectedProduct.productCode}`);
        const result = await response.json();
        if (result.success) {
          setHistory(result.data);
        } else {
          throw new Error(result.error || '在庫履歴の取得に失敗しました。');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [selectedProduct]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setError(null); // Clear previous errors
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
          loadingHistory ? (
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
                      {history.map((row) => (
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
          )
        )}
      </Grid>
    </Grid>
  );
};

export default ProductHistory;
