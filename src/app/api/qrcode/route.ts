import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  
  if (!text) {
    return new NextResponse('text is required', { status: 400 });
  }
  
  try {
    const qr = await QRCode.toDataURL(text);
    return NextResponse.json({ qr });
  } catch {
    return new NextResponse('QR 생성 실패', { status: 500 });
  }
} 