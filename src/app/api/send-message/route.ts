import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id, message, file_url } = body;

    if (!chat_id || (!message && !file_url)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure the chat exists (Auto-create if n8n or agent responds to a new ID)
    const { data: chat } = await supabaseAdmin
      .from('chats')
      .select('id')
      .eq('id', chat_id)
      .single();

    if (!chat) {
      await supabaseAdmin.from('chats').insert({
        id: chat_id,
        client_id: 'auto_generated',
        user_name: 'Cliente Nuevo',
        agent_active: false // If we respond manually, we assume the bot is off
      });
    }

    // Determine type automatically
    const msgType = file_url ? 'file' : 'text';

    // Insert the agent message into Supabase
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        chat_id,
        sender: 'agent',
        type: msgType,
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
