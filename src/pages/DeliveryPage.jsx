import { Container, Typography } from '@mui/material';

function DeliveryPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        納品管理
      </Typography>
      <Typography variant="body1">
        商品納品時に数量、賞味期限の入力を行い、在庫に反映するページです。
      </Typography>
    </Container>
  );
}

export default DeliveryPage;
