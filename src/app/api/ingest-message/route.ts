import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id, message_id, type, user_name, message, file_url, timestamp, client_id } = body;

    if (!chat_id || (!message && !file_url) || !client_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check if chat exists, or create it
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('id, agent_active')
      .eq('id', chat_id)
      .single();

    let agentIsActive = true;

    if (!chat) {
      // Create new chat
      const { data: newChat, error: insertChatError } = await supabaseAdmin
        .from('chats')
        .insert({
          id: chat_id,
          client_id,
          user_name: user_name || 'Anonymous',
          agent_active: true
        })
        .select()
        .single();

      if (insertChatError) throw insertChatError;
      agentIsActive = newChat.agent_active;
    } else {
      agentIsActive = chat.agent_active;
    }

    // 2. Insert the message into Supabase
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        id: message_id, // If widget generates uuid, we use it. Otherwise Supabase default gen_random_uuid
        chat_id,
        sender: 'user',
        type: type || 'text',
        message,
        file_url: file_url || null,
        created_at: timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // 3. Send to n8n ONLY if agent is active and URL is configured
    if (agentIsActive && N8N_WEBHOOK_URL) {
      fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          agent_active: agentIsActive 
        })
      }).catch(err => console.error("Error sending to n8n webhook", err));
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('Error ingesting message:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
