CREATE DATABASE IF NOT EXISTS textileflow_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE textileflow_crm;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS quotation_items;
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS follow_ups;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','salesperson','support') NOT NULL DEFAULT 'salesperson',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  city VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Gujarat',
  buyer_type ENUM('Retailer','Wholesaler','Distributor','Manufacturer','Other') DEFAULT 'Retailer',
  gstin VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customers_phone(phone),
  INDEX idx_customers_city(city)
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  design_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(150) NOT NULL,
  fabric_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) DEFAULT 'Saree',
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  moq INT NOT NULL DEFAULT 1,
  stock_quantity INT NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  business_name VARCHAR(150),
  phone VARCHAR(20) NOT NULL,
  city VARCHAR(100),
  buyer_type VARCHAR(50) DEFAULT 'Retailer',
  source ENUM('Manual','WhatsApp','Facebook Ads','Instagram Ads','Website','Referral','IndiaMART') DEFAULT 'Manual',
  status ENUM('New','Contacted','Qualified','Quotation','Won','Lost') DEFAULT 'New',
  estimated_value DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  customer_id INT NULL,
  assigned_to INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_leads_status(status),
  INDEX idx_leads_source(source)
);

CREATE TABLE follow_ups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  task VARCHAR(255) NOT NULL,
  due_date DATETIME NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  customer_id INT NULL,
  lead_id INT NULL,
  assigned_to INT NULL,
  deal_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  stage ENUM('Prospect','Negotiation','Closed') NOT NULL DEFAULT 'Prospect',
  outcome ENUM('Open','Won','Lost') NOT NULL DEFAULT 'Open',
  expected_close_date DATE NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_deals_stage(stage),
  INDEX idx_deals_assigned(assigned_to)
);

CREATE TABLE support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  lead_id INT NULL,
  subject VARCHAR(180) NOT NULL,
  description TEXT,
  priority ENUM('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium',
  status ENUM('Open','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Open',
  assigned_to INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tickets_status(status),
  INDEX idx_tickets_assigned(assigned_to)
);

CREATE TABLE campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_name VARCHAR(150) NOT NULL,
  platform ENUM('Facebook','Instagram','WhatsApp','Other') DEFAULT 'Instagram',
  spend DECIMAL(12,2) DEFAULT 0,
  leads_count INT DEFAULT 0,
  qualified_leads INT DEFAULT 0,
  conversions INT DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_number VARCHAR(30) NOT NULL UNIQUE,
  customer_id INT NULL,
  lead_id INT NULL,
  status ENUM('Draft','Sent','Accepted','Rejected','Expired') DEFAULT 'Draft',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

CREATE TABLE quotation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  product_id INT NULL,
  product_name VARCHAR(150) NOT NULL,
  design_code VARCHAR(50),
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User','admin@textileflow.local','$2a$10$Atpf/joH64fvM7hYz3puxOxfoQ7Lq0oDM2Eenmn7t4F8Q3OK1gAvG','admin'),
('Priya Shah','priya@textileflow.local','$2a$10$Atpf/joH64fvM7hYz3puxOxfoQ7Lq0oDM2Eenmn7t4F8Q3OK1gAvG','salesperson');

INSERT INTO customers (business_name,contact_person,phone,email,city,state,buyer_type,gstin,notes) VALUES
('Shreeji Fashion Hub','Kunal Patel','9876543210','kunal@example.com','Rajkot','Gujarat','Retailer','24ABCDE1234F1Z5','Regular saree buyer'),
('Mahavir Textile Mart','Rakesh Jain','9876501234','rakesh@example.com','Ahmedabad','Gujarat','Wholesaler','24BCDEF2345G1Z6','Interested in bulk orders'),
('Radhe Creation','Nisha Desai','9898989898','nisha@example.com','Vadodara','Gujarat','Distributor','','Prefers new collections'),
('Krishna Garments','Amit Shah','9825012345','amit@example.com','Surat','Gujarat','Retailer','','Needs cotton fabrics');

INSERT INTO products (design_code,product_name,fabric_type,category,price,moq,stock_quantity,image_url) VALUES
('TF-SR-1001','Royal Banarasi Saree','Silk Blend','Saree',1850,6,120,'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600'),
('TF-SR-1002','Floral Printed Saree','Georgette','Saree',780,6,240,'https://images.unsplash.com/photo-1583391733956-6c78276477e7?w=600'),
('TF-FB-2001','Premium Cotton Fabric','Cotton','Fabric',220,20,850,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'),
('TF-LH-3001','Embroidered Lehenga Set','Silk Blend','Lehenga',4200,2,38,'https://images.unsplash.com/photo-1597983073493-88cd35cf93a0?w=600'),
('TF-SR-1003','Partywear Sequence Saree','Net','Saree',1450,4,95,'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600');

INSERT INTO leads (name,business_name,phone,city,buyer_type,source,status,estimated_value,notes,assigned_to) VALUES
('Kunal Patel','Shreeji Fashion Hub','9876543210','Rajkot','Retailer','Instagram Ads','Qualified',45000,'Asked for latest saree designs',2),
('Rakesh Jain','Mahavir Textile Mart','9876501234','Ahmedabad','Wholesaler','WhatsApp','Quotation',125000,'Quotation discussion ongoing',2),
('Nisha Desai','Radhe Creation','9898989898','Vadodara','Distributor','Facebook Ads','New',85000,'Interested in new collection',1),
('Amit Shah','Krishna Garments','9825012345','Surat','Retailer','Referral','Contacted',32000,'Follow up for cotton fabric',2),
('Mehul Traders','Mehul Traders','9900011223','Bhavnagar','Wholesaler','Website','Won',175000,'Bulk order confirmed',1),
('Pooja Boutique','Pooja Boutique','9890012345','Jamnagar','Retailer','Instagram Ads','Lost',18000,'Price not suitable',2);

INSERT INTO follow_ups (lead_id,task,due_date,is_completed) VALUES
(1,'Share new saree catalog',DATE_ADD(NOW(), INTERVAL 1 DAY),0),
(2,'Call to discuss quotation',DATE_ADD(NOW(), INTERVAL 3 HOUR),0),
(3,'Qualify bulk quantity requirement',DATE_ADD(NOW(), INTERVAL 2 DAY),0),
(4,'Follow up for cotton fabric order',DATE_SUB(NOW(), INTERVAL 1 DAY),0);

INSERT INTO campaigns (campaign_name,platform,spend,leads_count,qualified_leads,conversions,revenue,start_date,end_date) VALUES
('Festive Saree Collection','Instagram',12000,84,32,8,185000,'2026-09-01','2026-09-30'),
('Wholesale Buyer Leads','Facebook',18000,110,41,11,265000,'2026-09-01','2026-09-30'),
('New Arrival WhatsApp Promo','WhatsApp',4500,48,24,6,98000,'2026-09-10','2026-09-30'),
('Cotton Fabric Campaign','Instagram',8000,62,28,7,124000,'2026-09-15','2026-09-30');

-- Demo password for both seeded users: password
-- If the seeded hash does not validate on your machine, use the backend dev seed endpoint
-- or create a fresh hash using bcryptjs in Node and update users.password_hash.
