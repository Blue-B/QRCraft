import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domainUrl = searchParams.get('domain_url');
  
  if (!domainUrl) {
    return new NextResponse('domain_url is required', { status: 400 });
  }
  
  try {
    // 특정 도메인에 대한 고해상도 로고 처리
    let faviconUrls = [];
    
    if (domainUrl.includes('youtube.com') || domainUrl.includes('youtu.be')) {
      // 유튜브 고해상도 로고
      faviconUrls = [
        `https://www.google.com/s2/favicons?domain=youtube.com&sz=128`,
        `https://www.google.com/s2/favicons?domain=youtube.com&sz=64`,
        `https://youtube.com/favicon.ico`,
      ];
    } else if (domainUrl.includes('github.com')) {
      // GitHub 고해상도 로고
      faviconUrls = [
        `https://www.google.com/s2/favicons?domain=github.com&sz=128`,
        `https://github.com/favicon.ico`,
        `https://github.com/apple-touch-icon.png`,
      ];
    } else if (domainUrl.includes('google.com')) {
      // Google 고해상도 로고
      faviconUrls = [
        `https://www.google.com/s2/favicons?domain=google.com&sz=128`,
        `https://google.com/favicon.ico`,
      ];
    } else {
      // 일반 도메인
      faviconUrls = [
        `https://www.google.com/s2/favicons?domain=${domainUrl}&sz=128`,
        `https://www.google.com/s2/favicons?domain=${domainUrl}&sz=64`,
        `https://${domainUrl}/favicon.ico`,
        `https://${domainUrl}/favicon.png`,
        `https://${domainUrl}/apple-touch-icon.png`,
      ];
    }
    
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