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

  // State for delete confirmation dialog
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null); // Stores the product object to be deleted
  const [deleteStep, setDeleteStep] = useState(1); // 1 for first confirm, 2 for second

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/.netlify/functions/gas-proxy?type=stock&page=managed_products`);
      const result = await response.json();

      const formattedProducts = result.map(p => ({
        productCode: p.productCode || '',
        productName: p.productName || '',
        netDoAProductCode: p['netDoA商品コード'] || '',
        expirationDays: p['賞味期限（日数）'] || '',
        alertDays: p['アラート日数'] || '',
        standardStock: p['基準在庫'] || '',
        taxIncludedSellingPrice: p['税込売価'] || '',
        reorderPoint: p['発注点'] || '',
        deliveryLot: p['納品ロット'] || '',
        expirationDeliveryBasis: p['賞味期限（納品日起点）'] || '',
        inventoryManagement: p['在庫管理'] || '',
        imageData: p['画像データ'] || '',
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

  // Modified handleDeleteClick to open custom dialog
  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteStep(1);
    setOpenDeleteConfirmDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentProduct(null);
  };

  const handleSaveProduct = async () => {
    // TODO: Add/Edit API call
    console.log('Saving product:', currentProduct);
    handleDialogClose();
    fetchProducts();
  };

  // Functions for delete confirmation dialog
  const handleDeleteConfirmClose = () => {
    setOpenDeleteConfirmDialog(false);
    setProductToDelete(null);
    setDeleteStep(1); // Reset for next time
  };

  const handleFirstConfirm = () => {
    setDeleteStep(2); // Move to second step
  };

  const handleSecondConfirm = async () => {
    if (!productToDelete) return;
    try {
      // TODO: Implement actual delete API call here using productToDelete.productCode
      console.log('Deleting product:', productToDelete.productCode);
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 500)); 

      handleDeleteConfirmClose();
      fetchProducts(); // Refetch products after successful deletion
    } catch (e) {
      setError(e.message);
    }
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
          <Table sx={{ minWidth: 1200 }} aria-label="managed products table">
            <TableHead>
              <TableRow>
                <TableCell>商品コード</TableCell>
                <TableCell>商品名</TableCell>
                <TableCell>netDoA商品コード</TableCell>
                <TableCell>賞味期限（日数）</TableCell>
                <TableCell>アラート日数</TableCell>
                <TableCell>基準在庫</TableCell>
                <TableCell>税込売価</TableCell>
                <TableCell>発注点</TableCell>
                <TableCell>納品ロット</TableCell>
                <TableCell>賞味期限（納品日起点）</TableCell>
                <TableCell>在庫管理</TableCell>
                <TableCell>画像データ</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.productCode}>
                  <TableCell>{product.productCode}</TableCell>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell>{product.netDoAProductCode}</TableCell>
                  <TableCell>{product.expirationDays}</TableCell>
                  <TableCell>{product.alertDays}</TableCell>
                  <TableCell>{product.standardStock}</TableCell>
                  <TableCell>{product.taxIncludedSellingPrice}</TableCell>
                  <TableCell>{product.reorderPoint}</TableCell>
                  <TableCell>{product.deliveryLot}</TableCell>
                  <TableCell>{product.expirationDeliveryBasis}</TableCell>
                  <TableCell>{product.inventoryManagement}</TableCell>
                  <TableCell>{product.imageData}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleAddEditClick(product)}>編集</Button>
                    <Button size="small" color="error" onClick={() => handleDeleteClick(product)}>削除</Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteConfirmDialog} onClose={handleDeleteConfirmClose}>
        <DialogTitle>
          {deleteStep === 1 ? '削除確認' : '最終確認'}
        </DialogTitle>
        <DialogContent>
          {deleteStep === 1 ? (
            <Typography>
              対象の商品名: <Box component="span" sx={{ fontWeight: 'bold' }}>{productToDelete?.productName}</Box> を削除します。よろしいですか？
            </Typography>
          ) : (
            <Typography>
              本当に削除しますがよろしいですか？この操作は元に戻せません。
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteConfirmClose}>キャンセル</Button>
          {deleteStep === 1 ? (
            <Button onClick={handleFirstConfirm} color="error">はい</Button>
          ) : (
            <Button onClick={handleSecondConfirm} color="error" variant="contained">本当に削除</Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProductSettingsPage;