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
      // 유튜브 고해상도 SVG 로고 직접 생성
      const youtubeSvg = `
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="#FF0000"/>
          <path d="M26 20L42 32L26 44V20Z" fill="white"/>
        </svg>
      `;
      
      return new NextResponse(youtubeSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'x-logo-source': 'youtube-svg-custom',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    } else if (domainUrl.includes('github.com')) {
      // GitHub 고해상도 SVG 로고 직접 생성
      const githubSvg = `
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="#24292e"/>
          <path d="M32 12c-11.046 0-20 8.954-20 20 0 8.837 5.739 16.347 13.708 18.986 1.002.184 1.367-.435 1.367-.968 0-.477-.018-1.74-.027-3.415-5.565 1.209-6.74-2.684-6.74-2.684-.912-2.316-2.226-2.932-2.226-2.932-1.819-1.244.138-1.218.138-1.218 2.012.142 3.07 2.066 3.07 2.066 1.788 3.064 4.688 2.179 5.832 1.666.18-1.296.699-2.179 1.271-2.681-4.448-.506-9.126-2.224-9.126-9.896 0-2.187.779-3.974 2.058-5.375-.206-.507-.892-2.547.196-5.309 0 0 1.679-.538 5.496 2.052a19.138 19.138 0 0 1 5.002-.672c1.697.008 3.408.229 5.002.672 3.816-2.59 5.494-2.052 5.494-2.052 1.089 2.762.403 4.802.197 5.309 1.281 1.401 2.056 3.188 2.056 5.375 0 7.689-4.685 9.384-9.148 9.88.719.62 1.359 1.845 1.359 3.719 0 2.684-.024 4.849-.024 5.508 0 .537.36 1.161 1.375.964C46.26 48.339 52 40.833 52 32c0-11.046-8.954-20-20-20z" fill="white"/>
        </svg>
      `;
      
      return new NextResponse(githubSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'x-logo-source': 'github-svg-custom',
          'Cache-Control': 'public, max-age=3600'
        }
      });
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