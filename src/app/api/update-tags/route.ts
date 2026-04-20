import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id, tags } = body;

    if (!chat_id || !Array.isArray(tags)) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('chats')
      .update({ tags })
      .eq('id', chat_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, chat: data });
  } catch (error: any) {
    console.error('Error updating tags:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
