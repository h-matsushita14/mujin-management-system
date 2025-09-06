import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Typography, Alert, Box, Button } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

// 日付を YYYY-MM-DD 形式にフォーマットするヘルパー関数
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const InventoryList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date()); // デフォルトは当日
  const [today] = useState(new Date()); // 当日の日付を固定

  // Helper function to find a date with data
  const findDateWithData = async (startDate, direction, maxAttempts = 30) => {
    let currentDate = new Date(startDate);
    for (let i = 0; i < maxAttempts; i++) {
      const formattedDate = formatDate(currentDate);
      try {
        const response = await fetch(`/.netlify/functions/gas-proxy?page=inventory_latest&date=${formattedDate}`);
        const result = await response.json();
        if (result && result.calculatedInventories && Object.values(result.calculatedInventories).length > 0) {
          return currentDate; // Found a date with data
        }
      } catch (e) {
        console.error(`Error fetching data for ${formattedDate}:`, e);
        // Continue searching even if there's an error for a specific date
      }

      // Move to the next/previous day
      currentDate.setDate(currentDate.getDate() + direction);
    }
    return null; // No date with data found within maxAttempts
  };

  useEffect(() => {
    const fetchAndSetData = async (dateToFetch) => {
      setError(null);
      try {
        const formattedDate = formatDate(dateToFetch);
        const response = await fetch(`/.netlify/functions/gas-proxy?page=inventory_latest&date=${formattedDate}`);
        const result = await response.json();

        if (result && result.calculatedInventories) {
          const inventories = Object.entries(result.calculatedInventories).map(([productCode, productData]) => ({
            productCode,
            ...productData
          }));
          if (inventories.length > 0) {
            setData(inventories);
            return true; // Data found
          }
        }
        setData([]); // No data for this date
        return false; // No data or empty data
      } catch (e) {
        setError(e.message);
        setData([]); // Clear data on error
        return false; // Error occurred
      }
    };

    const handleInitialLoad = async () => {
      setLoading(true); // Start loading
      let finalDate = selectedDate;

      const hasDataToday = await fetchAndSetData(selectedDate);

      if (!hasDataToday) {
        const dateWithData = await findDateWithData(selectedDate, -1); // Search backward
        if (dateWithData) {
          finalDate = dateWithData;
          await fetchAndSetData(finalDate); // Fetch data for the found date
        } else {
          setError('利用可能な在庫データが見つかりませんでした。');
          setData([]);
        }
      }
      setSelectedDate(finalDate); // Update selectedDate only once at the end of initial load
      setLoading(false); // End loading
    };

    const handleDateChange = async () => {
      setLoading(true); // Start loading
      await fetchAndSetData(selectedDate);
      setLoading(false); // End loading
    };

    // Determine if it's an initial load or a subsequent date change
    // A simple way to check for initial load is if data is empty and no error, and selectedDate is still today
    if (data.length === 0 && !error && formatDate(selectedDate) === formatDate(today)) {
      handleInitialLoad();
    } else {
      // This covers user-triggered date changes and the re-render after setSelectedDate in handleInitialLoad
      handleDateChange();
    }

  }, [selectedDate]); // selectedDate が変更されたら再フェッチ

  const handlePreviousDay = async () => {
    setLoading(true);
    const newDate = await findDateWithData(new Date(selectedDate.setDate(selectedDate.getDate() - 1)), -1);
    if (newDate) {
      setSelectedDate(newDate);
    } else {
      setError('これ以上前の在庫データが見つかりませんでした。');
      setLoading(false);
    }
  };

  const handleNextDay = async () => {
    setLoading(true);
    const newDate = await findDateWithData(new Date(selectedDate.setDate(selectedDate.getDate() + 1)), 1);
    if (newDate) {
      setSelectedDate(newDate);
    } else {
      setError('これ以上新しい在庫データが見つかりませんでした。');
      setLoading(false);
    }
  };

  // 翌日へボタンを無効にする条件
  const isNextDayDisabled = formatDate(selectedDate) === formatDate(today);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (data.length === 0) {
    return <Typography>表示する在庫データがありません。</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <Button onClick={handlePreviousDay} startIcon={<ArrowBackIosIcon />}>
          前日へ
        </Button>
        <Typography variant="h6" sx={{ mx: 2 }}>
          {formatDate(selectedDate)}
        </Typography>
        <Button onClick={handleNextDay} endIcon={<ArrowForwardIosIcon />} disabled={isNextDayDisabled}>
          翌日へ
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>商品コード</TableCell>
              <TableCell>商品名</TableCell>
              <TableCell align="right">在庫数</TableCell>
              <TableCell>在庫割合</TableCell> {/* 棒グラフ用 */}
              <TableCell>賞味期限</TableCell>
              <TableCell>販売可能日数</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.productCode}</TableCell>
                <TableCell>{row.productName}</TableCell>
                <TableCell align="right">{row.inventory}</TableCell>
                <TableCell>
                  {row.inventoryRatio !== null && row.inventoryRatio !== undefined ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: '100px', // 棒グラフの幅
                          height: '20px', // 棒グラフの高さ
                          bgcolor: 'grey.300',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          mr: 1,
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: `${Math.min(100, Math.max(0, row.inventoryRatio))}%`, // 0-100%に制限
                            bgcolor: 'primary.main', // 棒グラフの色
                            borderRadius: '4px',
                          },
                        }}
                      />
                      <Typography variant="body2">{`${row.inventoryRatio.toFixed(1)}%`}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2">N/A</Typography>
                  )}
                </TableCell>
                <TableCell>{row.oldestExpirationDate ? formatDate(new Date(row.oldestExpirationDate)) : 'N/A'}</TableCell>
                <TableCell>{row.daysUntilSalePossible !== null && row.daysUntilSalePossible !== undefined ? row.daysUntilSalePossible : 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InventoryList;