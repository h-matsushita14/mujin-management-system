import React, { useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Container,
  Typography,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { useUser } from '../../context/UserContext';
 
const GAS_API_URL = ''; // Placeholder for now

// Helper function to format a date to YYYY-MM-DD string in local time
const toYYYYMMDD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper function to generate period options
const generatePeriods = () => {
  const periods = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  for (let i = -1; i <= 4; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();

    periods.push({
      label: `${y}年${m + 1}月前半`,
      value: `${y}-${m + 1}-前半`,
      startDate: new Date(y, m, 1),
      endDate: new Date(y, m, 15),
    });
    periods.push({
      label: `${y}年${m + 1}月後半`,
      value: `${y}-${m + 1}-後半`,
      startDate: new Date(y, m, 16),
      endDate: new Date(y, m + 1, 0),
    });
  }
  return periods;
};

// Helper function to generate calendar days for a given period
const generateCalendarDays = (period) => {
  if (!period) return [];
  const days = [];
  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);
  const firstDayOfWeek = startDate.getDay();

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ empty: true, key: `empty-leading-${i}` });
  }

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateString = toYYYYMMDD(currentDate);
    days.push({
      date: new Date(currentDate),
      dayOfWeek: currentDate.getDay(),
      dateString: dateString,
      empty: false,
      key: dateString,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const lastDayOfWeek = days[days.length - 1].date.getDay();
  const remainingDaysInLastWeek = 6 - lastDayOfWeek;
  for (let i = 0; i < remainingDaysInLastWeek; i++) {
    days.push({ empty: true, key: `empty-trailing-${i}` });
  }

  return days;
};

const ShiftManagerPage = () => {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState('');
  const [selectedPeriodObject, setSelectedPeriodObject] = useState(null);
  const [shiftData, setShiftData] = useState({}); // { 'YYYY-MM-DD': { reg: [], tana: [] } }
  const [officeSettings, setOfficeSettings] = useState({});
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [editingDay, setEditingDay] = useState(null); // { dateString, reg, tana }
  const { selectedUser } = useUser();

  useEffect(() => {
    const generatedPeriods = generatePeriods();
    setPeriods(generatedPeriods);

    const now = new Date();
    const currentHalf = now.getDate() <= 15 ? '前半' : '後半';
    const defaultPeriodValue = `${now.getFullYear()}-${now.getMonth() + 1}-${currentHalf}`;
    setSelectedPeriodValue(defaultPeriodValue);
    setSelectedPeriodObject(generatedPeriods.find(p => p.value === defaultPeriodValue));

    fetchWorkers();
    // fetchShiftDataForPeriod(generatedPeriods.find(p => p.value === defaultPeriodValue)); // Optionally load existing shift on mount
  }, []);

  useEffect(() => {
    if (selectedPeriodObject) {
      fetchOfficeSettings();
    }
  }, [selectedPeriodObject]);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${GAS_API_URL}?action=getPersonnelList`);
      const data = await response.json();
      if (data.status === 'success') setWorkers(data.data);
    } catch (error) {
      console.error('作業者リストの取得に失敗:', error);
    }
  };

  // Function to fetch existing shift data for the selected period
  const fetchShiftDataForPeriod = async (period) => {
    setIsLoading(true);
    try {
      const startDate = toYYYYMMDD(period.startDate);
      const endDate = toYYYYMMDD(period.endDate);
      const response = await fetch(`${GAS_API_URL}?action=getShiftData&startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      if (data.status === 'success') {
        const formattedShift = {};
        data.data.forEach(([date, name, task]) => {
          const dateKey = toYYYYMMDD(new Date(date));
          if (!formattedShift[dateKey]) formattedShift[dateKey] = { reg: [], tana: [] };
          if (task === 'レジ締め') formattedShift[dateKey].reg.push(name);
          if (task === '棚卸') formattedShift[dateKey].tana.push(name);
        });
        setShiftData(formattedShift);
      }
    } catch (error) { console.error('既存シフトデータの取得に失敗:', error); }
    finally { setIsLoading(false); }
  };

  const fetchOfficeSettings = async () => {
    try {
      const response = await fetch(`${GAS_API_URL}?action=getOfficeSettings`);
      const data = await response.json();
      if (data.status === 'success') setOfficeSettings(data.data);
    } catch (error) {
      console.error('店舗設定の取得に失敗:', error);
    }
  };

  const handleCreateShift = async () => {
    setIsLoading(true);
    setSnackbar({ open: false, message: '', severity: 'success' });
    setShiftData({});
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ type: 'createShift', data: { period: selectedPeriodObject } }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        const formattedShift = {};
        data.data.forEach(([date, name, task]) => {
          const dateKey = toYYYYMMDD(new Date(date));
          if (!formattedShift[dateKey]) {
            formattedShift[dateKey] = { reg: [], tana: [] };
          }
          if (task === 'レジ締め') formattedShift[dateKey].reg.push(name);
          if (task === '棚卸') formattedShift[dateKey].tana.push(name);
        });
        setShiftData(formattedShift);
        setSnackbar({ open: true, message: 'シフトを生成しました。', severity: 'success' });
      } else {
        throw new Error(data.message || 'APIから不明なエラーが返されました。');
      }
    } catch (err) {
      console.error('シフト生成中にエラーが発生しました:', err);
      setSnackbar({ open: true, message: `シフトの生成に失敗しました: ${err.message}`, severity: 'error' });
      setShiftData({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveShift = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'saveShift', data: { period: selectedPeriodObject, shift: shiftData } }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSnackbar({ open: true, message: 'シフトを保存しました。', severity: 'success' });
      } else {
        throw new Error(data.message || 'シフトの保存に失敗しました。');
      }
    } catch (err) {
      setSnackbar({ open: true, message: `保存に失敗しました: ${err.message}`, severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayClick = (day) => {
    if (day.empty || officeSettings[day.dateString] === '休み') return;
    const currentShift = shiftData[day.dateString] || { reg: [], tana: [] };
    setEditingDay({
      dateString: day.dateString,
      reg: currentShift.reg[0] || '',
      tana: currentShift.tana[0] || '', // 棚卸も原則1名
    });
    setEditModalOpen(true);
  };

  const handleModalSave = () => {
    const { dateString, reg, tana } = editingDay;
    setShiftData(prev => ({
      ...prev,
      [dateString]: {
        reg: reg ? [reg] : [],
        tana: tana ? [tana] : [],
      }
    }));
    setEditModalOpen(false);
    setEditingDay(null);
  };

  const handleModalClose = () => {
    setEditModalOpen(false);
    setEditingDay(null);
  };

  const handlePeriodChange = (event) => {
    const value = event.target.value;
    setSelectedPeriodValue(value);
    setSelectedPeriodObject(periods.find(p => p.value === value));
    fetchShiftDataForPeriod(periods.find(p => p.value === value)); // Fetch existing shift when period changes
    setShiftData({}); // Clear shift data when period changes
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);
    const pdfButton = document.getElementById('pdf-download-button-shift-manager');
    if (pdfButton) pdfButton.style.visibility = 'hidden';

    let originalScrollY;
    try {
      const input = document.getElementById('shift-manager-paper-to-pdf'); // IDを付与する要素
      if (!input) {
        console.error('PDF化する要素が見つかりません。');
        setSnackbar({ open: true, message: 'PDF化する要素が見つかりません。', severity: 'error' });
        return;
      }

      // スクロール位置を一時的に調整して全体をキャプチャ
      originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true
      }); // scaleで解像度を上げる
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape
      const imgWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`無人販売所シフト表_${selectedPeriodObject?.label}.pdf`);
      setSnackbar({ open: true, message: 'シフト表をPDFでダウンロードしました。', severity: 'success' });
    } catch (error) {
      console.error('PDF生成中にエラーが発生しました:', error);
      setSnackbar({ open: true, message: `PDF生成に失敗しました: ${error.message}`, severity: 'error' });
    } finally {
      if (pdfButton) {
        pdfButton.style.visibility = 'visible';
      }
      setIsPdfGenerating(false);
      if (originalScrollY !== undefined) {
        window.scrollTo(0, originalScrollY); // スクロール位置を元に戻す
      }
    }
  };

  const calendarDays = useMemo(() => generateCalendarDays(selectedPeriodObject), [selectedPeriodObject]);

  return (
    <Container maxWidth="lg">
      <Paper id="shift-manager-paper-to-pdf" elevation={3} sx={{ p: { xs: 2, sm: 4 }, my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          シフト作成
        </Typography>
        <Typography variant="body1" paragraph>
          期間を選択してシフトを自動生成し、カレンダーから個別編集も可能です。
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={5}>
            <FormControl fullWidth>
              <InputLabel id="period-select-label">期間を選択</InputLabel>
              <Select
                labelId="period-select-label"
                value={selectedPeriodValue}
                label="期間を選択"
                onChange={handlePeriodChange}
              >
                {periods.map(p => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateShift}
              disabled={isLoading}
              fullWidth
              startIcon={isLoading && <CircularProgress size={20} color="inherit" />}
            >
              {isLoading ? 'シフト生成中...' : 'シフトを生成'}
            </Button>
          </Grid>
        </Grid>

        {/* Calendar Display */} {/* Add ID for PDF generation */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center' }}>
          {['日', '月', '火', '水', '木', '金', '土'].map(dayName => (
            <Paper key={dayName} elevation={0} square sx={{ p: 1, fontWeight: 'bold', color: dayName === '日' ? 'error.main' : dayName === '土' ? 'blue' : 'text.secondary', backgroundColor: 'grey.100' }}>
              {dayName}
            </Paper>
          ))}
          {calendarDays.map(day => {
            const isHoliday = officeSettings[day.dateString] === '休み';
            const isTanaoshiDay = officeSettings[day.dateString] === '棚卸';
            const dayShift = shiftData[day.dateString];
            return (
              <Paper
                key={day.key}
                variant="outlined"
                onClick={() => handleDayClick(day)}
                sx={{
                  minHeight: 100,
                  p: 1,
                  cursor: day.empty || isHoliday ? 'default' : 'pointer',
                  backgroundColor: day.empty ? 'action.hover' : isHoliday ? '#ffebee' : isTanaoshiDay ? '#e8f5e9' : 'background.paper', // 青から緑系統へ変更
                  '&:hover': {
                    backgroundColor: day.empty || isHoliday ? '' : 'action.selected',
                  }
                }}
              >
                {!day.empty && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{day.date.getDate()}</Typography>
                    {isHoliday ? (
                      <Typography variant="caption" color="error" sx={{ mt: 1 }}>休み</Typography>
                    ) : isTanaoshiDay ? (
                      <Typography variant="caption" color="primary" sx={{ mt: 1 }}>棚卸</Typography>
                    ) : (
                      <Box sx={{ textAlign: 'left', mt: 0.5, width: '100%' }}>
                        <Typography variant="caption" component="div">
                          レジ: <Typography
                            component="span"
                            variant="caption"
                            sx={{
                              fontWeight: dayShift?.reg[0] === selectedUser?.name ? 'bold' : 'normal',
                              color: dayShift?.reg[0] === selectedUser?.name ? 'primary.dark' : 'text.primary',
                            }}
                          >{dayShift?.reg[0] || '未'}</Typography>
                        </Typography>
                        <Typography variant="caption" component="div">
                          棚卸: <Typography
                            component="span"
                            variant="caption"
                            sx={{
                              fontWeight: dayShift?.tana[0] === selectedUser?.name ? 'bold' : 'normal',
                              color: dayShift?.tana[0] === selectedUser?.name ? 'primary.dark' : 'text.primary',
                            }}
                          >{dayShift?.tana[0] || 'なし'}</Typography>
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>

        <Button
          variant="contained"
          color="secondary"
          fullWidth
          sx={{ mt: 3 }}
          onClick={handleSaveShift}
          disabled={isSaving || isLoading || isPdfGenerating}
          startIcon={isSaving && <CircularProgress size={20} color="inherit" />}
        >
          {isSaving ? '保存中...' : 'この内容でシフトを保存'}
        </Button>
        <Button
          id="pdf-download-button-shift-manager"
          variant="outlined"
          color="info"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleDownloadPdf}
          disabled={isPdfGenerating || isLoading || isSaving}
          startIcon={isPdfGenerating && <CircularProgress size={20} color="inherit" />}
        >
          {isPdfGenerating ? 'PDF生成中...' : 'シフト表をPDFで出力'}
        </Button>
      </Paper>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={handleModalClose} fullWidth maxWidth="xs">
        <DialogTitle>シフト編集 ({editingDay?.dateString})</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>レジ締め担当</InputLabel>
            <Select
              value={editingDay?.reg || ''}
              label="レジ締め担当"
              onChange={(e) => setEditingDay(prev => ({ ...prev, reg: e.target.value }))}
            >
              <MenuItem value=""><em>なし</em></MenuItem>
              {workers.map(w => <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>棚卸担当</InputLabel>
            <Select
              value={editingDay?.tana || ''}
              label="棚卸担当"
              onChange={(e) => setEditingDay(prev => ({ ...prev, tana: e.target.value }))}
            >
              <MenuItem value=""><em>なし</em></MenuItem>
              {workers.map(w => <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleModalClose}>キャンセル</Button>
          <Button onClick={handleModalSave} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ShiftManagerPage;
