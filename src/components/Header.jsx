import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Button, Drawer, List, ListItemButton, ListItemText, useMediaQuery, useTheme, ListItemIcon } from '@mui/material';
import { Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';

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

function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 'md' breakpoint for mobile
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <AppBar position="static">
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
          <Box sx={{ display: 'flex', ml: 2 }}>
            {menuItems.map((item) => (
              <Button
                key={item.title}
                color="inherit"
                component={Link}
                to={item.path}
                startIcon={item.icon} // Add icon to desktop menu
              >
                {item.title}
              </Button>
            ))}
          </Box>
        )}

        {/* Settings Icon - Rightmost */}
        {!isMobile && (
          <IconButton
            color="inherit"
            aria-label="settings"
            sx={{ ml: 'auto' }}
            component={Link} to="/settings"
          >
            <SettingsIcon />
          </IconButton>
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
          onClick={handleDrawerToggle}
          onKeyDown={handleDrawerToggle}
        >
          <List>
            {menuItems.map((item) => (
              <ListItemButton key={item.title} component={Link} to={item.path}>
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            ))}
            {/* Settings Icon at the bottom of Hamburger Menu */}
            <ListItemButton component={Link} to="/settings">
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="設定" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}

export default Header;