import { Container, Typography } from '@mui/material';

function StocktakingPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        棚卸管理
      </Typography>
      <Typography variant="body1">
        実在庫数のカウントを行う。理論在庫との差異がないかをチェックするページです。
      </Typography>
    </Container>
  );
}

export default StocktakingPage;
