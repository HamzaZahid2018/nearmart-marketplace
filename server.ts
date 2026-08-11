import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_STATE } from './src/data';
import { AppState, Product, Shop, Order, Coupon, CartItem } from './src/types';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'database.json');

app.use(express.json());

// Load or initialize DB state
function readDb(): AppState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.shops && parsed.products && parsed.orders) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read database file, resetting to initial state:', err);
  }
  // Write initial state if not present
  writeDb(INITIAL_STATE);
  return INITIAL_STATE;
}

function writeDb(state: AppState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// ----------------------------------------------------
// FULL-STACK REST API ENDPOINTS
// ----------------------------------------------------

import { spawn } from 'child_process';
import axios from 'axios';

// Spawn the Django server on 127.0.0.1:8001 if available
const djangoProcess = spawn('python', ['backend/manage.py', 'runserver', '127.0.0.1:8001'], {
  stdio: 'ignore',
});

djangoProcess.on('error', (err) => {
  console.warn('Django backend server notice:', err.message);
});

// Proxy GET Consolidated App State by assembling real data from Django endpoints
app.get('/api/v1/state', async (req: Request, res: Response) => {
  try {
    const [shopsRes, productsRes, couponsRes] = await Promise.all([
      axios.get('http://127.0.0.1:8001/api/v1/shops/'),
      axios.get('http://127.0.0.1:8001/api/v1/products/'),
      axios.get('http://127.0.0.1:8001/api/v1/promotions/coupons/')
    ]);

    // Format the list of shops
    const rawShops = shopsRes.data.results || shopsRes.data || [];
    const shops = rawShops.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      rating: parseFloat(s.rating) || 5.0,
      reviewCount: s.review_count || 0,
      logo: s.image || '',
      banner: s.image || '',
      category: s.category || 'Bakery',
      distance: `${s.delivery_range_km || '1.0'} miles`,
      deliveryTime: '20-35 min',
      minimumOrder: 10,
      address: 'NearMart Community',
      verified: s.verified || false,
      approved: s.approved || false,
      ownerName: s.owner_details?.username || 'Vendor',
      ownerEmail: s.owner_details?.email || '',
      phone: s.owner_details?.phone_number || '',
      revenue: parseFloat(s.revenue) || 0,
      joinedDate: s.created_at ? s.created_at.split('T')[0] : '2026-01-01'
    }));

    // Format the list of products
    const rawProducts = productsRes.data.results || productsRes.data || [];
    const products = rawProducts.map((p: any) => ({
      id: p.id,
      shopId: p.shop,
      shopName: p.shop_name || 'Vendor',
      category: p.category_name || 'Bakery',
      name: p.name,
      description: p.description || '',
      price: parseFloat(p.price) || 0.99,
      image: p.primary_image || '',
      inventory: p.inventory_qty || 0,
      rating: parseFloat(p.rating) || 5.0,
      reviewCount: p.review_count || 0,
      salesCount: p.sales_count || 0,
      tags: []
    }));

    // Format the list of coupons
    const rawCoupons = couponsRes.data.results || couponsRes.data || [];
    const coupons = rawCoupons.map((c: any) => ({
      id: c.id,
      code: c.code,
      discountPercent: parseFloat(c.discount_percent) || 10,
      minSpend: parseFloat(c.min_spend) || 0,
      description: c.description || '',
      active: c.active || false
    }));

    res.json({
      shops,
      products,
      coupons,
      cart: [],
      orders: [],
      activeCouponCode: null,
      activeOrderTrackId: null,
      selectedCategory: 'All',
      searchQuery: '',
      userProfile: {
        name: 'NearMart User',
        email: '',
        phone: '',
        address: '',
      },
    });
  } catch (err: any) {
    console.warn('Proxy connecting to Django /api/v1/state... falling back to local database.json:', err.message);
    const db = readDb();
    res.json(db);
  }
});

// Proxy any other /api/v1/* request straight to Django REST Framework
app.all('/api/v1/*', async (req: Request, res: Response) => {
  // Convert original Express URL into Django URL
  const djangoUrl = `http://127.0.0.1:8001${req.originalUrl}`;
  
  try {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && key !== 'host' && key !== 'connection') {
        headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }

    const response = await axios({
      method: req.method as any,
      url: djangoUrl,
      headers: headers,
      data: req.body,
      params: req.query,
      validateStatus: () => true,
      responseType: 'json',
    });

    res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error(`Proxy connection error to Django (${req.method} ${req.originalUrl}):`, err.message);
    res.status(502).json({ error: 'Gateway Error: Failed to connect to Django backend service.' });
  }
});

// ----------------------------------------------------
// VITE AND STATIC ASSETS SERVING MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NearMart full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
