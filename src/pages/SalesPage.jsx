import React, { useState, useEffect } from 'react';
import { Container, Box, Typography } from '@mui/material';

function SalesPage() {
  const embedUrl = "https://lookerstudio.google.com/embed/reporting/a76d0615-84d0-4083-b07a-fcdec9123c40/page/0liUF";
  const reportWidth = 1200;
  const reportHeight = 800;

  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(reportWidth);

  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const currentContainerWidth = containerRef.current.offsetWidth;
        setContainerWidth(currentContainerWidth);
        const newScale = Math.min(currentContainerWidth / reportWidth, 1);
        setScale(newScale);
      }
    };

    window.addEventListener('resize', handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        売上レポート
      </Typography>
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          height: reportHeight * scale,
          overflow: 'hidden',
          transition: 'height 0.3s ease-in-out',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '50%',
            width: reportWidth,
            height: reportHeight,
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: 'top center',
            backgroundColor: '#f0f0f0',
          }}
        >
          <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            frameBorder="0"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            title="Sales Report"
          ></iframe>
        </Box>
      </Box>
      <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
        ※レポートの表示には時間がかかる場合があります。
      </Typography>
    </Container>
  );
}

export default SalesPage;
