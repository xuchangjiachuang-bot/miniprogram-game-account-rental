'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Plus, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { buildAutoContentPageSeo, buildContentPageSeoSuggestions } from '@/lib/seo-auto';

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

type FaqItem = {
  question: string;
  answer: string;
};

type AutoSeoPagePreview = {
  pageType: string;
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
  accountCount: number;
};

type FormState = {
  id?: string;
  slug: string;
  pageType: string;
  title: string;
  summary: string;
  content: string;
  faqItems: FaqItem[];
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
  faqItems: [],
  seoTitle: '',
  seoDescription: '',
  seoSummary: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  indexable: true,
  status: 'draft',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hfb.yugioh.top';

function trimPreviewText(value: string, maxLength: number) {
  const text = value.trim();
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function normalizeFaqItems(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    question: String((item as any)?.question || ''),
    answer: String((item as any)?.answer || ''),
  }));
}

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
    faqItems: normalizeFaqItems(page.faq_json),
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

function mapErrorMessage(code: string) {
  switch (code) {
    case 'SLUG_ALREADY_EXISTS':
      return '同类型页面下 slug 已存在，请更换。';
    case 'INVALID_SLUG':
      return '请填写合法的 slug。';
    case 'INVALID_TITLE':
      return '标题不能为空。';
    default:
      return code;
  }
}

export default function SearchContentPage() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [autoPages, setAutoPages] = useState<AutoSeoPagePreview[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedPage = useMemo(
    () => pages.find((item) => item.id === selectedId) || null,
    [pages, selectedId],
  );

  const normalizedSlug = useMemo(
    () =>
      form.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-/]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    [form.slug],
  );

  const previewPath = useMemo(() => {
    if (!normalizedSlug) {
      return '';
    }

    return `/${form.pageType}/${normalizedSlug}`;
  }, [form.pageType, normalizedSlug]);

  const autoSeo = useMemo(
    () =>
      buildAutoContentPageSeo({
        page_type: form.pageType,
        title: form.title,
        summary: form.summary,
        content: form.content,
        faq_json: form.faqItems,
        og_image: form.ogImage,
      }),
    [form.content, form.faqItems, form.ogImage, form.pageType, form.summary, form.title],
  );
  const suggestionBundle = useMemo(
    () =>
      buildContentPageSeoSuggestions({
        page_type: form.pageType,
        title: form.title,
        summary: form.summary,
        content: form.content,
        faq_json: form.faqItems,
      }),
    [form.content, form.faqItems, form.pageType, form.summary, form.title],
  );

  const searchPreviewTitle = form.seoTitle.trim() || autoSeo.title || '页面标题预览';
  const searchPreviewDescription =
    form.seoDescription.trim() || autoSeo.description || '这里会显示搜索结果中的描述摘要。';
  const sharePreviewTitle = form.ogTitle.trim() || autoSeo.ogTitle || searchPreviewTitle;
  const sharePreviewDescription =
    form.ogDescription.trim() || autoSeo.ogDescription || searchPreviewDescription;
  const aiPreviewSummary = form.seoSummary.trim() || autoSeo.summary || '这里会显示 AI / GEO 摘要。';

  const slugConflict = useMemo(
    () =>
      pages.find(
        (item) =>
          item.page_type === form.pageType &&
          item.slug === normalizedSlug &&
          item.id !== form.id,
      ) || null,
    [form.id, form.pageType, normalizedSlug, pages],
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
      toast.error(mapErrorMessage(error.message || 'FAILED_TO_LOAD_CONTENT_PAGES'));
    } finally {
      setLoading(false);
    }
  };

  const loadAutoPages = async () => {
    try {
      const response = await fetch('/api/admin/search-content/auto-pages', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'FAILED_TO_LOAD_AUTO_PAGES');
      }
      setAutoPages(result.data || []);
    } catch (error: any) {
      toast.error(mapErrorMessage(error.message || 'FAILED_TO_LOAD_AUTO_PAGES'));
    }
  };

  useEffect(() => {
    void loadPages();
    void loadAutoPages();
  }, []);

  useEffect(() => {
    setForm(toFormState(selectedPage));
  }, [selectedPage]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreate = () => {
    setSelectedId('');
    setForm(emptyForm);
  };

  const handleApplyAutoSeo = () => {
    setForm((current) => ({
      ...current,
      seoTitle: autoSeo.title,
      seoDescription: autoSeo.description,
      seoSummary: autoSeo.summary,
      ogTitle: autoSeo.ogTitle,
      ogDescription: autoSeo.ogDescription,
      ogImage: current.ogImage || autoSeo.ogImage,
    }));
    toast.success('已应用自动 SEO 建议');
  };

  const handleResetToAutoSeo = () => {
    setForm((current) => ({
      ...current,
      seoTitle: '',
      seoDescription: '',
      seoSummary: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
    }));
    toast.success('已重置为自动 SEO 模式');
  };

  const handleSave = async () => {
    if (slugConflict) {
      toast.error('当前 slug 已被占用，请调整后再保存。');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: normalizedSlug,
        faqJson: form.faqItems.filter((item) => item.question.trim() || item.answer.trim()),
      };

      const response = await fetch(
        form.id ? `/api/admin/search-content/pages/${form.id}` : '/api/admin/search-content/pages',
        {
          method: form.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
      toast.error(mapErrorMessage(error.message || 'FAILED_TO_SAVE_CONTENT_PAGE'));
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
      toast.error(mapErrorMessage(error.message || 'FAILED_TO_DELETE_CONTENT_PAGE'));
    }
  };

  const addFaqItem = () => {
    updateForm('faqItems', [...form.faqItems, { question: '', answer: '' }]);
  };

  const updateFaqItem = (index: number, key: keyof FaqItem, value: string) => {
    const nextItems = [...form.faqItems];
    nextItems[index] = { ...nextItems[index], [key]: value };
    updateForm('faqItems', nextItems);
  };

  const removeFaqItem = (index: number) => {
    updateForm(
      'faqItems',
      form.faqItems.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">内容与搜索</h1>
          <p className="text-sm text-gray-600">
            管理帮助页、规则页、专题页和类目页的 SEO/GEO 内容，不影响现有业务页面。
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            新建内容页
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/search-content/accounts">
              <Search className="mr-2 h-4 w-4" />
              商品详情 SEO
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>自动 SEO 专题预览</CardTitle>
          <CardDescription>
            这些页面由真实在架账号自动生成并进入 sitemap，后台只负责查看效果和用手工内容覆盖。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {autoPages.length === 0 ? (
            <div className="text-sm text-gray-500">当前还没有可自动生成的业务专题。</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {autoPages.slice(0, 12).map((page) => (
                <div key={`${page.pageType}-${page.slug}`} className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-gray-900">{page.title}</div>
                    <span className="text-xs text-gray-500">{`${page.accountCount} 个商品`}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{`/${page.pageType}/${page.slug}`}</div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{page.summary}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">
                      {`更新于 ${new Date(page.updatedAt).toLocaleDateString('zh-CN')}`}
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

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>内容页列表</CardTitle>
            <CardDescription>先从帮助页、规则页、专题页和类目页开始。</CardDescription>
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
            <CardDescription>
              公开内容页会用于搜索收录、FAQ 摘要和 sitemap。留空的 SEO 字段会自动生成。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pageType">页面类型</Label>
                <Select value={form.pageType} onValueChange={(value) => updateForm('pageType', value)}>
                  <SelectTrigger id="pageType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="help">帮助页</SelectItem>
                    <SelectItem value="rules">规则页</SelectItem>
                    <SelectItem value="topics">专题页</SelectItem>
                    <SelectItem value="games">类目页</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">发布状态</Label>
                <Select value={form.status} onValueChange={(value) => updateForm('status', value)}>
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
                <Input id="title" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={form.slug} onChange={(e) => updateForm('slug', e.target.value)} />
                {normalizedSlug ? <p className="text-xs text-gray-500">{`规范化后：${normalizedSlug}`}</p> : null}
                {slugConflict ? (
                  <p className="text-xs text-red-500">{`slug 冲突：已存在《${slugConflict.title}》`}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-gray-900">预览链接</div>
                  <div className="text-sm text-gray-600">
                    {previewPath ? `${siteUrl}${previewPath}` : '填写 slug 后生成预览链接'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleApplyAutoSeo}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    应用自动 SEO
                  </Button>
                  <Button type="button" variant="outline" onClick={handleResetToAutoSeo}>
                    重置为自动 SEO
                  </Button>
                  {previewPath ? (
                    <Button asChild variant="outline">
                      <Link href={previewPath} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        打开预览
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">页面摘要</Label>
              <Textarea id="summary" value={form.summary} onChange={(e) => updateForm('summary', e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">正文内容</Label>
              <Textarea id="content" value={form.content} onChange={(e) => updateForm('content', e.target.value)} rows={14} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>FAQ</Label>
                  <p className="text-xs text-gray-500">维护真实用户常见问题，方便搜索和 AI 引用。</p>
                </div>
                <Button type="button" variant="outline" onClick={addFaqItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加 FAQ
                </Button>
              </div>
              {form.faqItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                  暂无 FAQ，点击右上角添加。
                </div>
              ) : (
                form.faqItems.map((item, index) => (
                  <div key={`faq-${index}`} className="space-y-3 rounded-lg border p-4">
                    <div className="space-y-2">
                      <Label>{`问题 ${index + 1}`}</Label>
                      <Input
                        value={item.question}
                        onChange={(e) => updateFaqItem(index, 'question', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{`回答 ${index + 1}`}</Label>
                      <Textarea
                        value={item.answer}
                        onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="destructive" onClick={() => removeFaqItem(index)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除 FAQ
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO 标题</Label>
                <Input id="seoTitle" value={form.seoTitle} onChange={(e) => updateForm('seoTitle', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogTitle">OG 标题</Label>
                <Input id="ogTitle" value={form.ogTitle} onChange={(e) => updateForm('ogTitle', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO 描述</Label>
                <Textarea id="seoDescription" value={form.seoDescription} onChange={(e) => updateForm('seoDescription', e.target.value)} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogDescription">OG 描述</Label>
                <Textarea id="ogDescription" value={form.ogDescription} onChange={(e) => updateForm('ogDescription', e.target.value)} rows={4} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seoSummary">AI / 搜索摘要</Label>
                <Textarea id="seoSummary" value={form.seoSummary} onChange={(e) => updateForm('seoSummary', e.target.value)} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogImage">OG 图片</Label>
                <Input id="ogImage" value={form.ogImage} onChange={(e) => updateForm('ogImage', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-xl border bg-white p-4">
                <div className="text-sm font-medium text-gray-900">搜索结果预览</div>
                <div className="mt-4 space-y-1">
                  <div className="text-xs text-green-700">{previewPath ? `${siteUrl}${previewPath}` : siteUrl}</div>
                  <div className="text-lg font-medium leading-6 text-blue-700">
                    {trimPreviewText(searchPreviewTitle, 60)}
                  </div>
                  <p className="text-sm leading-6 text-gray-600">
                    {trimPreviewText(searchPreviewDescription, 140)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-sm font-medium text-gray-900">社交分享预览</div>
                <div className="mt-4 overflow-hidden rounded-xl border bg-gray-50">
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-sm text-gray-500">
                    {(form.ogImage.trim() || autoSeo.ogImage) ? '已配置 OG 图片' : '未配置 OG 图片'}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="font-medium text-gray-900">{trimPreviewText(sharePreviewTitle, 48)}</div>
                    <p className="text-sm leading-6 text-gray-600">
                      {trimPreviewText(sharePreviewDescription, 110)}
                    </p>
                    <div className="text-xs text-gray-500">{previewPath ? `${siteUrl}${previewPath}` : siteUrl}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-sm font-medium text-gray-900">AI / GEO 预览</div>
                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <div className="text-sm font-medium text-gray-900">{trimPreviewText(searchPreviewTitle, 40)}</div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {trimPreviewText(aiPreviewSummary, 150)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed bg-gray-50 p-4 text-sm text-gray-600">
              <div className="font-medium text-gray-900">自动 SEO 规则</div>
              <p className="mt-2">
                系统会自动组合页面标题、摘要、正文和 FAQ 生成默认 SEO 文案。你也可以点击“应用自动 SEO”，把建议回填到表单后再微调。
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border bg-white p-4">
                <div className="text-sm font-medium text-gray-900">自动关键词建议</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestionBundle.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border px-3 py-1 text-xs text-gray-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-sm font-medium text-gray-900">FAQ 建议</div>
                <div className="mt-4 space-y-3">
                  {suggestionBundle.faqSuggestions.map((item, index) => (
                    <div key={`${item.question}-${index}`} className="rounded-lg bg-gray-50 p-3">
                      <div className="text-sm font-medium text-gray-900">{item.question}</div>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium text-gray-900">允许搜索引擎收录</div>
                <div className="text-sm text-gray-500">关闭后不会进入 sitemap，也会输出 noindex。</div>
              </div>
              <Switch checked={form.indexable} onCheckedChange={(checked) => updateForm('indexable', checked)} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="destructive" onClick={handleDelete} disabled={!form.id}>
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
              <Button onClick={handleSave} disabled={saving || Boolean(slugConflict)}>
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
