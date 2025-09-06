import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useManuals } from '../context/ManualContext';
import DeleteIcon from '@mui/icons-material/Delete';

function ManualSettingsPage() {
  const { manuals, updateManuals, uploadPdfAndAddManual, isLoading, error } = useManuals();
  const [newTitle, setNewTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleAddManual = async () => {
    if (!selectedFile) {
      setUploadError('PDFファイルを選択してください。');
      return;
    }
    if (selectedFile.type !== 'application/pdf') {
      setUploadError('PDFファイルのみアップロードできます。');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await uploadPdfAndAddManual(selectedFile, newTitle);
      setNewTitle('');
      setSelectedFile(null);
      // Clear file input
      document.getElementById('pdf-upload-input').value = '';
    } catch (err) {
      setUploadError(err.message || 'ファイルのアップロードに失敗しました。');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteManual = (index) => {
    const updatedManuals = manuals.filter((_, i) => i !== index);
    updateManuals(updatedManuals);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        マニュアルのURL設定
      </Typography>

      {isLoading && <CircularProgress sx={{ my: 2 }} />} 
      {error && <Alert severity="error" sx={{ my: 2 }}>データの読み込みに失敗しました: {error}</Alert>}
      {uploadError && <Alert severity="error" sx={{ my: 2 }}>{uploadError}</Alert>}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6">現在のマニュアル</Typography>
        <List>
          {manuals.length === 0 && !isLoading && !error && (
            <Typography variant="body2" color="text.secondary">
              マニュアルはまだ追加されていません。
            </Typography>
          )}
          {manuals.map((manual, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteManual(index)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={manual.title}
                secondary={
                  <a href={manual.url} target="_blank" rel="noopener noreferrer">
                    {manual.url}
                  </a>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box component="form" noValidate autoComplete="off">
        <Typography variant="h6">新しいマニュアルを追加</Typography>
        <TextField
          fullWidth
          label="マニュアル名 (任意)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          margin="normal"
        />
        <Button
          variant="contained"
          component="label"
          sx={{ mt: 2, mb: 2 }}
        >
          PDFファイルを選択
          <input
            type="file"
            hidden
            id="pdf-upload-input"
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </Button>
        {selectedFile && (
          <Typography variant="body2" sx={{ ml: 2 }}>
            選択中のファイル: {selectedFile.name}
          </Typography>
        )}
        <Button
          variant="contained"
          onClick={handleAddManual}
          sx={{ mt: 2, ml: 2 }}
          disabled={uploading || isLoading}
        >
          {uploading ? <CircularProgress size={24} /> : '追加'}
        </Button>
      </Box>
    </Container>
  );
}

export default ManualSettingsPage;