import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id, message, type, file_url } = body;

    if (!chat_id || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert the agent message into Supabase
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        chat_id,
        sender: 'agent',
        type: type || 'text',
        message,
        file_url: file_url || null
      })
      .select()
      .single();

    if (msgError) throw msgError;

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('Error sending agent message:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
