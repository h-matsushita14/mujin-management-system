import { Container, Typography } from '@mui/material';

function ProductSettingsPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        取扱商品設定
      </Typography>
      <Typography>
        このページで取扱商品を登録・編集・削除します。
      </Typography>
    </Container>
  );
}

export default ProductSettingsPage;
