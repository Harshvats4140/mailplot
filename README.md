# ✈️ MailPilot Studio

MailPilot is a professional, high-performance, environment-agnostic SaaS email broadcast and member management platform. Featuring a visually stunning dark glassmorphism responsive user interface, interactive dashboards, dynamic tracking pixel injection, and secure multi-user role management integrated with Supabase, it is designed for modern corporate communication and administrative oversight.

---

## 🎨 Design System & Visual Excellence
MailPilot is built around a unified CSS design system designed to deliver a premium dashboard experience:
* **Glassmorphism Aesthetic**: Deep space dark backgrounds (`var(--bg)`) blended with semi-transparent frosted cards (`var(--bg2)`, `var(--bg3)`) and micro-borders (`var(--border)`).
* **Harmony-First Palette**: Strict control of visual focus using high-contrast accents (`var(--accent)` / `#4f8ef7`, `var(--teal)` / `#22d3ee`, `var(--green)` / `#22d3a3`, `var(--red)` / `#da3633`).
* **Responsive Layouts**: Fluid CSS Flexbox/Grid structures. The Member Directory and Composer tools stretch dynamically to utilize 100% of the screen width for seamless administrative reading and writing.
* **Micro-Animations**: Hover states, modal transition scaling, and alert animations are set to `transition: var(--transition)` (0.2s ease-in-out) for a premium tactile feel.

---

## 🚀 Key Modules & Architecture

MailPilot utilizes an iframe-based App Shell architecture, combining static frontends with an API gateway proxy backend.

```
                  ┌──────────────────────────────────────────┐
                  │                 App Shell                │
                  │              (app.html / JS)             │
                  └────┬────────────────────────────────┬────┘
                       │ (IFrame Routing & Theme Sync)  │
                       ▼                                ▼
          ┌─────────────────────────┐      ┌─────────────────────────┐
          │      Members Module     │      │       Admin Panel       │
          │    (members.html / JS)  │      │     (admin.html / JS)   │
          └────────────┬────────────┘      └────────────┬────────────┘
                       │                                │
                       ▼                                ▼
                  ┌──────────────────────────────────────────┐
                  │                common.js                 │
                  │   (Global State, Auth, API, Utilities)   │
                  └────────────────────┬─────────────────────┘
                                       │ (REST API / JWT)
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │             Node.js Backend              │
                  │               (server.js)              │
                  └────────────────────┬─────────────────────┘
                                       │ (Service Role / Anon)
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │             Supabase Database            │
                  │               (PostgreSQL)             │
                  └──────────────────────────────────────────┘
```

### 1. App Shell (`app.html`)
The main orchestrator. It manages the sidebar menus, logs session states, and uses responsive iframes to render sub-pages dynamically. It automatically forwards global auth headers to sub-pages.

### 2. Members Management (`members.html` / `members.js`)
* **Full-Width Workspace**: Restructured to give data rows the maximum horizontal viewport area, displaying email, college/org, group designations, and custom metadata cleanly.
* **Consolidated Modals**: Additions are handled via the unified **Add Member Choice Modal** (Individual Form vs. Bulk CSV upload), eliminating redundant, cluttering buttons.
* **Inline Actions**: Allows quick editing, deletion, or restoring of deleted members directly from the interface.

### 3. Composer & Broadcast Engine (`composer.html` & `broadcast.html`)
* **Interactive Design Compiler**: Select header images, custom button styling, banner background gradients, and font families to automatically generate compiled corporate HTML templates.
* **High-Throughput SMTP Relay**: Broadcasts custom emails with dynamic tag injection (e.g. `{{name}}`, `{{college}}`) to designated member segments, recording delivery statistics in real-time.

### 4. Admin Oversight (`admin.html`)
* **Role Dashboard**: Lists registered users and designations (Admins, Users, Members).
* **Multi-Tenant Auditing**: Administrators can view campaigns run by individual users, inspect user-added member directories, alter system configurations, and purge deleted accounts.

---

## 🔐 Credentials & Access Control

### System Administrators
Admins have access to the **Admin Panel** (`admin.html`) to manage other users, view cross-user campaigns, and access global audit files.
* **Primary Admin Account**: `ascentcircle.community@gmail.com`
* **Secure Authorization**: Managed through Supabase Auth using the admin email verification pipeline.
* **Database Role Gating**: Defined in `server.js` by checking matching admin domains or service role credentials.

---

## 🛠️ Database Schema (Supabase)

MailPilot runs on a Postgres database. Execute the following SQL queries inside your Supabase SQL Editor:

```sql
-- 1. USERS & MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  college TEXT,
  role TEXT DEFAULT 'user', -- 'user' or 'admin'
  "group" TEXT DEFAULT 'General',
  custom JSONB DEFAULT '{}'::jsonb, -- e.g. {"created_by": "user@email.com"}
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read/write access for owners" ON public.users 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  audience_filter TEXT DEFAULT 'all', -- 'all', 'group', 'selected'
  audience_group TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'sending', 'completed', 'paused'
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  progress_index INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for owners" ON public.campaigns 
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Allow write access for owners" ON public.campaigns 
  FOR ALL TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
```

---

## 💻 Getting Started & Running Locally

### 1. Prerequisites
* **Node.js** (v18 or higher)
* **npm**
* **Supabase Project API Keys**

### 2. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 3. Environment Variables Setup
Create a file named `.env` in the root directory:
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
TRACKING_BASE_URL=http://localhost:3000
```
> [!IMPORTANT]
> The `SUPABASE_SERVICE_ROLE_KEY` is highly sensitive and should never be exposed in client-side code. The backend uses it only for authorized admin-level queries.

### 4. Running the Local Server
```bash
npm start
```
The server will bind to `http://localhost:3000`. Access the app at `http://localhost:3000/login.html` and sign in.

---

## 📦 Deployment Workflows

### Option A: Hosting on Render (Unified Deployment)
Render will host both the backend Express API and the static UI assets served from the public routes.
1. Create a new **Web Service** on Render.
2. Link your GitHub repository.
3. Configure settings:
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
4. Add all environment variables from your local `.env` file (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TRACKING_BASE_URL`).
5. Render will deploy and provide a secure HTTPS endpoint.

### Option B: Decoupled Deploy (Vercel + Railway/Render)
1. **Frontend (Vercel)**: Import the repository to Vercel. Set the output directory to root so it serves the static `.html`, `.js`, and `.css` pages directly. Set `window.API_BASE_URL` in `common.js` to point to your backend url.
2. **Backend (Railway/Render)**: Deploy the Node server (`server.js`) to handle mail queues, JWT validation, and service-role DB interactions.

---

## 🛠️ Maintenance & Troubleshooting

### Port Conflicts (`EADDRINUSE`)
If port 3000 is occupied, you can kill the process manually:
* **Windows (PowerShell)**:
  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
  ```
* **Linux / macOS**:
  ```bash
  fuser -k 3000/tcp
  ```

### Administrative RLS Bypassing
By default, standard Supabase requests are protected by Row Level Security (RLS). The administrative endpoints (like `/api/campaigns?all=true` or user list updates) automatically toggle headers to use the server-side `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS safely inside our Node proxy environment. Ensure this key is correctly configured in your production variables.
