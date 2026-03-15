'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type ContentPage = {
  id: string;
  slug: string;
  page_type: string;
  title: string;
  summary: string;
  content: string;
  faq_json: unknown;
  seo_title: string;
  seo_description: string;
  seo_summary: string;
  og_title: string;
  og_description: string;
  og_image: string;
  indexable: boolean;
  status: string;
  published_at: string | null;
  updated_at: string;
};

type FormState = {
  id?: string;
  slug: string;
  pageType: string;
  title: string;
  summary: string;
  content: string;
  faqJson: string;
  seoTitle: string;
  seoDescription: string;
  seoSummary: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  indexable: boolean;
  status: string;
};

const emptyForm: FormState = {
  slug: '',
  pageType: 'help',
  title: '',
  summary: '',
  content: '',
  faqJson: '[]',
  seoTitle: '',
  seoDescription: '',
  seoSummary: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  indexable: true,
  status: 'draft',
};

function toFormState(page?: ContentPage | null): FormState {
  if (!page) {
    return emptyForm;
  }

  return {
    id: page.id,
    slug: page.slug,
    pageType: page.page_type,
    title: page.title,
    summary: page.summary || '',
    content: page.content || '',
    faqJson: JSON.stringify(page.faq_json || [], null, 2),
    seoTitle: page.seo_title || '',
    seoDescription: page.seo_description || '',
    seoSummary: page.seo_summary || '',
    ogTitle: page.og_title || '',
    ogDescription: page.og_description || '',
    ogImage: page.og_image || '',
    indexable: Boolean(page.indexable),
    status: page.status || 'draft',
  };
}

export default function SearchContentPage() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedPage = useMemo(
    () => pages.find((item) => item.id === selectedId) || null,
    [pages, selectedId],
  );

  const loadPages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/search-content/pages', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'FAILED_TO_LOAD_CONTENT_PAGES');
      }
      setPages(result.data || []);
    } catch (error: any) {
      toast.error(error.message || '加载内容页失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPages();
  }, []);

  useEffect(() => {
    setForm(toFormState(selectedPage));
  }, [selectedPage]);

  const handleCreate = () => {
    setSelectedId('');
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        form.id ? `/api/admin/search-content/pages/${form.id}` : '/api/admin/search-content/pages',
        {
          method: form.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'FAILED_TO_SAVE_CONTENT_PAGE');
      }
      await loadPages();
      if (result.data?.id) {
        setSelectedId(result.data.id);
      }
      toast.success('内容页已保存');
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) {
      return;
    }

    if (!confirm('确定删除这个内容页吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/search-content/pages/${form.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'FAILED_TO_DELETE_CONTENT_PAGE');
      }
      toast.success('内容页已删除');
      setSelectedId('');
      setForm(emptyForm);
      await loadPages();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">内容与搜索</h1>
          <p className="text-sm text-gray-600">
            管理帮助页、规则页和基础 SEO/GEO 内容，不影响现有业务页面。
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          新建内容页
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>内容页列表</CardTitle>
            <CardDescription>先从帮助页和规则页开始搭建搜索内容资产。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-gray-500">加载中...</div>
            ) : pages.length === 0 ? (
              <div className="text-sm text-gray-500">暂无内容页</div>
            ) : (
              pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedId(page.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    page.id === selectedId ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">{page.title}</span>
                    <span className="text-xs text-gray-500">{page.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{`/${page.page_type}/${page.slug}`}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{form.id ? '编辑内容页' : '新建内容页'}</CardTitle>
            <CardDescription>公开内容页会用于搜索引擎收录、FAQ 摘要和 sitemap。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pageType">页面类型</Label>
                <Select value={form.pageType} onValueChange={(value) => setForm((current) => ({ ...current, pageType: value }))}>
                  <SelectTrigger id="pageType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="help">帮助页</SelectItem>
                    <SelectItem value="rules">规则页</SelectItem>
                    <SelectItem value="topics">专题页</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">发布状态</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="published">已发布</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={form.slug} onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">页面摘要</Label>
              <Textarea id="summary" value={form.summary} onChange={(e) => setForm((current) => ({ ...current, summary: e.target.value }))} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">正文内容</Label>
              <Textarea id="content" value={form.content} onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))} rows={14} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faqJson">FAQ JSON</Label>
              <Textarea id="faqJson" value={form.faqJson} onChange={(e) => setForm((current) => ({ ...current, faqJson: e.target.value }))} rows={8} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO 标题</Label>
                <Input id="seoTitle" value={form.seoTitle} onChange={(e) => setForm((current) => ({ ...current, seoTitle: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogTitle">OG 标题</Label>
                <Input id="ogTitle" value={form.ogTitle} onChange={(e) => setForm((current) => ({ ...current, ogTitle: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO 描述</Label>
                <Textarea id="seoDescription" value={form.seoDescription} onChange={(e) => setForm((current) => ({ ...current, seoDescription: e.target.value }))} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogDescription">OG 描述</Label>
                <Textarea id="ogDescription" value={form.ogDescription} onChange={(e) => setForm((current) => ({ ...current, ogDescription: e.target.value }))} rows={4} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seoSummary">AI 摘要友好简介</Label>
                <Textarea id="seoSummary" value={form.seoSummary} onChange={(e) => setForm((current) => ({ ...current, seoSummary: e.target.value }))} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogImage">OG 图片</Label>
                <Input id="ogImage" value={form.ogImage} onChange={(e) => setForm((current) => ({ ...current, ogImage: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium text-gray-900">允许搜索引擎收录</div>
                <div className="text-sm text-gray-500">关闭后不会进入 sitemap，也会输出 noindex。</div>
              </div>
              <Switch checked={form.indexable} onCheckedChange={(checked) => setForm((current) => ({ ...current, indexable: checked }))} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="destructive" onClick={handleDelete} disabled={!form.id}>
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? '保存中...' : '保存内容页'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
