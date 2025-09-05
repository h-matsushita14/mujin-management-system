import React from 'react';
import { Typography, Container } from '@mui/material';

function WorkerRegistrationPage() {
  return (
    <Container>
      <Typography variant="h5" component="h2" gutterBottom>
        作業員登録
      </Typography>
      <Typography>
        このページで作業員の登録、編集、削除を行います。
      </Typography>
    </Container>
  );
}

export default WorkerRegistrationPage;
