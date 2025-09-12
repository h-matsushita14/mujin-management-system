import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Avatar,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';

// Helper to format date to YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function StocktakingPage() {
  const [stocktakeItems, setStocktakeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch managed products (with imageData)
      const productsResponse = await fetch('/.netlify/functions/gas-proxy?type=stock&page=managed_products');
      if (!productsResponse.ok) throw new Error('商品マスターの取得に失敗しました。');
      const productsData = await productsResponse.json();
      const products = Array.isArray(productsData) ? productsData : []; // productsDataが配列であることを確認し、そうでなければ空の配列をセット

      // 2. Fetch previous day's inventory to get theoretical stock
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDate(yesterday);
      
      const inventoryResponse = await fetch(`/.netlify/functions/gas-proxy?type=stock&page=inventory_latest&date=${yesterdayStr}`);
      if (!inventoryResponse.ok) throw new Error('前日の在庫データの取得に失敗しました。');
      const inventoryData = await inventoryResponse.json();
      
      const theoreticalStockMap = new Map();
      if (inventoryData.success && inventoryData.items) {
        inventoryData.items.forEach(item => {
          theoreticalStockMap.set(item['商品コード'], item['在庫数']);
        });
      }

      // 3. Merge data
      const mergedItems = products.map(product => {
        const theoreticalStock = theoreticalStockMap.get(product.productCode) || 0;
        return {
          productCode: product.productCode,
          productName: product.productName,
          imageData: product['画像データ'] ? `/${product['画像データ']}` : '', // 相対パスを絶対パスに変換
          theoreticalStock: theoreticalStock,
          actualStock: '', // Initialize actual stock as empty
        };
      });

      setStocktakeItems(mergedItems);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStockChange = (productCode, newStock) => {
    const updatedItems = stocktakeItems.map((p) =>
      p.productCode === productCode ? { ...p, actualStock: newStock } : p
    );
    setStocktakeItems(updatedItems);
  };

  if (loading) {
    return <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Container>;
  }

  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          棚卸管理
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="stocktaking table">
          <TableHead>
            <TableRow>
              <TableCell>商品画像</TableCell>
              <TableCell>商品名</TableCell>
              <TableCell>商品コード</TableCell>
              <TableCell align="right">理論在庫</TableCell>
              <TableCell align="right">実在庫</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stocktakeItems.map((item) => (
              <TableRow key={item.productCode}>
                <TableCell>
                  <Avatar src={item.imageData} alt={item.productName} />
                </TableCell>
                <TableCell component="th" scope="row">
                  {item.productName}
                </TableCell>
                <TableCell>{item.productCode}</TableCell>
                <TableCell align="right">{item.theoreticalStock}</TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={item.actualStock}
                    onChange={(e) => handleStockChange(item.productCode, e.target.value)}
                    sx={{ width: '100px' }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default StocktakingPage;
