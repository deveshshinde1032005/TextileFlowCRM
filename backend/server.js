require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "textileflow_crm",
  ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2" } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in first." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "dev_only_change_me");
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
}
const statuses = ["New","Contacted","Qualified","Quotation","Won","Lost"];

app.get("/api/health", asyncHandler(async (req, res) => {
  const [rows] = await db.query("SELECT DATABASE() AS database_name");
  res.json({ ok: true, service: "TextileFlow CRM API", database: rows[0].database_name });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  const [rows] = await db.execute("SELECT id,name,email,password_hash,role FROM users WHERE email = ?", [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET || "dev_only_change_me", { expiresIn: "8h" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.post("/api/auth/register", asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res.status(400).json({ error: "Enter your name, a valid email and a password with at least 8 characters." });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await db.execute(
    "INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'salesperson')",
    [name, email, passwordHash]
  );
  const user = { id: result.insertId, name, email, role: "salesperson" };
  const token = jwt.sign(user, process.env.JWT_SECRET || "dev_only_change_me", { expiresIn: "8h" });
  res.status(201).json({ token, user });
}));

app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));
app.get("/api/users", auth, asyncHandler(async (req, res) => {
  const [rows] = await db.query("SELECT id,name,email,role FROM users ORDER BY name");
  res.json(rows);
}));

app.get("/api/dashboard", auth, asyncHandler(async (req, res) => {
  const [[leadStats]] = await db.query(`SELECT COUNT(*) totalLeads,
    SUM(status NOT IN ('Won','Lost')) openLeads,
    SUM(status='Won') wonLeads,
    SUM(status='Lost') lostLeads,
    COALESCE(SUM(CASE WHEN status NOT IN ('Won','Lost') THEN estimated_value ELSE 0 END),0) pipelineValue,
    COALESCE(SUM(CASE WHEN status='Won' THEN estimated_value ELSE 0 END),0) wonValue
    FROM leads`);
  const [[customerStats]] = await db.query("SELECT COUNT(*) totalCustomers FROM customers");
  const [[dealStats]] = await db.query(`SELECT COUNT(*) totalDeals,
    COALESCE(SUM(outcome='Open'),0) openDeals,
    COALESCE(SUM(CASE WHEN outcome='Open' THEN deal_value ELSE 0 END),0) pipelineValue,
    COALESCE(SUM(CASE WHEN outcome='Won' THEN deal_value ELSE 0 END),0) wonValue,
    COALESCE(SUM(outcome='Won'),0) wonDeals FROM deals`);
  const [[productStats]] = await db.query("SELECT COUNT(*) totalProducts, COALESCE(SUM(stock_quantity),0) stockUnits FROM products");
  const [[followStats]] = await db.query("SELECT SUM(is_completed=0 AND due_date < NOW()) overdueFollowups, SUM(is_completed=0) pendingFollowups FROM follow_ups");
  const [byStatus] = await db.query("SELECT status, COUNT(*) value FROM leads GROUP BY status");
  const [bySource] = await db.query("SELECT source, COUNT(*) value FROM leads GROUP BY source");
  const [recentLeads] = await db.query("SELECT id,name,business_name,city,source,status,estimated_value,created_at FROM leads ORDER BY created_at DESC LIMIT 6");
  const [followUps] = await db.query(`SELECT f.id,f.task,f.due_date,f.is_completed,l.name lead_name
    FROM follow_ups f JOIN leads l ON l.id=f.lead_id ORDER BY f.is_completed ASC, f.due_date ASC LIMIT 6`);
  res.json({ leads: leadStats, deals: dealStats, customers: customerStats.totalCustomers, products: productStats, followUps: followStats, byStatus, bySource, recentLeads, followUpsList: followUps });
}));

// Leads
app.get("/api/leads", auth, asyncHandler(async (req, res) => {
  const { search = "", status = "", source = "" } = req.query;
  let sql = "SELECT l.*, u.name assigned_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_to WHERE 1=1";
  const params = [];
  if (search) { sql += " AND (l.name LIKE ? OR l.business_name LIKE ? OR l.phone LIKE ? OR l.city LIKE ?)"; const q = `%${search}%`; params.push(q,q,q,q); }
  if (status) { sql += " AND l.status=?"; params.push(status); }
  if (source) { sql += " AND l.source=?"; params.push(source); }
  sql += " ORDER BY l.created_at DESC";
  const [rows] = await db.execute(sql, params);
  res.json(rows);
}));
app.post("/api/leads", auth, asyncHandler(async (req, res) => {
  const { name, business_name, phone, city, buyer_type, source, status, estimated_value, notes, assigned_to } = req.body || {};
  if (!String(name || "").trim() || !String(phone || "").trim()) return res.status(400).json({ error: "Lead name and phone are required." });
  if (status && !statuses.includes(status)) return res.status(400).json({ error: "Invalid lead status." });
  const [r] = await db.execute(`INSERT INTO leads (name,business_name,phone,city,buyer_type,source,status,estimated_value,notes,assigned_to)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [name.trim(),business_name||null,phone.trim(),city||null,buyer_type||"Retailer",source||"Manual",status||"New",Number(estimated_value)||0,notes||null,assigned_to||req.user.id]);
  const [rows] = await db.execute("SELECT * FROM leads WHERE id=?", [r.insertId]);
  res.status(201).json(rows[0]);
}));
app.put("/api/leads/:id", auth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, business_name, phone, city, buyer_type, source, status, estimated_value, notes, assigned_to } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: "Lead name and phone are required." });
  if (!statuses.includes(status)) return res.status(400).json({ error: "Invalid lead status." });
  const [r] = await db.execute(`UPDATE leads SET name=?,business_name=?,phone=?,city=?,buyer_type=?,source=?,status=?,estimated_value=?,notes=?,assigned_to=? WHERE id=?`,
    [name,business_name||null,phone,city||null,buyer_type||"Retailer",source||"Manual",status,Number(estimated_value)||0,notes||null,assigned_to||null,id]);
  if (!r.affectedRows) return res.status(404).json({ error: "Lead not found." });
  const [rows] = await db.execute("SELECT * FROM leads WHERE id=?", [id]);
  res.json(rows[0]);
}));
app.delete("/api/leads/:id", auth, asyncHandler(async (req, res) => {
  const [r] = await db.execute("DELETE FROM leads WHERE id=?", [Number(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ error: "Lead not found." });
  res.json({ message: "Lead deleted." });
}));
app.post("/api/leads/:id/convert", auth, asyncHandler(async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [leads] = await conn.execute("SELECT * FROM leads WHERE id=? FOR UPDATE", [Number(req.params.id)]);
    const lead = leads[0];
    if (!lead) { await conn.rollback(); return res.status(404).json({ error: "Lead not found." }); }
    if (lead.customer_id) {
      const [customers] = await conn.execute("SELECT * FROM customers WHERE id=?", [lead.customer_id]);
      await conn.commit();
      return res.json({ customer: customers[0], alreadyConverted: true });
    }
    const [result] = await conn.execute(
      `INSERT INTO customers (business_name,contact_person,phone,city,state,buyer_type,notes)
       VALUES (?,?,?,?,?,?,?)`,
      [lead.business_name || lead.name, lead.name, lead.phone, lead.city, "Gujarat", lead.buyer_type || "Retailer", lead.notes]
    );
    await conn.execute("UPDATE leads SET customer_id=?,status='Won' WHERE id=?", [result.insertId, lead.id]);
    const [customers] = await conn.execute("SELECT * FROM customers WHERE id=?", [result.insertId]);
    await conn.commit();
    res.status(201).json({ customer: customers[0], alreadyConverted: false });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}));

// Customers
app.get("/api/customers", auth, asyncHandler(async (req, res) => {
  const { search = "" } = req.query;
  const q = `%${search}%`;
  const [rows] = await db.execute(`SELECT * FROM customers WHERE business_name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR city LIKE ? ORDER BY created_at DESC`, [q,q,q,q]);
  res.json(rows);
}));
app.post("/api/customers", auth, asyncHandler(async (req, res) => {
  const { business_name,contact_person,phone,email,city,state,buyer_type,gstin,notes } = req.body || {};
  if (!String(business_name||"").trim() || !String(phone||"").trim()) return res.status(400).json({ error: "Business name and phone are required." });
  const [r] = await db.execute(`INSERT INTO customers (business_name,contact_person,phone,email,city,state,buyer_type,gstin,notes) VALUES (?,?,?,?,?,?,?,?,?)`,
    [business_name.trim(),contact_person||null,phone.trim(),email||null,city||null,state||"Gujarat",buyer_type||"Retailer",gstin||null,notes||null]);
  const [rows] = await db.execute("SELECT * FROM customers WHERE id=?", [r.insertId]);
  res.status(201).json(rows[0]);
}));
app.put("/api/customers/:id", auth, asyncHandler(async (req, res) => {
  const { business_name,contact_person,phone,email,city,state,buyer_type,gstin,notes } = req.body || {};
  if (!business_name || !phone) return res.status(400).json({ error: "Business name and phone are required." });
  const [r] = await db.execute(`UPDATE customers SET business_name=?,contact_person=?,phone=?,email=?,city=?,state=?,buyer_type=?,gstin=?,notes=? WHERE id=?`,
    [business_name,contact_person||null,phone,email||null,city||null,state||"Gujarat",buyer_type||"Retailer",gstin||null,notes||null,Number(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ error: "Customer not found." });
  const [rows] = await db.execute("SELECT * FROM customers WHERE id=?", [Number(req.params.id)]);
  res.json(rows[0]);
}));
app.delete("/api/customers/:id", auth, asyncHandler(async (req, res) => {
  const [r] = await db.execute("DELETE FROM customers WHERE id=?", [Number(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ error: "Customer not found." });
  res.json({ message: "Customer deleted." });
}));

// Products
app.get("/api/products", auth, asyncHandler(async (req, res) => {
  const { search = "" } = req.query; const q = `%${search}%`;
  const [rows] = await db.execute("SELECT * FROM products WHERE product_name LIKE ? OR design_code LIKE ? OR fabric_type LIKE ? ORDER BY created_at DESC", [q,q,q]);
  res.json(rows);
}));
app.post("/api/products", auth, asyncHandler(async (req, res) => {
  const { design_code,product_name,fabric_type,category,price,moq,stock_quantity,image_url } = req.body || {};
  if (!design_code || !product_name || !fabric_type) return res.status(400).json({ error: "Design code, product name and fabric type are required." });
  const [r] = await db.execute("INSERT INTO products (design_code,product_name,fabric_type,category,price,moq,stock_quantity,image_url) VALUES (?,?,?,?,?,?,?,?)",
    [design_code,product_name,fabric_type,category||"Saree",Number(price)||0,Math.max(1,Number(moq)||1),Math.max(0,Number(stock_quantity)||0),image_url||null]);
  const [rows] = await db.execute("SELECT * FROM products WHERE id=?", [r.insertId]); res.status(201).json(rows[0]);
}));
app.put("/api/products/:id", auth, asyncHandler(async (req, res) => {
  const { design_code,product_name,fabric_type,category,price,moq,stock_quantity,image_url } = req.body || {};
  const [r] = await db.execute("UPDATE products SET design_code=?,product_name=?,fabric_type=?,category=?,price=?,moq=?,stock_quantity=?,image_url=? WHERE id=?",
    [design_code,product_name,fabric_type,category||"Saree",Number(price)||0,Math.max(1,Number(moq)||1),Math.max(0,Number(stock_quantity)||0),image_url||null,Number(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ error: "Product not found." });
  const [rows] = await db.execute("SELECT * FROM products WHERE id=?", [Number(req.params.id)]); res.json(rows[0]);
}));
app.delete("/api/products/:id", auth, asyncHandler(async (req, res) => {
  const [r] = await db.execute("DELETE FROM products WHERE id=?", [Number(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ error: "Product not found." });
  res.json({ message: "Product deleted." });
}));

// Follow-ups
app.get("/api/follow-ups", auth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(`SELECT f.*,l.name lead_name,l.phone lead_phone FROM follow_ups f JOIN leads l ON l.id=f.lead_id ORDER BY f.is_completed ASC,f.due_date ASC`);
  res.json(rows);
}));
app.post("/api/follow-ups", auth, asyncHandler(async (req, res) => {
  const { lead_id,task,due_date } = req.body || {};
  if (!lead_id || !task || !due_date) return res.status(400).json({ error: "Lead, task and due date are required." });
  const [r] = await db.execute("INSERT INTO follow_ups (lead_id,task,due_date) VALUES (?,?,?)", [Number(lead_id),task,due_date]);
  const [rows] = await db.execute("SELECT * FROM follow_ups WHERE id=?", [r.insertId]); res.status(201).json(rows[0]);
}));
app.patch("/api/follow-ups/:id", auth, asyncHandler(async (req, res) => {
  const [r] = await db.execute("UPDATE follow_ups SET is_completed=? WHERE id=?", [Boolean(req.body.is_completed),Number(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ error: "Follow-up not found." });
  res.json({ message: "Follow-up updated." });
}));
app.delete("/api/follow-ups/:id", auth, asyncHandler(async (req, res) => {
  const [r] = await db.execute("DELETE FROM follow_ups WHERE id=?", [Number(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ error: "Follow-up not found." });
  res.json({ message: "Follow-up deleted." });
}));

// Sales pipeline
const dealStages = ["Prospect", "Negotiation", "Closed"];
const dealOutcomes = ["Open", "Won", "Lost"];
app.get("/api/deals", auth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(`SELECT d.*, c.business_name customer_name, l.name lead_name, u.name assigned_name
    FROM deals d LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN leads l ON l.id=d.lead_id
    LEFT JOIN users u ON u.id=d.assigned_to ORDER BY d.updated_at DESC, d.id DESC`);
  res.json(rows);
}));
app.post("/api/deals", auth, asyncHandler(async (req, res) => {
  const { title, customer_id, lead_id, assigned_to, deal_value, stage = "Prospect", outcome = "Open", expected_close_date, notes } = req.body || {};
  if (!String(title || "").trim()) return res.status(400).json({ error: "Deal name is required." });
  if (!dealStages.includes(stage) || !dealOutcomes.includes(outcome)) return res.status(400).json({ error: "Choose a valid deal stage and outcome." });
  const [result] = await db.execute(`INSERT INTO deals (title,customer_id,lead_id,assigned_to,deal_value,stage,outcome,expected_close_date,notes)
    VALUES (?,?,?,?,?,?,?,?,?)`, [title.trim(),customer_id||null,lead_id||null,assigned_to||req.user.id,Math.max(0,Number(deal_value)||0),stage,outcome,expected_close_date||null,notes||null]);
  const [rows] = await db.execute("SELECT * FROM deals WHERE id=?", [result.insertId]);
  res.status(201).json(rows[0]);
}));
app.patch("/api/deals/:id", auth, asyncHandler(async (req, res) => {
  const { stage, outcome, assigned_to } = req.body || {};
  if (stage && !dealStages.includes(stage)) return res.status(400).json({ error: "Choose a valid deal stage." });
  if (outcome && !dealOutcomes.includes(outcome)) return res.status(400).json({ error: "Choose a valid deal outcome." });
  const hasAssignment = Object.prototype.hasOwnProperty.call(req.body || {}, "assigned_to");
  const [result] = await db.execute("UPDATE deals SET stage=COALESCE(?,stage),outcome=COALESCE(?,outcome),assigned_to=IF(?,?,assigned_to) WHERE id=?",
    [stage||null,outcome||null,hasAssignment?1:0,assigned_to||null,Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ error: "Deal not found." });
  res.json({ message: "Deal updated." });
}));
app.delete("/api/deals/:id", auth, asyncHandler(async (req, res) => {
  const [result] = await db.execute("DELETE FROM deals WHERE id=?", [Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ error: "Deal not found." });
  res.json({ message: "Deal deleted." });
}));

// Customer support tickets
const ticketStatuses = ["Open", "In Progress", "Resolved", "Closed"];
const ticketPriorities = ["Low", "Medium", "High", "Urgent"];
app.get("/api/tickets", auth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(`SELECT t.*,c.business_name customer_name,l.name lead_name,a.name assigned_name,creator.name created_by_name
    FROM support_tickets t LEFT JOIN customers c ON c.id=t.customer_id LEFT JOIN leads l ON l.id=t.lead_id
    LEFT JOIN users a ON a.id=t.assigned_to LEFT JOIN users creator ON creator.id=t.created_by
    ORDER BY FIELD(t.status,'Open','In Progress','Resolved','Closed'), FIELD(t.priority,'Urgent','High','Medium','Low'), t.updated_at DESC`);
  res.json(rows);
}));
app.post("/api/tickets", auth, asyncHandler(async (req, res) => {
  const { customer_id, lead_id, subject, description, priority = "Medium", assigned_to } = req.body || {};
  if (!String(subject || "").trim()) return res.status(400).json({ error: "Ticket subject is required." });
  if (!customer_id && !lead_id) return res.status(400).json({ error: "Link this ticket to a customer or lead." });
  if (!ticketPriorities.includes(priority)) return res.status(400).json({ error: "Choose a valid priority." });
  const [result] = await db.execute(`INSERT INTO support_tickets (customer_id,lead_id,subject,description,priority,assigned_to,created_by)
    VALUES (?,?,?,?,?,?,?)`, [customer_id||null,lead_id||null,subject.trim(),description||null,priority,assigned_to||req.user.id,req.user.id]);
  res.status(201).json({ id: result.insertId, subject: subject.trim(), status: "Open" });
}));
app.patch("/api/tickets/:id", auth, asyncHandler(async (req, res) => {
  const { status, priority, assigned_to } = req.body || {};
  if (status && !ticketStatuses.includes(status)) return res.status(400).json({ error: "Choose a valid ticket status." });
  if (priority && !ticketPriorities.includes(priority)) return res.status(400).json({ error: "Choose a valid priority." });
  const hasAssignment = Object.prototype.hasOwnProperty.call(req.body || {}, "assigned_to");
  const [result] = await db.execute(`UPDATE support_tickets SET status=COALESCE(?,status),priority=COALESCE(?,priority),assigned_to=IF(?,?,assigned_to) WHERE id=?`,
    [status||null,priority||null,hasAssignment?1:0,assigned_to||null,Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ error: "Ticket not found." });
  res.json({ message: "Ticket updated." });
}));

// Upcoming reminders for the dashboard and notification inbox.
app.get("/api/notifications", auth, asyncHandler(async (req, res) => {
  const [followUps] = await db.execute(`SELECT f.id,f.task,f.due_date,l.name contact_name,l.assigned_to
    FROM follow_ups f JOIN leads l ON l.id=f.lead_id
    WHERE f.is_completed=0 AND f.due_date<=DATE_ADD(NOW(),INTERVAL 7 DAY)
      AND (l.assigned_to IS NULL OR l.assigned_to=? OR ?='admin') ORDER BY f.due_date LIMIT 30`, [req.user.id,req.user.role]);
  const [tickets] = await db.execute(`SELECT id,subject,status,priority,updated_at,assigned_to
    FROM support_tickets WHERE status IN ('Open','In Progress')
      AND (assigned_to IS NULL OR assigned_to=? OR ?='admin') ORDER BY FIELD(priority,'Urgent','High','Medium','Low'),updated_at DESC LIMIT 30`, [req.user.id,req.user.role]);
  const items = [
    ...followUps.map((item) => ({ id: `followup-${item.id}`, kind: "Follow-up", title: item.task, detail: item.contact_name, date: item.due_date, href: "/follow-ups" })),
    ...tickets.map((item) => ({ id: `ticket-${item.id}`, kind: "Support ticket", title: item.subject, detail: `${item.status} · ${item.priority} priority`, date: item.updated_at, href: "/support" })),
  ].sort((a,b) => new Date(a.date)-new Date(b.date));
  res.json(items);
}));

// Campaign analytics: demo records are seeded in SQL; no live Meta connection.
app.get("/api/campaigns", auth, asyncHandler(async (req, res) => {
  const [rows] = await db.query("SELECT * FROM campaigns ORDER BY start_date DESC, id DESC"); res.json(rows);
}));
app.get("/api/reports", auth, asyncHandler(async (req, res) => {
  const [sources] = await db.query("SELECT source,COUNT(*) leads_count,SUM(status='Won') conversions,COALESCE(SUM(estimated_value),0) pipeline_value FROM leads GROUP BY source ORDER BY leads_count DESC");
  const [statuses] = await db.query("SELECT status,COUNT(*) count FROM leads GROUP BY status");
  const [products] = await db.query("SELECT category,COUNT(*) products_count,COALESCE(SUM(stock_quantity),0) stock_units FROM products GROUP BY category");
  const [customers] = await db.query("SELECT COALESCE(city,'Not specified') city,COUNT(*) customers_count FROM customers GROUP BY city ORDER BY customers_count DESC");
  const [sales] = await db.query(`SELECT COALESCE(u.name,'Unassigned') salesperson,COUNT(d.id) deals_count,
    COALESCE(SUM(CASE WHEN d.outcome='Won' THEN d.deal_value ELSE 0 END),0) won_value,
    COALESCE(SUM(d.outcome='Won'),0) won_deals FROM deals d LEFT JOIN users u ON u.id=d.assigned_to GROUP BY u.id,u.name ORDER BY won_value DESC`);
  const [support] = await db.query("SELECT status,COUNT(*) tickets_count FROM support_tickets GROUP BY status");
  res.json({ sources, statuses, products, customers, sales, support });
}));

// Quotations
app.get("/api/quotations", auth, asyncHandler(async (req, res) => {
  const [rows] = await db.query(`SELECT q.*,c.business_name FROM quotations q LEFT JOIN customers c ON c.id=q.customer_id ORDER BY q.created_at DESC`);
  res.json(rows);
}));
app.post("/api/quotations", auth, asyncHandler(async (req, res) => {
  const { customer_id, lead_id, discount = 0, valid_until, notes, items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Add at least one product." });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let subtotal = 0;
    const resolved = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!item.product_id || !Number.isInteger(qty) || qty < 1) throw new Error("Each item needs a product and positive whole-number quantity.");
      const [pRows] = await conn.execute("SELECT * FROM products WHERE id=? FOR UPDATE", [Number(item.product_id)]);
      const p = pRows[0];
      if (!p) throw new Error("A selected product was not found.");
      if (qty < p.moq) throw new Error(`${p.design_code}: minimum order quantity is ${p.moq}.`);
      if (qty > p.stock_quantity) throw new Error(`${p.design_code}: only ${p.stock_quantity} units currently available.`);
      const unit = Number(item.unit_price ?? p.price);
      const line = qty * unit; subtotal += line;
      resolved.push({ p, qty, unit, line });
    }
    const discountAmount = Math.min(Math.max(0, Number(discount)||0), subtotal);
    const quotationNumber = `TFQ-${Date.now().toString().slice(-9)}`;
    const [qr] = await conn.execute(`INSERT INTO quotations (quotation_number,customer_id,lead_id,status,subtotal,discount,total,valid_until,notes)
      VALUES (?,?,?,'Draft',?,?,?,?,?)`, [quotationNumber,customer_id||null,lead_id||null,subtotal,discountAmount,subtotal-discountAmount,valid_until||null,notes||null]);
    for (const item of resolved) {
      await conn.execute(`INSERT INTO quotation_items (quotation_id,product_id,product_name,design_code,quantity,unit_price,line_total)
        VALUES (?,?,?,?,?,?,?)`, [qr.insertId,item.p.id,item.p.product_name,item.p.design_code,item.qty,item.unit,item.line]);
    }
    await conn.commit();
    res.status(201).json({ id: qr.insertId, quotation_number: quotationNumber, subtotal, discount: discountAmount, total: subtotal-discountAmount });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message || "Could not create quotation." });
  } finally { conn.release(); }
}));
app.patch("/api/quotations/:id/status", auth, asyncHandler(async (req, res) => {
  const allowed = ["Draft","Sent","Accepted","Rejected","Expired"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid quotation status." });
  const [r] = await db.execute("UPDATE quotations SET status=? WHERE id=?", [req.body.status,Number(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ error: "Quotation not found." });
  res.json({ message: "Quotation status updated." });
}));

app.use((err, req, res, next) => {
  console.error(err.code || "SERVER_ERROR", err.message);
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "This record already exists." });
  if (err.code === "ER_ACCESS_DENIED_ERROR") {
    return res.status(500).json({ error: "MySQL rejected the configured credentials. Check DB_USER and DB_PASSWORD in backend/.env, then restart the backend." });
  }
  if (err.code === "ER_BAD_DB_ERROR") {
    return res.status(500).json({ error: "The configured MySQL database does not exist. Run database/schema.sql, then restart the backend." });
  }
  if (err.code === "ECONNREFUSED") {
    return res.status(500).json({ error: "Cannot connect to MySQL. Start the MySQL service and check DB_HOST in backend/.env." });
  }
  res.status(500).json({ error: "Unexpected server error. Check backend terminal." });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`TextileFlow API running at http://localhost:${port}`));
