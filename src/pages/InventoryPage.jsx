import { Container, Typography } from '@mui/material';

function InventoryPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        在庫管理
      </Typography>
      <Typography variant="body1">
        商品の在庫確認、差異情報の確認、商品毎の在庫履歴の確認を行うページです。
      </Typography>
    </Container>
  );
}

export default InventoryPage;
