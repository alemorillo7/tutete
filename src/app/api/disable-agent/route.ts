import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id } = body;

    if (!chat_id) {
      return NextResponse.json({ error: 'Falta el parámetro chat_id' }, { status: 400 });
    }

    let updatePayload: any = { agent_active: false };

    // Get current chat tags
    const { data: currentChat, error: fetchError } = await supabaseAdmin
      .from('chats')
      .select('tags')
      .eq('id', chat_id)
      .single();

    if (fetchError && fetchError.code === '42703') {
       // Columna tags no existe
       console.warn("Columna 'tags' no existe en Supabase. Actualizando solo agent_active.");
    } else if (fetchError) {
       throw fetchError;
    } else {
      let currentTags = currentChat.tags || [];
      // Remove bot status tags
      currentTags = currentTags.filter((t: string) => t !== 'agent-on' && t !== 'agent-off');
      // Add Bot Off tag
      currentTags.push('agent-off');
      updatePayload.tags = currentTags;
    }

    const { data, error } = await supabaseAdmin
      .from('chats')
      .update(updatePayload)
      .eq('id', chat_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, chat: data });
  } catch (error: any) {
    console.error('Error disabling agent:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
