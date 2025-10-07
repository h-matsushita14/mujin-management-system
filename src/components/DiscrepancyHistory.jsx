import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Typography, Alert,
  Box, FormControl, InputLabel, Select, MenuItem, Grid, useTheme, useMediaQuery
} from '@mui/material';
import { EXTERNAL_SERVICES } from '../config/externalServices';

const DiscrepancyHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('全商品');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${EXTERNAL_SERVICES.gasApi.v2.url}?page=discrepancy_history`);
        const result = await response.json();
        setHistory(result || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const productNames = useMemo(() => {
    const names = new Set(history.map(item => item['商品名']));
    return ['全商品', ...Array.from(names)];
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!selectedProduct || selectedProduct === '全商品') {
      return history;
    }
    return history.filter(item => item['商品名'] === selectedProduct);
  }, [history, selectedProduct]);

  const sortedFilteredHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => new Date(b['日付']) - new Date(a['日付']));
  }, [filteredHistory]);

  const totalDifference = useMemo(() => {
    return filteredHistory.reduce((sum, item) => sum + Number(item['差異']), 0);
  }, [filteredHistory]);

  const renderTableView = () => (
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
          {sortedFilteredHistory.length > 0 ? (
            sortedFilteredHistory.map((row, index) => (
              <TableRow key={`${row['商品コード']}-${row['日付']}-${index}`}>
                <TableCell>{new Date(row['日付']).toISOString().split('T')[0]}</TableCell>
                <TableCell>{row['商品コード']}</TableCell>
                <TableCell>{row['商品名']}</TableCell>
                <TableCell align="right">{row['差異']}</TableCell>
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
  );

  const renderCardView = () => (
    <Box>
      {sortedFilteredHistory.length > 0 ? (
        sortedFilteredHistory.map((row, index) => (
          <Paper key={`${row['商品コード']}-${row['日付']}-${index}`} elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              日付: {new Date(row['日付']).toISOString().split('T')[0]}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1.5 }}>
              商品コード: {row['商品コード']}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 0.5 }}>
              <Typography variant="h6" component="div">
                {row['商品名']}
              </Typography>
              <Typography variant="h5" component="div" color={row['差異'] > 0 ? 'primary.main' : 'error.main'}>
                差異: {row['差異'] > 0 ? `+${row['差異']}` : row['差異']}
              </Typography>
            </Box>
          </Paper>
        ))
      ) : (
        <Typography>表示する差異データがありません。</Typography>
      )}
    </Box>
  );

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
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
        <Typography variant="h6" sx={{ mt: 2 }}>
          合計差異: {selectedProduct === '全商品' ? '-' : totalDifference}
        </Typography>
      </Box>

      {isMobile ? renderCardView() : renderTableView()}
    </Box>
  );
};

export default DiscrepancyHistory;
