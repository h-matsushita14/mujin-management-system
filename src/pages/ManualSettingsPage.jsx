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
} from '@mui/material';
import { useManuals } from '../context/ManualContext';
import DeleteIcon from '@mui/icons-material/Delete';

function ManualSettingsPage() {
  const { manuals, updateManuals } = useManuals();
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleAddManual = () => {
    if (newTitle && newUrl) {
      updateManuals([...manuals, { title: newTitle, url: newUrl }]);
      setNewTitle('');
      setNewUrl('');
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

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6">現在のマニュアル</Typography>
        <List>
          {manuals.map((manual, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteManual(index)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={manual.title} secondary={manual.url} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box component="form" noValidate autoComplete="off">
        <Typography variant="h6">新しいマニュアルを追加</Typography>
        <TextField
          fullWidth
          label="マニュアル名"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="URL"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          margin="normal"
        />
        <Button variant="contained" onClick={handleAddManual} sx={{ mt: 2 }}>
          追加
        </Button>
      </Box>
    </Container>
  );
}

export default ManualSettingsPage;
