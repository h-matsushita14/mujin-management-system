import React, { useState } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Avatar,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import { Link } from 'react-router-dom';

// Mock data for products
const mockProducts = [
  {
    id: 1,
    name: '商品A',
    code: 'PROD-001',
    imageUrl: 'https://via.placeholder.com/40',
    stock: 10,
  },
  {
    id: 2,
    name: '商品B',
    code: 'PROD-002',
    imageUrl: 'https://via.placeholder.com/40',
    stock: 25,
  },
  {
    id: 3,
    name: '商品C',
    code: 'PROD-003',
    imageUrl: 'https://via.placeholder.com/40',
    stock: 0,
  },
];

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function StocktakingPage() {
  const [products, setProducts] = useState(mockProducts);
  const [tabValue, setTabValue] = useState(0);

  const handleStockChange = (id, newStock) => {
    const updatedProducts = products.map((p) =>
      p.id === id ? { ...p, stock: newStock } : p
    );
    setProducts(updatedProducts);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        棚卸管理
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="stocktaking tabs">
          <Tab label="登録" />
          <Tab label="修正・削除" />
          <Tab label="過去データ" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="stocktaking table">
            <TableHead>
              <TableRow>
                <TableCell>商品画像</TableCell>
                <TableCell>商品名</TableCell>
                <TableCell>商品コード</TableCell>
                <TableCell align="right">実在庫</TableCell>
                <TableCell align="center">詳細</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Avatar src={product.imageUrl} alt={product.name} />
                  </TableCell>
                  <TableCell component="th" scope="row">
                    {product.name}
                  </TableCell>
                  <TableCell>{product.code}</TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      variant="outlined"
                      size="small"
                      value={product.stock}
                      onChange={(e) => handleStockChange(product.id, e.target.value)}
                      sx={{ width: '100px' }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      component={Link}
                      to={`/product/${product.id}`}
                      variant="outlined"
                    >
                      詳細
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography>修正・削除の機能はここに実装します。</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography>過去の棚卸データはここに表示します。</Typography>
      </TabPanel>
    </Container>
  );
}

export default StocktakingPage;
