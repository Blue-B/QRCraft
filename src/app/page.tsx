
'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import * as htmlToImage from 'html-to-image';
import download from 'downloadjs';
import { QrCode, Globe, FileImage, ImageIcon, FileCode, FileText, Upload, X, Download, ChevronDown } from 'lucide-react';

interface FaviconData {
  data: string;
  isSvg: boolean;
  isLoaded: boolean;
  error: boolean;
  source?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [favicon, setFavicon] = useState<FaviconData>({ data: '', isSvg: false, isLoaded: false, error: false });
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrColor, setQrColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isQrGenerated, setIsQrGenerated] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [trackingUrl] = useState('');
  const [isTrackingMode] = useState(false);
  const [logoSize, setLogoSize] = useState(0.2); // Logo size state (로고 크기 상태)
  const [showDonationPopup, setShowDonationPopup] = useState(false); // Donation popup state (후원 팝업 상태)
  const [qrUsage, setQrUsage] = useState({ 
    free: 0, 
    premium: 0, 
    limit: { 
      free: 10, 
      premium: 1000 
    },
    apiUsage: 0,
    apiLimit: 1000
  });
  
  const qrRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Load premium status (프리미엄 상태 로드)
  React.useEffect(() => {
    // Load QR usage (QR 사용량 로드)
    const savedQrUsage = localStorage.getItem('qr_usage');
    if (savedQrUsage) {
      setQrUsage(JSON.parse(savedQrUsage));
    }
  }, []);


  // Handle URL submission (URL 제출 처리)
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      fetchFavicon(url.trim());
      setIsQrGenerated(true);
      setGeneratedUrl(url.trim());
      incrementQrUsage(); // Increment QR generation count (QR 생성 횟수 증가)
      
      // Show donation popup after QR generation (faster) (QR 생성 후 후원 팝업 표시 - 더 빠르게)
      if (Math.random() < 0.8) {
        setTimeout(() => {
          setShowDonationPopup(true);
        }, 500); // Shortened to 0.5 seconds (0.5초로 단축)
      }
    }
  };

  // Fetch favicon (파비콘 가져오기)
  const fetchFavicon = async (inputUrl: string) => {
    if (!inputUrl) return;

    setIsGenerating(true);
    setFavicon({ data: '', isSvg: false, isLoaded: false, error: false });

    try {
      const domain = new URL(inputUrl).hostname;
      
      // Special handling for specific domains (특정 도메인 특별 처리)
      if (domain.includes('github.com')) {
        const githubSvg = `
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        `;
        setFavicon({ data: githubSvg, isSvg: true, isLoaded: true, error: false, source: 'github-svg' });
        setIsGenerating(false);
        return;
      }

      // Add timestamp for cache invalidation (캐시 무효화를 위한 타임스탬프 추가)
      const response = await fetch(`/api/favicon?domain_url=${domain}&t=${Date.now()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error(`Icon not found, status: ${response.status}`);

      const contentType = response.headers.get('content-type') || '';
      const logoSource = response.headers.get('x-logo-source') || 'unknown';

      if (contentType.includes('svg')) {
        const svgText = await response.text();
        setFavicon({ data: svgText, isSvg: true, isLoaded: true, error: false, source: logoSource });
      } else {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setFavicon({ data: objectUrl, isSvg: false, isLoaded: true, error: false, source: logoSource });
      }
    } catch (error) {
      console.error('Error fetching icon:', error);
      setFavicon({ data: '', isSvg: false, isLoaded: true, error: true, source: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download (다운로드 처리)
  const downloadQR = async (format: 'png' | 'jpeg' | 'svg' | 'webp') => {
    if (!qrRef.current) return;

    const options = {
      pixelRatio: 8,
      quality: 1.0,
    };

    try {
      let dataUrl: string;
      let filename: string;

      switch (format) {
        case 'svg':
          dataUrl = await htmlToImage.toSvg(qrRef.current, options);
          filename = 'qr-code.svg';
          break;
        case 'jpeg':
          dataUrl = await htmlToImage.toJpeg(qrRef.current, { ...options, quality: 0.98 });
          filename = 'qr-code.jpeg';
          break;
        case 'webp':
          dataUrl = await htmlToImage.toPng(qrRef.current, options);
          const webpBlob = await new Promise<Blob | null>(resolve => {
            const img = new window.Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0);
              canvas.toBlob(resolve, 'image/webp', 0.98);
            };
            img.src = dataUrl;
          });
          if (webpBlob) download(webpBlob as Blob, 'qr-code.webp');
          return;
        default:
          dataUrl = await htmlToImage.toPng(qrRef.current, options);
          filename = 'qr-code.png';
      }

      download(dataUrl, filename);
    } catch (error) {
      console.error('Download error:', error);
    }
  };



  // Custom logo upload (커스텀 로고 업로드)
  const handleCustomLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCustomLogo(result);
      setFavicon({ data: '', isSvg: false, isLoaded: false, error: false });
      
      // Automatic logo size adjustment (로고 크기 자동 조정)
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        // Wide logos smaller, tall logos larger (가로가 긴 로고는 더 작게, 세로가 긴 로고는 더 크게)
        if (aspectRatio > 1.5) {
          setLogoSize(0.15); // Wide logo (가로가 긴 로고)
        } else if (aspectRatio < 0.7) {
          setLogoSize(0.25); // Tall logo (세로가 긴 로고)
        } else {
          setLogoSize(0.2); // Square logo (정사각형 로고)
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Remove custom logo (커스텀 로고 제거)
  const removeCustomLogo = () => {
    setCustomLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Change background color (배경색 변경)
  const handleBackgroundChange = (newBackgroundColor: string) => {
    setBackgroundColor(newBackgroundColor);
    if (newBackgroundColor === '#000000') {
      setQrColor('#FFFFFF');
    } else {
      setQrColor('#000000');
    }
  };

  // Reset colors (색상 초기화)
  const resetColors = () => {
    setQrColor('#000000');
    setBackgroundColor('#FFFFFF');
  };

  // Close download menu when clicking outside (다운로드 메뉴 외부 클릭 시 닫기)
  const handleClickOutside = (event: MouseEvent) => {
    if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
      setShowDownloadMenu(false);
    }
  };

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Increment QR generation count (QR 생성 횟수 증가)
  const incrementQrUsage = () => {
    const newUsage = { ...qrUsage };
    newUsage.free += 1; // Count as free user (무료 사용자로 카운트)
    setQrUsage(newUsage);
    localStorage.setItem('qr_usage', JSON.stringify(newUsage));
  };



  // Donation link (후원하기 링크)
  const handleDonation = () => {
    // Buy Me a Coffee link (Buy Me a Coffee 링크)
    const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL || 'https://buymeacoffee.com/beckycode7h';
    window.open(donationUrl, '_blank');
    setShowDonationPopup(false);
  };

  // Close donation popup (후원 팝업 닫기)
  const closeDonationPopup = () => {
    setShowDonationPopup(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar (상단바) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <QrCode className="w-6 h-6 text-indigo-600" />
                QRCraft
              </h1>
              
              {/* Remove premium status display - all features free (프리미엄 상태 표시 제거 - 모든 기능 무료) */}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Remove premium-related buttons (프리미엄 관련 버튼 제거) */}
            </div>
          </div>
        </div>
      </div>

      {/* Donation popup (후원 팝업) */}
      {showDonationPopup && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.08)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md mx-4 p-6 relative border border-gray-200">
            {/* Close button (닫기 버튼) */}
            <button
              type="button"
              onClick={closeDonationPopup}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition p-2 rounded-full hover:bg-gray-100 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              {/* Emoji icon (이모지 아이콘) */}
              <div className="text-5xl mb-4 animate-bounce">☕</div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                QR Code Generated Successfully!
              </h3>
              
              <p className="text-gray-600 mb-6">
                Did QRCraft help you?<br />
                Support us to keep improving the service!
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleDonation}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
                >
                  ☕ Buy Me a Coffee
                </button>
                
                <button
                  type="button"
                  onClick={closeDonationPopup}
                  className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition rounded-lg border border-gray-200 hover:border-gray-300"
                >
                  Maybe Later
                </button>
              </div>
              
              <p className="text-xs text-gray-400 mt-4">
                💡 Donations are optional. You can continue using QRCraft for free!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Remove top ad banner (상단 광고 배너 제거) */}
          
          {/* Remove duplicate title section (중복된 제목 섹션 제거) */}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Settings section (설정 섹션) */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Settings</h2>

                {/* URL input (URL 입력) */}
                <form onSubmit={handleUrlSubmit} className="mb-6">
                  <div className="mb-4">
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2 transition"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Generate QR Code
                      </>
                    )}
                  </button>
                </form>
                {/* Color settings (색상 설정) */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Colors</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">QR Code Color</label>
                      <input 
                        type="color" 
                        value={qrColor} 
                        onChange={(e) => setQrColor(e.target.value)} 
                        className="w-full h-10 p-1 border border-gray-300 rounded-md hover:border-indigo-300 transition" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Background</label>
                      <select 
                        value={backgroundColor} 
                        onChange={(e) => handleBackgroundChange(e.target.value)}
                        className="w-full h-10 px-3 border border-gray-300 rounded-md hover:border-indigo-300 transition text-sm"
                      >
                        <option value="#FFFFFF">White</option>
                        <option value="#000000">Black</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetColors}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                  >
                    Reset Colors
                  </button>
                </div>

                {/* Custom logo (커스텀 로고) */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Custom Logo</h3>
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCustomLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!isQrGenerated}
                      className={`w-full px-4 py-2 font-medium rounded-lg transition flex items-center justify-center gap-2 ${
                        isQrGenerated 
                          ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 cursor-pointer' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload Custom Logo
                    </button>
                    {!isQrGenerated && (
                      <p className="text-xs text-gray-500 mt-1">
                        Generate a QR code first to upload custom logo
                      </p>
                    )}
                    {customLogo && isQrGenerated && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                          <Image 
                            src={customLogo} 
                            alt="Custom Logo" 
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded object-cover border border-green-300"
                          />
                          <span className="text-sm text-green-700 flex-1">Custom logo uploaded</span>
                          <button
                            type="button"
                            onClick={removeCustomLogo}
                            className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Logo size adjustment (로고 크기 조정) */}
                        <div className="space-y-2">
                          <label className="block text-xs text-gray-600">Logo Size</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0.15"
                              max="0.3"
                              step="0.05"
                              value={logoSize}
                              onChange={(e) => setLogoSize(parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <span className="text-xs text-gray-500 w-12 text-right">
                              {Math.round(logoSize * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Small</span>
                            <span>Large</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Download button (다운로드 버튼) */}
                <div className="relative" ref={downloadMenuRef}>
                  <button 
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    disabled={!url}
                    className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download QR Code
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showDownloadMenu && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-2 space-y-1">
                        <button 
                          onClick={() => { downloadQR('png'); setShowDownloadMenu(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-md transition text-left"
                        >
                          <div className="flex items-center gap-3">
                            <FileImage className="w-5 h-5 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900">PNG</div>
                              <div className="text-xs text-gray-500">High quality, transparent background</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Recommended</div>
                        </button>
                        
                        <button 
                          onClick={() => { 
                            downloadQR('svg'); 
                            setShowDownloadMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-md transition text-left"
                        >
                          <div className="flex items-center gap-3">
                            <FileCode className="w-5 h-5 text-green-600" />
                            <div>
                              <div className="font-medium text-gray-900">SVG</div>
                              <div className="text-xs text-gray-500">Vector format, unlimited scaling</div>
                            </div>
                          </div>
                        </button>
                        
                        <button 
                          onClick={() => { downloadQR('jpeg'); setShowDownloadMenu(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-md transition text-left"
                        >
                          <div className="flex items-center gap-3">
                            <ImageIcon className="w-5 h-5 text-orange-600" />
                            <div>
                              <div className="font-medium text-gray-900">JPEG</div>
                              <div className="text-xs text-gray-500">Small file size</div>
                            </div>
                          </div>
                        </button>
                        
                        <button 
                          onClick={() => { 
                            downloadQR('webp'); 
                            setShowDownloadMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-md transition text-left"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-purple-600" />
                            <div>
                              <div className="font-medium text-gray-900">WEBP</div>
                              <div className="text-xs text-gray-500">Modern format, optimized size</div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* QR code preview (QR 코드 미리보기) */}
              <div className="flex items-center justify-center">
                {isQrGenerated && (isTrackingMode ? trackingUrl : generatedUrl) ? (
                  <div className="relative">
                    <div ref={qrRef} style={{ 
                      background: backgroundColor, 
                      padding: '16px', 
                      display: 'inline-block', 
                      borderRadius: '12px', 
                      position: 'relative',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}>
                      <QRCodeSVG
                        value={isTrackingMode ? trackingUrl : generatedUrl}
                        size={256}
                        fgColor={qrColor}
                        bgColor={backgroundColor}
                        level={"M"}
                        includeMargin={false}
                      />
                      {isTrackingMode && (
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          Tracked
                        </div>
                      )}
                      {(favicon.isLoaded && favicon.data && !favicon.error) && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: Math.min(256 * logoSize, 60), // 로고 크기 최대 60px로 제한
                            height: Math.min(256 * logoSize, 60), // 로고 크기 최대 60px로 제한
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px', // Clean padding for favicon (파비콘은 여백을 두고 깔끔하게)
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
                            border: '2px solid rgba(0,0,0,0.08)', // Border adjustment (테두리 조정)
                          }}
                        >
                          {favicon.isSvg ? (
                            <div
                              style={{ 
                                width: '70%', // Favicon SVG limited to 70% (파비콘 SVG는 70%로 제한)
                                height: '70%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#000000',
                              }}
                              dangerouslySetInnerHTML={{ __html: favicon.data }}
                            />
                          ) : (
                            <Image
                              src={favicon.data}
                              alt="Logo"
                              width={Math.round(Math.min(256 * logoSize, 60) * 0.6)} // Favicon image limited to 60% (파비콘 이미지는 60%로 제한)
                              height={Math.round(Math.min(256 * logoSize, 60) * 0.6)}
                              unoptimized
                              style={{ 
                                objectFit: 'contain',
                                imageRendering: 'auto',
                                filter: 'contrast(1.3) brightness(1.15) saturate(1.2) sharpen(1)',
                              }}
                            />
                          )}
                        </div>
                      )}
                      {customLogo && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: Math.min(256 * logoSize, 60), // 로고 크기 최대 60px로 제한
                            height: Math.min(256 * logoSize, 60), // 로고 크기 최대 60px로 제한
                            background: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0px', // Remove padding completely (패딩 완전 제거)
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: '2px solid rgba(0,0,0,0.05)', // Add border (테두리 추가)
                            overflow: 'hidden', // Prevent image from going outside circle (이미지가 원 밖으로 나가지 않도록)
                          }}
                        >
                          <Image
                            src={customLogo}
                            alt="Custom Logo"
                            fill
                            style={{ 
                              objectFit: 'cover', // Changed from contain to cover to fill the circle (contain에서 cover로 변경하여 원을 꽉 채움)
                              imageRendering: 'auto',
                              filter: 'contrast(1.1) brightness(1.05) saturate(1.05)',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Enter a URL to generate QR code</p>
                    <p className="text-sm">Your QR code will appear here</p>
                  </div>
                )}
              </div>
            </div>
            
            {favicon.error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                Could not fetch favicon. Please check the URL.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
