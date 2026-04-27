import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ProductRecommendation = {
  name?: string;
  image_url?: string;
  image_base64?: string;
  image_mime_type?: string;
  image_filename?: string;
};

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

function sanitizeBase64(input: string) {
  if (!input) return '';
  const trimmed = input.trim();
  const commaIndex = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && commaIndex !== -1) {
    return trimmed.slice(commaIndex + 1);
  }
  return trimmed;
}

function inferExtensionFromMime(mimeType: string) {
  const lower = String(mimeType || '').toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('png')) return 'png';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('gif')) return 'gif';
  return 'jpg';
}

async function uploadBase64Image({
  chatId,
  base64,
  mimeType,
  fileName
}: {
  chatId: string;
  base64: string;
  mimeType?: string;
  fileName?: string;
}) {
  const cleanBase64 = sanitizeBase64(base64);
  if (!cleanBase64) return null;

  const contentType = String(mimeType || 'image/jpeg').toLowerCase();
  if (!ALLOWED_IMAGE_MIME.includes(contentType)) {
    throw new Error(`Unsupported image mime type: ${contentType}`);
  }

  const extension = inferExtensionFromMime(contentType);
  const safeName = (fileName || `product.${extension}`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `chat-files/${chatId}/product_${crypto.randomUUID()}_${safeName}`;
  const imageBuffer = Buffer.from(cleanBase64, 'base64');

  const { error: uploadError } = await supabaseAdmin.storage
    .from('chat-files')
    .upload(filePath, imageBuffer, {
      contentType,
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = supabaseAdmin.storage.from('chat-files').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id, products, intro_message, name, image_url, image_base64, image_mime_type, image_filename } = body;

    const hasSingleProduct = Boolean(name && (image_url || image_base64));
    const hasProductsArray = Array.isArray(products) && products.length > 0;

    if (!chat_id || (!hasSingleProduct && !hasProductsArray)) {
      return NextResponse.json(
        { error: 'Missing required fields: chat_id and (products[] or name + image_url/image_base64)' },
        { status: 400 }
      );
    }

    // Ensure chat exists (same behavior as other admin endpoints)
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
        agent_active: false
      });
    }

    const candidates: ProductRecommendation[] = hasProductsArray
      ? (products as ProductRecommendation[])
      : [{ name, image_url, image_base64, image_mime_type, image_filename }];
    const normalizedProducts = [];

    for (const product of candidates) {
      if (!product?.name) continue;

      let imageUrl: string | null = product.image_url ?? null;
      if (!imageUrl && typeof product.image_base64 === 'string' && product.image_base64.trim()) {
        const uploadedImageUrl = await uploadBase64Image({
          chatId: chat_id,
          base64: product.image_base64,
          mimeType: product.image_mime_type,
          fileName: product.image_filename
        });
        imageUrl = uploadedImageUrl ?? null;
      }

      if (!imageUrl) continue;

      const title = product.name?.trim() || '';
      normalizedProducts.push({
        chat_id,
        sender: 'agent',
        type: 'file',
        message: title,
        file_url: imageUrl
      });
    }

    if (normalizedProducts.length === 0) {
      return NextResponse.json(
        { error: 'Each product must include name and image_url or image_base64' },
        { status: 400 }
      );
    }

    const messagesToInsert = [];
    if (intro_message && String(intro_message).trim()) {
      messagesToInsert.push({
        chat_id,
        sender: 'agent',
        type: 'text',
        message: String(intro_message).trim(),
        file_url: null
      });
    }
    messagesToInsert.push(...normalizedProducts);

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert(messagesToInsert)
      .select('*');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      sent_count: normalizedProducts.length,
      messages: data
    });
  } catch (error: any) {
    console.error('Error sending product recommendations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
