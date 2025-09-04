import { Container, Typography } from '@mui/material';

function OrderingPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        発注管理
      </Typography>
      <Typography variant="body1">
        商品の手動発注。基本的に自動発注されるが必要な場合に利用するページです。
      </Typography>
    </Container>
  );
}

export default OrderingPage;
