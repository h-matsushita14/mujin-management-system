import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  CircularProgress, Typography, Alert, Box, Button, TextField 
} from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';
import { EXTERNAL_SERVICES } from '../config/externalServices';

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CACHE_SIZE = 7; // キャッシュする日数

const InventoryList = () => {
  const [inventoryCache, setInventoryCache] = useState({});
  const [cacheOrder, setCacheOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = new Date();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchInventory = useCallback(async (date) => {
    const dateStr = formatDate(date);
    if (inventoryCache[dateStr]) {
      return inventoryCache[dateStr];
    }
    const url = `${EXTERNAL_SERVICES.gasApi.stockApp.url}&page=inventory_latest&date=${dateStr}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error! status: ${response.status}`);
    const rawData = await response.json();

    if (rawData.error) throw new Error(rawData.error);

    // Google Apps Scriptから返されるデータ構造に合わせて調整
    // calculatedInventoriesオブジェクトの値を配列に変換
    const data = { items: Object.values(rawData.calculatedInventories || {}) };
    
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
  }, [inventoryCache, cacheOrder]);

  const prefetchNeighboringDays = useCallback((date) => {
    const prevDay = new Date(date);
    prevDay.setDate(date.getDate() - 1);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    fetchInventory(prevDay).catch(err => console.error('Prefetch prev day failed:', err));

    if (nextDay <= today) {
      fetchInventory(nextDay).catch(err => console.error('Prefetch next day failed:', err));
    }
  }, [fetchInventory, today]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchInventory(selectedDate);
        if (!data || data.length === 0) {
           setMessage({ type: 'info', text: '該当日付の在庫データが見つかりません。' });
        }
        prefetchNeighboringDays(selectedDate);
      } catch (e) {
        setError(e.message);
        setMessage({ type: 'error', text: `データの取得に失敗しました: ${e.message}` });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedDate, fetchInventory, prefetchNeighboringDays]);

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
      const response = await fetch(EXTERNAL_SERVICES.gasApi.stockApp.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'updateToday' }),
        mode: 'cors',
      });
      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: `${result.message} 最新のデータを再取得します。` });
        // キャッシュをクリアして強制的に再フェッチさせる
        setInventoryCache(prev => ({...prev, [formatDate(selectedDate)]: undefined }));
        setSelectedDate(new Date(selectedDate.getTime()));
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
        <TableContainer component={Paper} sx={{ height: 600, overflowY: 'auto' }}>
            <Table sx={{ minWidth: 650 }} aria-label="inventory table" stickyHeader>
              <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                <TableRow>
                  <TableCell>商品コード</TableCell>
                  <TableCell>商品名</TableCell>
                  <TableCell align="right">在庫数</TableCell>
                  <TableCell>在庫割合</TableCell>
                  <TableCell>賞味期限</TableCell>
                  <TableCell>販売可能日数</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedInventory.map((item, index) => (
                  <TableRow key={item['商品コード'] || index}>
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
                    <TableCell>{item['賞味期限'] ? formatDate(new Date(item['賞味期限'])) : 'N/A'}</TableCell>
                    <TableCell>{item['販売可能日数'] !== null && item['販売可能日数'] !== undefined ? item['販売可能日数'] : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
      )}
    </LocalizationProvider>
  );
};

export default InventoryList;