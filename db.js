import Database from 'better-sqlite3';

// Initializes an embedded SQLite database file
const db = new Database('commerce.db');

// Enable foreign key constraints and write-ahead logging for fast concurrent reads
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Create required relational tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL CHECK (stock >= 0)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    total_amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// Seed initial inventory if empty
const count = db.prepare('SELECT COUNT(*) as total FROM products').get();
if (count.total === 0) {
  const insert = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)');
  insert.run('Mechanical Keyboard', 79.99, 10);
  insert.run('Wireless Gaming Mouse', 49.99, 15);
  insert.run('USB-C Hub Multiport', 29.99, 5);
  console.log('Seeded initial products into commerce.db');
}

console.log('Database initialized with relational constraints.');

export default db;