import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chat_id = searchParams.get('chat_id');

    if (!chat_id) {
      return NextResponse.json({ error: 'Falta el parámetro chat_id' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('chats')
      .select('agent_active, tags')
      .eq('id', chat_id)
      .single();

    if (error) {
      if (error.code === '42703') {
        // Fallback: si tags no existe, pedimos solo agent_active
        const fallback = await supabaseAdmin
          .from('chats')
          .select('agent_active')
          .eq('id', chat_id)
          .single();
          
        if (fallback.error && fallback.error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Chat no encontrado' }, { status: 404 });
        } else if (fallback.error) {
          throw fallback.error;
        }

        return NextResponse.json({ 
          success: true, 
          agent_active: fallback.data.agent_active, 
          tags: [] 
        });
      }

      if (error.code === 'PGRST116') {
         return NextResponse.json({ error: 'Chat no encontrado' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      agent_active: data.agent_active, 
      tags: data.tags || [] 
    });
  } catch (error: any) {
    console.error('Error fetching agent status:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
