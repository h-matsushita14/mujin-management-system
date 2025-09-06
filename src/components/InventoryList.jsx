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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const formattedDate = formatDate(selectedDate);
        const response = await fetch(`/.netlify/functions/gas-proxy?page=inventory_latest&date=${formattedDate}`);
        const result = await response.json();
        // Netlify Functionsのログから、resultは直接データオブジェクトであることがわかる
        // result.calculatedInventories が実際の在庫データ
        if (result && result.calculatedInventories) {
          // calculatedInventories はオブジェクトなので、配列に変換してsetData
          setData(Object.values(result.calculatedInventories));
        } else {
          throw new Error(result.error || 'データの取得に失敗しました。');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]); // selectedDate が変更されたら再フェッチ

  const handlePreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
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