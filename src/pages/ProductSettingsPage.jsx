import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Button, TextField, Dialog,
  DialogActions, DialogContent, DialogTitle, useMediaQuery, useTheme, DialogContentText,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, MenuItem
} from '@mui/material';

const ProductSettingsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({ // Initialize with all fields
    productCode: '',
    productName: '',
    netDoAProductCode: '',
    expirationDays: '',
    alertDays: '',
    standardStock: '',
    taxIncludedSellingPrice: '',
    reorderPoint: '',
    deliveryLot: '',
    expirationDeliveryBasis: '',
    inventoryManagement: '有', // Default to '有'
    imageData: '',
  });

  // State for delete confirmation dialog
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null); // Stores the product object to be deleted
  const [deleteStep, setDeleteStep] = useState(1); // 1 for first confirm, 2 for second

  // State for details dialog
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [productForDetails, setProductForDetails] = useState(null);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/.netlify/functions/gas-proxy?type=productMaster&page=managed_products`);
      const result = await response.json();

      const formattedProducts = result.map(p => ({
        productCode: p['商品コード'] || '',
        productName: p['商品名'] || '',
        netDoAProductCode: p['netDoA商品コード'] || '',
        expirationDays: p['賞味期限（日数）'] || '',
        alertDays: p['アラート日数'] || '',
        standardStock: p['基準在庫'] || '',
        taxIncludedSellingPrice: p['税込売価'] || '',
        reorderPoint: p['発注点'] || '',
        deliveryLot: p['納品ロット'] || '',
        expirationDeliveryBasis: p['賞味期限（納品日起点）'] || '',
        inventoryManagement: p['在庫管理'] || '有',
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
    setCurrentProduct(product ? { ...product } : { // Ensure all fields are present for new product
      productCode: '',
      productName: '',
      netDoAProductCode: '',
      expirationDays: '',
      alertDays: '',
      standardStock: '',
      taxIncludedSellingPrice: '',
      reorderPoint: '',
      deliveryLot: '',
      expirationDeliveryBasis: '',
      inventoryManagement: '有',
      imageData: '',
    });
    setOpenDialog(true);
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteStep(1);
    setOpenDeleteConfirmDialog(true);
  };

  const handleDetailsClick = (product) => {
    setProductForDetails(product);
    setOpenDetailsDialog(true);
  };

  const handleDetailsClose = () => {
    setOpenDetailsDialog(false);
    setProductForDetails(null);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentProduct(null);
  };

  const handleSaveProduct = async () => {
    if (!currentProduct.productCode || !currentProduct.productName) {
      alert('商品コードと商品名は必須です。');
      return;
    }

    try {
      const action = products.some(p => p.productCode === currentProduct.productCode) ? 'updateProduct' : 'addProduct';
      const response = await fetch(`/.netlify/functions/gas-proxy?type=productMaster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action, ...currentProduct }).toString(),
      });
      const result = await response.json();

      if (result.success) {
        console.log('Product saved successfully:', result);
        handleDialogClose();
        fetchProducts(); // Refetch products after successful save
      } else {
        alert(`保存に失敗しました: ${result.error}`);
      }
    } catch (e) {
      setError(e.message);
      alert(`保存中にエラーが発生しました: ${e.message}`);
    }
  };

  const handleDeleteConfirmClose = () => {
    setOpenDeleteConfirmDialog(false);
    setProductToDelete(null);
    setDeleteStep(1);
  };

  const handleFirstConfirm = () => {
    setDeleteStep(2);
  };

  const handleSecondConfirm = async () => {
    if (!productToDelete) return;
    try {
      console.log('Deleting product:', productToDelete.productCode);
      await new Promise(resolve => setTimeout(resolve, 500)); 

      handleDeleteConfirmClose();
      fetchProducts();
    } catch (e) {
      setError(e.message);
    }
  };

  const expirationDeliveryBasisOptions = ['180', '90', '製造元賞味', '賞味無'];

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        取扱商品設定
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
          <Table sx={{ minWidth: isSmallScreen ? 0 : 1200 }} aria-label="managed products table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>操作</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>商品コード</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>商品名</TableCell>
                {!isSmallScreen && (
                  <>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>netDoA商品コード</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>賞味期限（日数）</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>アラート日数</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>基準在庫</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>税込売価</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>発注点</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>納品ロット</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>賞味期限（納品日起点）</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>在庫管理</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>画像データ</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.productCode}>
                  <TableCell>
                    {isSmallScreen ? (
                      <Button size="small" onClick={() => handleDetailsClick(product)}>詳細</Button>
                    ) : (
                      <>
                        <Button size="small" onClick={() => handleAddEditClick(product)}>編集</Button>
                        <Button size="small" color="error" onClick={() => handleDeleteClick(product)}>削除</Button>
                      </>
                    )}
                  </TableCell>
                  <TableCell>{product.productCode}</TableCell>
                  <TableCell>{product.productName}</TableCell>
                  {!isSmallScreen && (
                    <>
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
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>{currentProduct?.productCode ? '商品編集' : '新規商品追加'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="productCode"
            label="商品コード"
            type="text"
            fullWidth
            variant="standard"
            value={currentProduct?.productCode || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, productCode: e.target.value })}
            disabled={!!currentProduct?.productCode}
          />
          <TextField
            margin="dense"
            id="productName"
            label="商品名"
            type="text"
            fullWidth
            variant="standard"
            value={currentProduct?.productName || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, productName: e.target.value })}
          />
          <TextField
            margin="dense"
            id="netDoAProductCode"
            label="netDoA商品コード"
            type="text"
            fullWidth
            variant="standard"
            value={currentProduct?.netDoAProductCode || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, netDoAProductCode: e.target.value })}
          />
          <TextField
            margin="dense"
            id="expirationDays"
            label="賞味期限（日数）"
            type="number"
            fullWidth
            variant="standard"
            value={currentProduct?.expirationDays || ''}
            onChange={(e) => {
              const newExpirationDays = e.target.value;
              const newAlertDays = newExpirationDays ? Math.round(parseInt(newExpirationDays, 10) / 3) : '';
              setCurrentProduct({ 
                ...currentProduct, 
                expirationDays: newExpirationDays, 
                alertDays: newAlertDays.toString() 
              });
            }}
          />
          <TextField
            margin="dense"
            id="alertDays"
            label="アラート日数"
            type="number"
            fullWidth
            variant="standard"
            value={currentProduct?.alertDays || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, alertDays: e.target.value })}
          />
          <TextField
            margin="dense"
            id="standardStock"
            label="基準在庫"
            type="number"
            fullWidth
            variant="standard"
            value={currentProduct?.standardStock || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, standardStock: e.target.value })}
          />
          <TextField
            margin="dense"
            id="taxIncludedSellingPrice"
            label="税込売価"
            type="number"
            fullWidth
            variant="standard"
            value={currentProduct?.taxIncludedSellingPrice || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, taxIncludedSellingPrice: e.target.value })}
          />
          <TextField
            margin="dense"
            id="reorderPoint"
            label="発注点"
            type="number"
            fullWidth
            variant="standard"
            value={currentProduct?.reorderPoint || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, reorderPoint: e.target.value })}
          />
          <TextField
            margin="dense"
            id="deliveryLot"
            label="納品ロット"
            type="number"
            fullWidth
            variant="standard"
            value={currentProduct?.deliveryLot || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, deliveryLot: e.target.value })}
          />
          <TextField
            margin="dense"
            id="expirationDeliveryBasis"
            label="賞味期限（納品日起点）"
            select
            fullWidth
            variant="standard"
            value={currentProduct?.expirationDeliveryBasis || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, expirationDeliveryBasis: e.target.value })}
          >
            {expirationDeliveryBasisOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <FormControl component="fieldset" margin="normal">
            <FormLabel component="legend">在庫管理</FormLabel>
            <RadioGroup
              row
              aria-label="inventory management"
              name="inventoryManagement"
              value={currentProduct?.inventoryManagement || '有'}
              onChange={(e) => setCurrentProduct({ ...currentProduct, inventoryManagement: e.target.value })}
            >
              <FormControlLabel value="有" control={<Radio />} label="有" />
              <FormControlLabel value="無" control={<Radio />} label="無" />
            </RadioGroup>
          </FormControl>
          <TextField
            margin="dense"
            id="imageData"
            label="画像データ"
            type="text"
            fullWidth
            variant="standard"
            value={currentProduct?.imageData || ''}
            onChange={(e) => setCurrentProduct({ ...currentProduct, imageData: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>キャンセル</Button>
          <Button onClick={handleSaveProduct}>{currentProduct?.productCode ? '保存' : '追加'}</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={handleDetailsClose} fullWidth maxWidth="sm">
        <DialogTitle>商品詳細</DialogTitle>
        <DialogContent>
          {productForDetails && (
            <Box>
              <Typography variant="subtitle1"><b>商品コード:</b> {productForDetails.productCode}</Typography>
              <Typography variant="subtitle1"><b>商品名:</b> {productForDetails.productName}</Typography>
              <Typography variant="subtitle1"><b>netDoA商品コード:</b> {productForDetails.netDoAProductCode}</Typography>
              <Typography variant="subtitle1"><b>賞味期限（日数）:</b> {productForDetails.expirationDays}</Typography>
              <Typography variant="subtitle1"><b>アラート日数:</b> {productForDetails.alertDays}</Typography>
              <Typography variant="subtitle1"><b>基準在庫:</b> {productForDetails.standardStock}</Typography>
              <Typography variant="subtitle1"><b>税込売価:</b> {productForDetails.taxIncludedSellingPrice}</Typography>
              <Typography variant="subtitle1"><b>発注点:</b> {productForDetails.reorderPoint}</Typography>
              <Typography variant="subtitle1"><b>納品ロット:</b> {productForDetails.deliveryLot}</Typography>
              <Typography variant="subtitle1"><b>賞味期限（納品日起点）:</b> {productForDetails.expirationDeliveryBasis}</Typography>
              <Typography variant="subtitle1"><b>在庫管理:</b> {productForDetails.inventoryManagement}</Typography>
              <Typography variant="subtitle1"><b>画像データ:</b> {productForDetails.imageData}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { handleDetailsClose(); handleAddEditClick(productForDetails); }}>編集</Button>
          <Button color="error" onClick={() => { handleDetailsClose(); handleDeleteClick(productForDetails); }}>削除</Button>
          <Button onClick={handleDetailsClose}>閉じる</Button>
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
