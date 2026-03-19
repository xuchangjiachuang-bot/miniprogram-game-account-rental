'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadConfigFromCache, saveConfigToCache } from '@/lib/config-sync';

interface FooterInfo {
  copyright: string;
  icpNumber: string;
  publicSecurityNumber: string;
  otherInfo?: string;
}

// 默认 Footer 信息
const DEFAULT_FOOTER_INFO: FooterInfo = {
  copyright: '© 2026 YuGiOh. 保留所有权利.',
  icpNumber: '',
  publicSecurityNumber: '',
  otherInfo: ''
};

export function Footer() {
  const [footerInfo, setFooterInfo] = useState<FooterInfo>(DEFAULT_FOOTER_INFO);

  useEffect(() => {
    // 1. 优先从 localStorage 读取缓存
    try {
      const cachedConfig = loadConfigFromCache<any>();
      if (cachedConfig?.footerInfo) {
        setFooterInfo(cachedConfig.footerInfo);
      }
    } catch (e) {
      console.error('读取缓存的Footer信息失败:', e);
    }

    // 2. 异步加载最新配置
    const loadTimer = setTimeout(() => {
      loadFooterInfo();
    }, 100);

    return () => clearTimeout(loadTimer);
  }, []);

  const loadFooterInfo = async () => {
    try {
      const response = await fetch('/api/homepage-config', { cache: 'no-store' });
      const result = await response.json();

      if (result.success && result.data?.footerInfo) {
        saveConfigToCache(result.data);
        setFooterInfo(result.data.footerInfo);
      }
    } catch (error) {
      console.error('加载备案信息失败:', error);
      // 加载失败时保持当前值（可能是缓存的或默认的）
    }
  };

  return (
    <footer className="border-t bg-muted/20 py-4">
      <div className="container mx-auto px-4">
        <div className="text-center text-xs text-muted-foreground">
          <p>{footerInfo.copyright}</p>
          <p className="mt-1">
            {footerInfo.icpNumber && (
              <>
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">
                  {footerInfo.icpNumber}
                </a>
                {footerInfo.publicSecurityNumber && ' | '}
              </>
            )}
            {footerInfo.publicSecurityNumber && (
              <a href="http://www.beian.gov.cn/portal/registerSystemInfo" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">
                {footerInfo.publicSecurityNumber}
              </a>
            )}
            {footerInfo.otherInfo && (
              <>
                {footerInfo.icpNumber || footerInfo.publicSecurityNumber ? ' | ' : ''}
                <span>{footerInfo.otherInfo}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
