import React from 'react';
import { Container, Box, Typography } from '@mui/material';

function SalesPage() {
  const embedUrl = "https://lookerstudio.google.com/embed/reporting/a76d0615-84d0-4083-b07a-fcdec9123c40/page/0liUF";

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        売上レポート
      </Typography>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingBottom: '75%', // Aspect ratio 4:3 (height / width * 100) for 600x443, approx 73.8%
          height: 0,
          overflow: 'hidden',
          backgroundColor: '#f0f0f0', // Placeholder background
        }}
      >
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          frameBorder="0"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
          }}
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          title="Sales Report"
        ></iframe>
      </Box>
      <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
        ※レポートの表示には時間がかかる場合があります。
      </Typography>
    </Container>
  );
}

export default SalesPage;