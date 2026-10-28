# TextileFlow CRM
College project: CRM for Surat textile traders and wholesalers.

## Stack
- Frontend: React + Vite + Bootstrap 5 + React Router + Axios + Recharts
- Backend: Node.js + Express + mysql2
- Database: MySQL
- Integrations: simulated Meta campaign analytics, WhatsApp click-to-chat demo

## Requirements
- Node.js LTS and npm
- MySQL Server / MySQL Workbench
- VS Code (recommended)

## 1. Create database
For a fresh installation, open MySQL Workbench and run `database/schema.sql`. It creates the database, tables, and sample data.

If you already have a TextileFlow database, **do not rerun `schema.sql`** because it recreates the tables. Run `database/migrations/002_crm_workflow.sql` instead to add the deal and support-ticket workflows.

## 2. Configure backend
Open a terminal in `backend`:

```powershell
Copy-Item .env.example .env
npm install
```

Edit `backend/.env` and set your MySQL username/password.

## 3. Start backend
In `backend`:

```powershell
npm run dev
```

API: http://localhost:5000
Health check: http://localhost:5000/api/health

Demo login:
- Email: admin@textileflow.local
- Password: password

The seed SQL includes a sample bcrypt hash for the demo password `password`.
If the demo login does not work, generate a bcrypt hash with `bcryptjs` and update `users.password_hash`.

## 4. Start frontend
Open a second terminal in `frontend`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL shown in terminal (usually http://localhost:5173).

## Deploy free with Render

This repository includes a Render Blueprint in `render.yaml`. It deploys the React app as a static site and the Express API as a free web service. The database remains separate: this app uses MySQL, so use a MySQL-compatible hosted database such as TiDB Cloud Starter. Render's free Postgres expires after 30 days.

1. Push this project to a GitHub repository. Keep `.env` files out of Git; `.gitignore` already excludes them.
2. In TiDB Cloud, create a **Starter / MySQL-compatible** instance. Keep its spending limit at zero to stay within the free quota. Copy its public host, port, username, and password from **Connect**.
3. Import `database/schema.sql` into that instance. The MySQL CLI can run the file from the project root:

   ```cmd
   mysql --ssl-mode=VERIFY_IDENTITY -h YOUR_TIDB_HOST -P 4000 -u YOUR_TIDB_USER -p < database/schema.sql
   ```

4. In Render, choose **New → Blueprint**, connect the GitHub repository, and let Render read `render.yaml`.
5. When Render asks for values, enter the TiDB connection values, `DB_NAME=textileflow_crm`, the API's public origin for `CLIENT_ORIGIN` (for example `https://textileflow-crm-api.onrender.com`), and the API URL for `VITE_API_URL` (for example `https://textileflow-crm-api.onrender.com/api`). Use the actual URLs Render assigns if they differ. Render generates `JWT_SECRET` automatically.
6. After both services deploy, open `https://YOUR_API_HOST/api/health`; it should return `ok: true`. Then open the static-site URL and sign in.

Render's free web service sleeps after 15 minutes without incoming traffic and may restart at any time. To monitor it and reduce idle sleep, create a free HTTP monitor at [UptimeRobot](https://uptimerobot.com/) for `https://YOUR_API_HOST/api/health`. Its free plan checks every 5 minutes. This can keep the API receiving traffic, but it is not an uptime guarantee; Render's free hours are shared across the workspace. TiDB's free quota also has storage and request limits, and connections stop if those limits are exceeded.

## Main features
- Login and salesperson registration with JWT
- Dashboard metrics and charts
- Lead CRUD, filtering, employee assignment, status changes, and conversion to customer
- Customer CRUD and customer details
- Sales deal pipeline with prospect, negotiation, won, and lost outcomes
- Support ticket intake, assignment, priority, and resolution tracking
- Reminders inbox for upcoming follow-ups and active support tickets
- Customer, sales, lead conversion, support, and inventory reports with CSV export and print-to-PDF
- Textile product CRUD
- Follow-up task management
- Quotation creation and line items
- Campaign analytics (seed/demo data, not live Meta API)
- WhatsApp demo inbox with click-to-chat
- Rule-based lead scoring
- API health and database checks

Public registration creates a salesperson account. Assignable team members are managed in the `users` table; use the `support` role for support staff.

## Notes
- WhatsApp is a demo inbox plus `wa.me` link. It does not send messages from the application.
- Marketing analytics are sample data and are not connected to Meta.
- This is a college-project starter, not a production-hardened multi-tenant SaaS.
- Never commit `.env` or real credentials.
