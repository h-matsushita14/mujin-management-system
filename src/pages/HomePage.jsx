import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
} from '@mui/material';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import BarChartIcon from '@mui/icons-material/BarChart'; // Changed from MonetizationOnIcon
import InventoryIcon from '@mui/icons-material/Inventory';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import ReceiptIcon from '@mui/icons-material/Receipt'; // Changed from AssessmentIcon
import WarehouseIcon from '@mui/icons-material/Warehouse';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox'; // New import for納品
import DescriptionIcon from '@mui/icons-material/Description'; // For マニュアル
import BuildIcon from '@mui/icons-material/Build'; // For 備品管理
import { EXTERNAL_SERVICES } from '../config/externalServices'; // New import

const features = [
  {
    title: '売上',
    description: '日毎、週間、月間、期間指定をした売上データの確認。',
    path: EXTERNAL_SERVICES.lookerStudio.salesReport.url, // Changed
    icon: <BarChartIcon fontSize="large" color="primary" />,
  },
  {
    title: '在庫',
    description: '商品の在庫確認、差異情報の確認、商品毎の在庫履歴の確認。',
    path: '/inventory',
    icon: <InventoryIcon fontSize="large" color="primary" />,
  },
  {
    title: '発注',
    description: '商品の手動発注。基本的に自動発注されるが必要な場合に利用。',
    path: '/ordering',
    icon: <AddShoppingCartIcon fontSize="large" color="primary" />,
  },
  {
    title: '納品',
    description: '商品納品時に数量、賞味期限の入力を行い、在庫に反映。',
    path: '/delivery',
    icon: <MoveToInboxIcon fontSize="large" color="primary" />,
  },
  {
    title: '回収',
    description: '賞味期限が迫った商品の回収。また、在庫表記録された各商品の賞味期限の更新作業用。',
    path: '/collection',
    icon: <AssignmentReturnIcon fontSize="large" color="primary" />,
  },
  {
    title: '報告',
    description: '日々のレジ締め業務後の報告機能。報告後に販売実績が在庫へ反映。',
    path: '/reporting',
    icon: <ReceiptIcon fontSize="large" color="primary" />,
  },
  {
    title: '棚卸',
    description: '実在庫数のカウントを行う。理論在庫との差異がないかをチェックする。',
    path: '/stocktaking',
    icon: <WarehouseIcon fontSize="large" color="primary" />,
  },
  {
    title: 'シフト',
    description: '無地販売所のレジ締めと棚卸業務のシフトの作成、確認。',
    path: '/shift-manager',
    icon: <EditCalendarIcon fontSize="large" color="primary" />,
  },
];

const subMenuItems = [
  {
    title: '各種マニュアル',
    path: '/manuals',
    icon: <DescriptionIcon />,
  },
  {
    title: '備品管理',
    path: '/equipment',
    icon: <BuildIcon />,
  },
  {
    title: '地方発送補助ツール',
    path: '/shipping-tool',
    icon: <LocalShippingIcon />, // Reusing LocalShippingIcon
  },
];

function HomePage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        各機能へは以下のカードからアクセスしてください。
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr', // Added a third column for larger screens
          },
          mt: 2,
          mb: 4,
        }}
      >
        {features.map((feature) => (
          <Card
            key={feature.title}
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {feature.icon}
                <Typography variant="h6" component="h2" sx={{ ml: 2 }}>
                  {feature.title}
                </Typography>
              </Box>
              <Typography color="text.secondary">
                {feature.description}
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                component={Link}
                to={feature.path}
                size="small"
                variant="contained"
              >
                この機能を使う
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      <Typography variant="h6" component="h2" sx={{ mt: 6, mb: 2 }}>
        その他の機能
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'center',
          mb: 4,
        }}
      >
        {subMenuItems.map((item) => (
          <Button
            key={item.title}
            variant="outlined"
            component={Link}
            to={item.path}
            startIcon={item.icon}
            sx={{ minWidth: 180 }}
          >
            {item.title}
          </Button>
        ))}
      </Box>
    </Container>
  );
}

export default HomePage;

