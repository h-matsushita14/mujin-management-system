import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Typography, Alert,
  Box, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

const DiscrepancyHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api?page=discrepancy_history`);
        const result = await response.json();
        if (result.success) {
          setHistory(result.data);
        } else {
          throw new Error(result.error || '差異履歴の取得に失敗しました。');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const productNames = useMemo(() => {
    const names = new Set(history.map(item => item.productName));
    return ['全商品', ...Array.from(names)];
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!selectedProduct || selectedProduct === '全商品') {
      return history;
    }
    return history.filter(item => item.productName === selectedProduct);
  }, [history, selectedProduct]);

  const totalDifference = useMemo(() => {
    return filteredHistory.reduce((sum, item) => sum + Number(item.difference), 0);
  }, [filteredHistory]);


  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel id="product-filter-label">商品で絞り込み</InputLabel>
          <Select
            labelId="product-filter-label"
            value={selectedProduct}
            label="商品で絞り込み"
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            {productNames.map(name => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="h6">
          合計差異: {totalDifference}
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="discrepancy table">
          <TableHead>
            <TableRow>
              <TableCell>日付</TableCell>
              <TableCell>商品コード</TableCell>
              <TableCell>商品名</TableCell>
              <TableCell align="right">差異</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((row, index) => (
                <TableRow key={`${row.productCode}-${row.date}-${index}`}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.productCode}</TableCell>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell align="right">{row.difference}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography>表示する差異データがありません。</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DiscrepancyHistory;