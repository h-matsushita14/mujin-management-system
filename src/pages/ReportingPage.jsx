import { Container, Typography } from '@mui/material';

function ReportingPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        レジ締め報告
      </Typography>
      <Typography variant="body1">
        日々のレジ締め業務後の報告機能。報告後に販売実績が在庫へ反映するページです。
      </Typography>
    </Container>
  );
}

export default ReportingPage;
