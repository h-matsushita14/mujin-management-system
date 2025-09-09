import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Button, Drawer, List, ListItemButton, ListItemText, useMediaQuery, useTheme, ListItemIcon, Menu, MenuItem, Collapse, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

// Import all icons used in HomePage.jsx
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import BarChartIcon from '@mui/icons-material/BarChart';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';

// Define the main menu items (same as features in HomePage for consistency)
const menuItems = [
  {
    title: '売上',
    path: '/sales',
    icon: <BarChartIcon />
  },
  {
    title: '在庫',
    path: '/inventory',
    icon: <InventoryIcon />
  },
  {
    title: '発注',
    path: '/ordering',
    icon: <AddShoppingCartIcon />
  },
  {
    title: '納品',
    path: '/delivery',
    icon: <MoveToInboxIcon />
  },
  {
    title: '回収',
    path: '/collection',
    icon: <AssignmentReturnIcon />
  },
  {
    title: '報告',
    path: '/reporting',
    icon: <ReceiptIcon />
  },
  {
    title: '棚卸',
    path: '/stocktaking',
    icon: <WarehouseIcon />
  },
  {
    title: 'シフト',
    path: '/shift-manager',
    icon: <EditCalendarIcon />
  },
];

const settingsMenuItems = [
  {
    title: '取扱商品設定',
    path: '/product-settings',
  },
  {
    title: '備品設定',
    path: '/equipment-settings',
  },
  {
    title: 'マニュアルのURL設定',
    path: '/manual-settings',
  }
];

function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 'md' breakpoint for mobile
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(!settingsOpen);
  };

  return (
    <AppBar position="fixed">
      <Toolbar>
        {/* Application Title */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>株式会社キスケフーズ</Typography>
              <Typography variant="h5" sx={{ fontSize: '1.5rem', fontWeight: 'bold' }}>無人販売所</Typography>
              <Typography variant="body1" sx={{ fontSize: '1rem' }}>管理用アプリケーション</Typography>
            </Box>
          </Link>
        </Typography>

        {/* Hamburger Menu for Mobile */}
        {isMobile && (
          <IconButton
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Desktop Menu Items */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.title}>
                <Button
                  color="inherit"
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    flexDirection: 'column',
                    minWidth: 'auto',
                    padding: '6px 8px',
                    '& .MuiButton-startIcon': {
                      margin: 0,
                    },
                  }}
                >
                  {item.title}
                </Button>
                {index < menuItems.length - 1 && (
                  <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: 'rgba(255, 255, 255, 0.3)' }} />
                )}
              </React.Fragment>
            ))}
          </Box>
        )}

        {/* Settings Icon - Rightmost */}
        {!isMobile && (
          <div>
            <IconButton
              color="inherit"
              aria-label="settings"
              sx={{ ml: 'auto' }}
              onClick={handleMenu}
            >
              <SettingsIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              {settingsMenuItems.map((item) => (
                <MenuItem key={item.title} onClick={handleClose} component={Link} to={item.path}>
                  {item.title}
                </MenuItem>
              ))}
            </Menu>
          </div>
        )}
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
        >
          <List>
            {menuItems.map((item) => (
              <ListItemButton key={item.title} component={Link} to={item.path} onClick={handleDrawerToggle}>
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            ))}
            <ListItemButton onClick={handleSettingsClick}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="設定" />
              {settingsOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {settingsMenuItems.map((item) => (
                  <ListItemButton key={item.title} component={Link} to={item.path} sx={{ pl: 4 }} onClick={handleDrawerToggle}>
                    <ListItemText primary={item.title} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}

export default Header;
