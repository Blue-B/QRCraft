import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domainUrl = searchParams.get('domain_url');
  
  if (!domainUrl) {
    return new NextResponse('domain_url is required', { status: 400 });
  }
  
  try {
    // 도메인에서 favicon 가져오기 시도
    const faviconUrls = [
      `https://${domainUrl}/favicon.ico`,
      `https://${domainUrl}/favicon.png`,
      `https://${domainUrl}/apple-touch-icon.png`,
      `https://www.google.com/s2/favicons?domain=${domainUrl}&sz=64`,
    ];
    
    for (const faviconUrl of faviconUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(faviconUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/png';
          const arrayBuffer = await response.arrayBuffer();
          
          return new NextResponse(arrayBuffer, {
            headers: {
              'Content-Type': contentType,
              'x-logo-source': faviconUrl.includes('google.com') ? 'google-favicons' : 'site-favicon',
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      } catch (error) {
        console.log(`Failed to fetch from ${faviconUrl}:`, error);
        continue;
      }
    }
    
    // 모든 시도가 실패한 경우 기본 아이콘 반환
    return new NextResponse('Could not fetch favicon', { status: 404 });
    
  } catch (error) {
    console.error('Favicon fetch error:', error);
    return new NextResponse('Could not fetch favicon. Please check the URL.', { status: 500 });
  }
}