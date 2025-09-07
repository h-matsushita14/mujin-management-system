import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Button, TextField, Dialog,
  DialogActions, DialogContent, DialogTitle
} from '@mui/material';

const ProductSettingsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/.netlify/functions/gas-proxy?type=stock&page=managed_products`);
      const result = await response.json();

      // API応答がproductCodeを含まない可能性があるため、防御的に処理
      const formattedProducts = result.map(p => ({
        productCode: p.productCode || '', // productCodeがない場合は空文字列
        productName: p.productName || '',
        // 他の必要なプロパティもここに追加
      }));
      setProducts(formattedProducts);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddEditClick = (product = null) => {
    setCurrentProduct(product);
    setOpenDialog(true);
  };

  const handleDeleteClick = async (productCode) => {
    if (!window.confirm(`商品コード: ${productCode} を削除しますか？`)) {
      return;
    }
    try {
      // TODO: Delete API call
      console.log('Deleting product:', productCode);
      // After successful deletion, refetch products
      fetchProducts();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentProduct(null);
  };

  const handleSaveProduct = async () => {
    // TODO: Add/Edit API call
    console.log('Saving product:', currentProduct);
    handleDialogClose();
    // After successful save, refetch products
    fetchProducts();
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        取り扱い商品設定
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => handleAddEditClick()}>新規商品追加</Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
      ) : products.length === 0 ? (
        <Alert severity="info">登録されている商品がありません。</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="managed products table">
            <TableHead>
              <TableRow>
                <TableCell>商品コード</TableCell>
                <TableCell>商品名</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.productCode}>
                  <TableCell>{product.productCode}</TableCell>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleAddEditClick(product)}>編集</Button>
                    <Button size="small" color="error" onClick={() => handleDeleteClick(product.productCode)}>削除</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>{currentProduct ? '商品編集' : '新規商品追加'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="productCode"
            label="商品コード"
            type="text"
            fullWidth
            variant="standard"
            defaultValue={currentProduct?.productCode || ''}
            // TODO: Add onChange handler to update currentProduct state
          />
          <TextField
            margin="dense"
            id="productName"
            label="商品名"
            type="text"
            fullWidth
            variant="standard"
            defaultValue={currentProduct?.productName || ''}
            // TODO: Add onChange handler to update currentProduct state
          />
          {/* TODO: Add other fields as needed */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>キャンセル</Button>
          <Button onClick={handleSaveProduct}>{currentProduct ? '保存' : '追加'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProductSettingsPage;