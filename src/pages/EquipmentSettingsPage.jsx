import { Container, Typography } from '@mui/material';

function EquipmentSettingsPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        備品設定
      </Typography>
      <Typography>
        このページで備品を登録・編集・削除します。
      </Typography>
    </Container>
  );
}

export default EquipmentSettingsPage;
