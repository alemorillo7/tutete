import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id, message, file_url, type, is_internal } = body;

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
    let msgType = type || (file_url ? 'file' : 'text');
    if (is_internal) {
      msgType = 'internal_note';
    }

    // Clean potential bad characters from AI response
    let cleanMessage = message;
    if (typeof message === 'string') {
      cleanMessage = message.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, "");
    } else if (typeof message === 'object') {
      cleanMessage = JSON.stringify(message);
    }

    // Insert the agent message into Supabase
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        chat_id,
        sender: 'agent',
        type: msgType,
        message: cleanMessage,
        file_url: file_url || null
      })
      .select()
      .single();

    if (msgError) {
      console.error('Supabase Insert Error:', msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('CRITICAL BACKEND ERROR:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.toString()
    }, { status: 500 });
  }
}
