import React from 'react';
import { Typography, Container } from '@mui/material';

function WorkerHolidaySettingsPage() {
  return (
    <Container>
      <Typography variant="h5" component="h2" gutterBottom>
        作業員の休日設定
      </Typography>
      <Typography>
        このページで作業員ごとの休日設定を行います。
      </Typography>
    </Container>
  );
}

export default WorkerHolidaySettingsPage;
