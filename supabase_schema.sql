-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Chats Table
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    user_name TEXT,
    agent_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender TEXT CHECK (sender IN ('user', 'agent')) NOT NULL,
    type TEXT CHECK (type IN ('text', 'file')) DEFAULT 'text' NOT NULL,
    message TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to messages (for widget polling)
CREATE POLICY "Allow public read on messages based on chat_id" ON public.messages
    FOR SELECT TO public
    USING (true);

-- Allow public read access to chats
CREATE POLICY "Allow public read on chats" ON public.chats
    FOR SELECT TO public
    USING (true);

-- Allow authenticated users (Admin Panel) to read and modify everything
CREATE POLICY "Allow authenticated full access on chats" ON public.chats
    FOR ALL TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated full access on messages" ON public.messages
    FOR ALL TO authenticated
    USING (true);

-- Turn on Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
