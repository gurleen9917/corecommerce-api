import express from 'express';
import db from './db.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = 3000;

// 1. GET /api/products - View all products and inventory counts
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products').all();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/orders - Transactional Order Checkout (ACID)
// This is the core interview showcase: atomic stock validation and deduction
const processOrderTransaction = db.transaction((items) => {
  let totalAmount = 0;
  const verifiedItems = [];

  // Step A: Read and lock-check each item's stock
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);

    if (!product) {
      throw new Error(`Product with ID ${item.productId} does not exist.`);
    }

    if (product.stock < item.quantity) {
      throw new Error(
        `Insufficient inventory for "${product.name}". Requested: ${item.quantity}, Available: ${product.stock}`
      );
    }

    totalAmount += product.price * item.quantity;
    verifiedItems.push({ ...product, orderQuantity: item.quantity });
  }

  // Step B: Insert master order record
  const orderResult = db
    .prepare('INSERT INTO orders (status, total_amount) VALUES (?, ?)')
    .run('CONFIRMED', totalAmount);

  const orderId = orderResult.lastInsertRowid;

  // Step C: Atomically deduct stock and record line items
  const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
  );

  for (const item of verifiedItems) {
    updateStock.run(item.orderQuantity, item.id);
    insertItem.run(orderId, item.id, item.orderQuantity, item.price);
  }

  return { orderId, totalAmount, itemsCount: verifiedItems.length };
});

app.post('/api/orders', (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Order must contain an array of items with productId and quantity.',
    });
  }

  try {
    // If any item check fails inside, the transaction automatically rolls back completely
    const summary = processOrderTransaction(items);
    res.status(201).json({
      success: true,
      message: 'Order placed successfully and inventory updated atomically.',
      data: summary,
    });
  } catch (error) {
    // 400 Bad Request if validation or inventory fails (Zero stock deducted)
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. POST /api/orders/:id/cancel - Order Cancellation & Inventory Restock
const cancelOrderTransaction = db.transaction((orderId) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

  if (!order) {
    throw new Error(`Order #${orderId} not found.`);
  }

  if (order.status === 'CANCELLED') {
    throw new Error(`Order #${orderId} is already cancelled.`);
  }

  // Fetch ordered items to restore quantities
  const orderItems = db
    .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
    .all(orderId);

  const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
  for (const item of orderItems) {
    restock.run(item.quantity, item.product_id);
  }

  // Update order status
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('CANCELLED', orderId);

  return { orderId, restockedItems: orderItems.length };
});

app.post('/api/orders/:id/cancel', (req, res) => {
  const { id } = req.params;

  try {
    const result = cancelOrderTransaction(id);
    res.json({
      success: true,
      message: `Order #${id} cancelled and inventory restocked successfully.`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`CoreCommerce service active at http://localhost:${PORT}`);
});