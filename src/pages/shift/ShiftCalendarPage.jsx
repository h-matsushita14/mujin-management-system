import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Button,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useUser } from '../../context/UserContext';
import { EXTERNAL_SERVICES } from '../../config/externalServices';

const toYYYYMMDD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const generateHomepagePeriods = () => {
  const allPeriods = [];
  const now = new Date();
  for (let i = -2; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    allPeriods.push({ label: `${y}年${m + 1}月前半`, value: `${y}-${m + 1}-前半`, startDate: new Date(y, m, 1), endDate: new Date(y, m, 15) });
    allPeriods.push({ label: `${y}年${m + 1}月後半`, value: `${y}-${m + 1}-後半`, startDate: new Date(y, m, 16), endDate: new Date(y, m + 1, 0) });
  }
  const currentHalf = now.getDate() <= 15 ? '前半' : '後半';
  const currentPeriodValue = `${now.getFullYear()}-${now.getMonth() + 1}-${currentHalf}`;
  const currentIndex = allPeriods.findIndex(p => p.value === currentPeriodValue);
  if (currentIndex === -1) return [];
  const startIndex = Math.max(0, currentIndex - 1);
  const endIndex = Math.min(allPeriods.length, currentIndex + 4);
  return allPeriods.slice(startIndex, endIndex);
};

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
    days.push({ date: new Date(currentDate), dayOfWeek: currentDate.getDay(), dateString, empty: false, key: dateString });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  const lastDayOfWeek = days[days.length - 1].date.getDay();
  const remainingDaysInLastWeek = 6 - lastDayOfWeek;
  for (let i = 0; i < remainingDaysInLastWeek; i++) {
    days.push({ empty: true, key: `empty-trailing-${i}` });
  }
  return days;
};

function ShiftCalendarPage() {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState('');
  const [selectedPeriodObject, setSelectedPeriodObject] = useState(null);
  const [shiftData, setShiftData] = useState({});
  const [officeSettings, setOfficeSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { selectedUser } = useUser();

  useEffect(() => {
    const generatedPeriods = generateHomepagePeriods();
    setPeriods(generatedPeriods);
    if (generatedPeriods.length > 0) {
      const now = new Date();
      const currentHalf = now.getDate() <= 15 ? '前半' : '後半';
      const defaultPeriodValue = `${now.getFullYear()}-${now.getMonth() + 1}-${currentHalf}`;
      const defaultPeriod = generatedPeriods.find(p => p.value === defaultPeriodValue) || generatedPeriods[0];
      setSelectedPeriodValue(defaultPeriod.value);
      setSelectedPeriodObject(defaultPeriod);
    }
  }, []);

  useEffect(() => {
    if (selectedPeriodObject) {
      fetchShiftData(selectedPeriodObject);
      fetchOfficeSettings();
    }
  }, [selectedPeriodObject]);

  const fetchShiftData = async (period) => {
    setLoading(true);
    try {
      const adjustedStartDate = new Date(period.startDate);
      adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);
      const startDate = toYYYYMMDD(adjustedStartDate);
      const endDate = toYYYYMMDD(period.endDate);
      const response = await fetch(`${GAS_API_URL}?action=getShiftData&startDate=${startDate}&endDate=${endDate}`);
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
      }
    } catch (error) {
      console.error('シフトデータの取得に失敗:', error);
    } finally {
      setLoading(false);
    }
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

  const handlePrevPeriod = () => {
    const currentIndex = periods.findIndex(p => p.value === selectedPeriodValue);
    if (currentIndex > 0) {
      const newPeriod = periods[currentIndex - 1];
      setSelectedPeriodValue(newPeriod.value);
      setSelectedPeriodObject(newPeriod);
    }
  };

  const handleNextPeriod = () => {
    const currentIndex = periods.findIndex(p => p.value === selectedPeriodValue);
    if (currentIndex < periods.length - 1) {
      const newPeriod = periods[currentIndex + 1];
      setSelectedPeriodValue(newPeriod.value);
      setSelectedPeriodObject(newPeriod);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);
    const pdfButton = document.getElementById('pdf-download-button-homepage');
    if (pdfButton) pdfButton.style.visibility = 'hidden';

    let originalScrollY;
    try {
      const input = document.getElementById('homepage-shift-paper');
      if (!input) {
        console.error('PDF化する要素が見つかりません。');
        setSnackbar({ open: true, message: 'PDF化する要素が見つかりません。', severity: 'error' });
        return;
      }

      originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297;
      const pageHeight = 210;
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
        window.scrollTo(0, originalScrollY);
      }
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const calendarDays = useMemo(() => generateCalendarDays(selectedPeriodObject), [selectedPeriodObject]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper id="homepage-shift-paper" sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h5" component="h2">無人販売所シフト表</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <IconButton onClick={handlePrevPeriod} disabled={periods.findIndex(p => p.value === selectedPeriodValue) === 0}>
              <ArrowBackIosNewIcon />
            </IconButton>
            <Typography variant="body1" sx={{ minWidth: 150, textAlign: 'center' }}>
              {selectedPeriodObject?.label}
            </Typography>
            <IconButton onClick={handleNextPeriod} disabled={periods.findIndex(p => p.value === selectedPeriodValue) === periods.length - 1}>
              <ArrowForwardIosIcon />
            </IconButton>
            <Button
              id="pdf-download-button-homepage"
              variant="outlined"
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating || loading}
              startIcon={isPdfGenerating && <CircularProgress size={20} />}
            >
              {isPdfGenerating ? 'PDF生成中...' : 'PDF出力'}
            </Button>
          </Box>
        </Box>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center' }}>
            {['日', '月', '火', '水', '木', '金', '土'].map(dayName => (<Paper key={dayName} elevation={0} square sx={{ p: 1, fontWeight: 'bold', color: dayName === '日' ? 'error.main' : dayName === '土' ? 'blue' : 'text.secondary', backgroundColor: 'grey.100' }}>{dayName}</Paper>))}
            {calendarDays.map(day => {
              const isHoliday = officeSettings[day.dateString] === '休み';
              const isTanaoshiDay = officeSettings[day.dateString] === '棚卸';
              const dayShift = shiftData[day.dateString];
              return (
                <Paper key={day.key} variant="outlined" sx={{ minHeight: 80, p: 1, backgroundColor: day.empty ? 'action.hover' : isHoliday ? '#ffebee' : isTanaoshiDay ? '#e8f5e9' : 'background.paper' }}>
                  {!day.empty && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{day.date.getDate()}</Typography>
                      {isHoliday ? (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>休み</Typography>
                      ) : (
                        <Box sx={{ textAlign: 'left', mt: 0.5, width: '100%' }}>
                          <Box sx={{ position: 'relative', backgroundColor: 'grey.100', borderRadius: 1, p: 1, pt: 2.5, mb: 0.5 }}>
                            <Box sx={{ position: 'absolute', top: 2, left: 4, backgroundColor: 'primary.main', color: 'primary.contrastText', px: 0.75, py: 0.25, borderRadius: '4px', fontSize: '0.6rem', lineHeight: 1, fontWeight: 'bold' }}>
                              レジ
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: dayShift?.reg[0] === selectedUser?.name ? 'bold' : 'normal',
                                color: dayShift?.reg[0] === selectedUser?.name ? 'primary.dark' : 'text.primary',
                                textAlign: 'center',
                                width: '100%',
                              }}
                            >
                              {dayShift?.reg[0] || '未'}
                            </Typography>
                          </Box>
                          {isTanaoshiDay && (
                            <Box sx={{ position: 'relative', backgroundColor: 'grey.200', borderRadius: 1, p: 1, pt: 2.5 }}>
                              <Box sx={{ position: 'absolute', top: 2, left: 4, backgroundColor: 'secondary.main', color: 'secondary.contrastText', px: 0.75, py: 0.25, borderRadius: '4px', fontSize: '0.6rem', lineHeight: 1, fontWeight: 'bold' }}>
                                棚卸
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: dayShift?.tana[0] === selectedUser?.name ? 'bold' : 'normal',
                                  color: dayShift?.tana[0] === selectedUser?.name ? 'secondary.dark' : 'text.primary',
                                  textAlign: 'center',
                                  width: '100%',
                                }}
                              >
                                {dayShift?.tana[0] || '未'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default ShiftCalendarPage;

