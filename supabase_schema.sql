-- SQL Schema definition for MailPilot Supabase database integration.
-- Run these statements in the SQL Editor of your Supabase project (txupfqcyrtjwjveqtfxp) to set up the database tables.

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  gender TEXT,
  college TEXT,
  course TEXT,
  year TEXT,
  bio TEXT,
  interests TEXT[],
  linkedin TEXT,
  github TEXT,
  instagram TEXT,
  portfolio TEXT,
  avatarUrl TEXT,
  photoURL TEXT,
  role TEXT DEFAULT 'user',
  "group" TEXT DEFAULT 'General',
  custom JSONB,
  points INTEGER DEFAULT 0,
  activityCount INTEGER DEFAULT 0,
  emailVerified BOOLEAN DEFAULT false,
  providerId TEXT,
  profileComplete BOOLEAN DEFAULT false,
  questionsAsked INTEGER DEFAULT 0,
  answersGiven INTEGER DEFAULT 0,
  bookmarks TEXT[],
  registeredEvents TEXT[],
  proposedEvents TEXT[],
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  lastLogin TIMESTAMP WITH TIME ZONE
);

-- Note: If you already have the users table and need to add group/custom columns, run:
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "group" TEXT DEFAULT 'General';
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom JSONB;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for client and service_role access
CREATE POLICY "Allow read access for authenticated users" ON public.users 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access for authenticated users" ON public.users 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users" ON public.users 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete access for authenticated users" ON public.users 
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow service_role full access users" ON public.users 
  TO service_role USING (true) WITH CHECK (true);

-- 2. Create auditLogs table
CREATE TABLE IF NOT EXISTS public.auditLogs (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  "userId" TEXT,
  "userName" TEXT,
  "userRole" TEXT,
  "actionType" TEXT,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) on auditLogs
ALTER TABLE public.auditLogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access auditLogs" ON public.auditLogs 
  TO service_role USING (true) WITH CHECK (true);

-- 3. Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Template Configuration
  subject TEXT,
  title TEXT,
  greeting TEXT,
  body TEXT,
  btn_text TEXT,
  btn_url TEXT,
  signature TEXT,
  footer TEXT,
  org_name TEXT,
  org_url TEXT,
  banner TEXT DEFAULT 'none',
  banner_url TEXT,
  show_event_details BOOLEAN DEFAULT false,
  event_date TEXT,
  event_time TEXT,
  event_location TEXT,
  event_agenda TEXT,
  btn_color TEXT,
  accent_color TEXT,
  bg_color TEXT,
  font_family TEXT,
  email_width INTEGER DEFAULT 600,
  custom_html TEXT,
  template TEXT DEFAULT 'event',
  code_edited BOOLEAN DEFAULT false,
  
  -- SMTP Settings
  smtp_host TEXT,
  smtp_port TEXT,
  smtp_secure TEXT,
  smtp_from_name TEXT,
  smtp_from_email TEXT,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_delay TEXT DEFAULT '300',
  smtp_batch_size TEXT DEFAULT '50',
  smtp_batch_pause TEXT DEFAULT '10',
  
  -- Audience Settings
  audience_filter TEXT DEFAULT 'all',
  audience_group TEXT,
  audience_selected_ids JSONB,
  
  -- Progress / Status
  status TEXT DEFAULT 'draft',
  progress_index INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) on campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for owner-only access (user_id matching auth.uid()::text)
CREATE POLICY "Allow read access for owners" ON public.campaigns 
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Allow insert access for owners" ON public.campaigns 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Allow update access for owners" ON public.campaigns 
  FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Allow delete access for owners" ON public.campaigns 
  FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Allow service_role full access campaigns" ON public.campaigns 
  TO service_role USING (true) WITH CHECK (true);
