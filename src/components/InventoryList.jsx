import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Typography, Alert, Box, Button, TextField,
  useTheme, useMediaQuery
} from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';
import { EXTERNAL_SERVICES } from '../config/externalServices';

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CACHE_SIZE = 7;

const InventoryList = () => {
  const [inventoryCache, setInventoryCache] = useState({});
  const [cacheOrder, setCacheOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = new Date();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const fetchInventory = useCallback(async (date) => {
    const dateStr = formatDate(date);
    if (inventoryCache[dateStr]) {
      return inventoryCache[dateStr];
    }
    setLoading(true);
    try {
      // 新しいAPIエンドポイントを使用 (仮)
      const url = `${EXTERNAL_SERVICES.inventoryApi.baseUrl}${EXTERNAL_SERVICES.inventoryApi.endpoints.getInventoryList}?date=${dateStr}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API error! status: ${response.status}`);
      const rawData = await response.json();

      if (rawData.error) throw new Error(rawData.error);

      // 新しいAPIのレスポンス形式に合わせてデータを整形 (仮)
      // 現在のGAS APIのレスポンス形式を想定して、rawData.items をそのまま使用
      const data = { items: rawData.items || [] };
      
      setInventoryCache(prevCache => {
        const newCache = { ...prevCache, [dateStr]: data };
        const newOrder = [dateStr, ...cacheOrder.filter(d => d !== dateStr)];
        if (newOrder.length > CACHE_SIZE) {
          const oldestKey = newOrder.pop();
          delete newCache[oldestKey];
        }
        setCacheOrder(newOrder);
        return newCache;
      });
      return data;
    } finally {
      setLoading(false);
    }
  }, [inventoryCache, cacheOrder]);

  useEffect(() => {
    const loadData = async () => {
      setError(null);
      try {
        const data = await fetchInventory(selectedDate);
        if (!data || data.items.length === 0) {
           setMessage({ type: 'info', text: '該当日付の在庫データが見つかりません。' });
        }
      } catch (e) {
        setError(e.message);
        setMessage({ type: 'error', text: `データの取得に失敗しました: ${e.message}` });
      }
    };
    loadData();
  }, [selectedDate, fetchInventory]);

  const handleDateChange = (newValue) => {
    if (newValue && formatDate(newValue) !== formatDate(selectedDate)) {
      setSelectedDate(newValue);
    }
  };

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleStockUpdate = async () => {
    setUpdateLoading(true);
    setMessage({ type: 'info', text: '在庫データの更新処理を開始しました...' });
    try {
      // 新しいAPIエンドポイントを使用 (仮)
      const response = await fetch(`${EXTERNAL_SERVICES.inventoryApi.baseUrl}${EXTERNAL_SERVICES.inventoryApi.endpoints.updateInventory}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // JSON形式で送信
        body: JSON.stringify({ action: 'updateToday' }), // JSON形式に変換
        mode: 'cors',
      });
      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: `${result.message} 最新のデータを再取得します。` });
        const dateStr = formatDate(new Date());
        setInventoryCache(prev => ({...prev, [dateStr]: undefined }));
        setSelectedDate(new Date());
      } else {
        throw new Error(result.message || '不明なエラーが発生しました。');
      }
    } catch (error) {
      setMessage({ type: 'error', text: `更新処理中にエラーが発生しました: ${error.message}` });
    } finally {
      setUpdateLoading(false);
    }
  };

  const isNextDayDisabled = formatDate(selectedDate) === formatDate(today);
  const displayedInventory = inventoryCache[formatDate(selectedDate)]?.items || [];

  const renderTableView = () => (
    <TableContainer component={Paper} sx={{ height: 600, overflowY: 'auto' }}>
      <Table sx={{ minWidth: 650 }} aria-label="inventory table" stickyHeader>
        <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper' }}>
          <TableRow>
            <TableCell>商品コード</TableCell>
            <TableCell>商品名</TableCell>
            <TableCell align="right">在庫数</TableCell>
            <TableCell>在庫割合</TableCell>
            <TableCell>賞味期限</TableCell>
            <TableCell align="right">販売可能日数</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedInventory.map((item, index) => {
            const isExpiringSoon = item['賞味期限'] && item['販売可能日数'] !== null && item['販売可能日数'] !== undefined && item['販売可能日数'] <= 7;
            return (
              <TableRow 
                key={item['商品コード'] || index}
                sx={{ backgroundColor: isExpiringSoon ? 'rgba(255, 100, 100, 0.08)' : 'inherit' }}
              >
                <TableCell>{item['商品コード']}</TableCell>
                <TableCell>{item['商品名']}</TableCell>
                <TableCell align="right">{item['在庫数']}</TableCell>
                <TableCell>
                  {item['在庫割合'] !== null && item['在庫割合'] !== undefined && item['在庫割合'] !== 'N/A' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '100px', height: '20px', bgcolor: 'grey.300', borderRadius: '4px', overflow: 'hidden', mr: 1, position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(100, Math.max(0, parseFloat(item['在庫割合'])))}%`, bgcolor: 'primary.main', borderRadius: '4px' } }} />
                      <Typography variant="body2">{`${parseFloat(item['在庫割合']).toFixed(1)}%`}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2">N/A</Typography>
                  )}
                </TableCell>
                <TableCell>{formatDate(item['賞味期限'])}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" component="span" sx={{ color: isExpiringSoon ? 'error.main' : 'inherit', fontWeight: isExpiringSoon ? 'bold' : 'normal' }}>
                    {item['販売可能日数'] !== null && item['販売可能日数'] !== undefined ? item['販売可能日数'] : 'N/A'}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCardView = () => (
    <Box>
      {displayedInventory.map((item, index) => {
        const isExpiringSoon = item['賞味期限'] && item['販売可能日数'] !== null && item['販売可能日数'] !== undefined && item['販売可能日数'] <= 7;
        const cardSx = {
          p: 2,
          mb: 2,
          borderLeft: isExpiringSoon ? `5px solid ${theme.palette.error.main}` : 'none',
          backgroundColor: isExpiringSoon ? 'rgba(255, 100, 100, 0.05)' : 'background.paper',
        };

        if (isTablet) {
          // Tablet: 1-line flex-wrap layout
          return (
            <Paper key={item['商品コード'] || index} elevation={2} sx={cardSx}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px 16px' }}>
                <Typography variant="h6" component="div" sx={{ flex: '1 1 180px', mr: 'auto' }}>
                  {item['商品名']}
                </Typography>
                <Typography variant="body1" component="div" noWrap>
                  在庫: <Box component="span" sx={{ fontWeight: 'bold' }}>{item['在庫数']}</Box>
                </Typography>
                <Typography variant="body1" component="div" noWrap sx={{ color: isExpiringSoon ? 'error.main' : 'inherit', fontWeight: 'bold' }}>
                  販売可能: {item['販売可能日数'] !== null && item['販売可能日数'] !== undefined ? item['販売可能日数'] : 'N/A'} 日
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  賞味期限: {formatDate(item['賞味期限'])}
                </Typography>
              </Box>
            </Paper>
          );
        } else {
          // Phone: 3-line layout
          return (
            <Paper key={item['商品コード'] || index} elevation={2} sx={cardSx}>
              <Typography variant="h6" component="div" sx={{ mb: 1 }}>{item['商品名']}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">在庫数</Typography>
                  <Typography variant="h5">{item['在庫数']}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">販売可能日数</Typography>
                  <Typography variant="h5" sx={{ color: isExpiringSoon ? 'error.main' : 'inherit', fontWeight: isExpiringSoon ? 'bold' : 'normal' }}>
                    {item['販売可能日数'] !== null && item['販売可能日数'] !== undefined ? item['販売可能日数'] : 'N/A'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  賞味期限: {formatDate(item['賞味期限'])}
                </Typography>
              </Box>
            </Paper>
          );
        }
      })}
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <DatePicker
          label="日付選択"
          value={selectedDate}
          onChange={handleDateChange}
          renderInput={(params) => <TextField {...params} />}
          maxDate={today}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 2, sm: 0 } }}>
          <Button onClick={handlePrevDay} startIcon={<ArrowBackIosIcon />}>前日へ</Button>
          <Button onClick={handleNextDay} endIcon={<ArrowForwardIosIcon />} disabled={isNextDayDisabled}>翌日へ</Button>
          <Button onClick={handleToday} disabled={isNextDayDisabled} sx={{ ml: 1 }}>当日へ</Button>
          <Button
            variant="contained"
            onClick={handleStockUpdate}
            disabled={updateLoading}
            sx={{ ml: 2 }}
          >
            更新
            {updateLoading && <CircularProgress size={24} sx={{ color: 'white', position: 'absolute'}} />}
          </Button>
        </Box>
      </Box>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : displayedInventory.length === 0 ? (
        <Alert severity="info">表示する在庫データがありません。</Alert>
      ) : (
        isDesktop ? renderTableView() : renderCardView()
      )}
    </LocalizationProvider>
  );
};

export default InventoryList;
