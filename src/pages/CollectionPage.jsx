import { Container, Typography } from '@mui/material';

function CollectionPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        回収管理
      </Typography>
      <Typography variant="body1">
        賞味期限が迫った商品の回収。また、在庫表記録された各商品の賞味期限の更新作業用ページです。
      </Typography>
    </Container>
  );
}

export default CollectionPage;
