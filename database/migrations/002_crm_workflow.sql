USE textileflow_crm;

ALTER TABLE users
  MODIFY role ENUM('admin','salesperson','support') NOT NULL DEFAULT 'salesperson';

CREATE TABLE IF NOT EXISTS deals (
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

CREATE TABLE IF NOT EXISTS support_tickets (
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
