import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { useManuals } from '../context/ManualContext';

function ManualsPage() {
  const { manuals } = useManuals();

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        各種マニュアル
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mt: 4,
        }}
      >
        {manuals.map((manual, index) => (
          <Button
            key={index}
            variant="contained"
            href={manual.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ justifyContent: 'flex-start', py: 2 }}
          >
            {manual.title}
          </Button>
        ))}
      </Box>
    </Container>
  );
}

export default ManualsPage;
