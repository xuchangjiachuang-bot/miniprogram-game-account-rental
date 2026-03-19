'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type AutoSeoPagePreview = {
  pageType: string;
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
  accountCount: number;
};

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString('zh-CN');
}

export default function SearchContentPage() {
  const [autoPages, setAutoPages] = useState<AutoSeoPagePreview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAutoPages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/search-content/auto-pages', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'FAILED_TO_LOAD_AUTO_PAGES');
      }

      setAutoPages(Array.isArray(result.data) ? result.data : []);
    } catch (error: any) {
      toast.error(error.message || '自动 SEO 页面加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAutoPages();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">内容与搜索</h1>
          <p className="text-sm text-gray-600">
            后台只保留自动 SEO 结果预览。页面标题、摘要和 sitemap 内容会根据真实在架账号自动生成。
          </p>
        </div>
        <Button variant="outline" onClick={loadAutoPages} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新自动 SEO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>自动 SEO 专题预览</CardTitle>
          <CardDescription>
            这里展示当前系统自动生成的专题页。手动 SEO 覆盖入口已移除，避免旧配置继续干扰线上页面。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">加载中...</div>
          ) : autoPages.length === 0 ? (
            <div className="text-sm text-gray-500">当前还没有可展示的自动 SEO 页面。</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {autoPages.map((page) => (
                <div
                  key={`${page.pageType}-${page.slug}`}
                  className="rounded-2xl border bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{page.title}</div>
                      <div className="mt-1 break-all text-xs text-gray-500">
                        /{page.pageType}/{page.slug}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      {page.accountCount} 个商品
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                    {page.summary || '系统将根据真实账号信息自动生成页面摘要。'}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">
                      更新于 {formatUpdatedAt(page.updatedAt)}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/${page.pageType}/${page.slug}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        预览
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
