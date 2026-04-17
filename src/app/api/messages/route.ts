import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chat_id = searchParams.get('chat_id');

  if (!chat_id) {
    return NextResponse.json({ error: 'Missing chat_id parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages: data });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
