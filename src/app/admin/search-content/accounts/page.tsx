'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RefreshCw, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { buildAutoAccountSeo, buildAccountSeoSuggestions } from '@/lib/seo-auto';

type AccountSeoItem = {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  coins_m?: string | null;
  account_value: string | null;
  recommended_rental: string | null;
  deposit: string;
  screenshots: unknown;
  status: string | null;
  audit_status: string | null;
  seo_override_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_summary: string | null;
  seo_og_title: string | null;
  seo_og_description: string | null;
  seo_og_image: string | null;
  seo_indexable: boolean | null;
};

type FormState = {
  entityKey: string;
  title: string;
  description: string;
  summary: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  indexable: boolean;
};

const emptyForm: FormState = {
  entityKey: '',
  title: '',
  description: '',
  summary: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  indexable: true,
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hfb.yugioh.top';

function trimPreviewText(value: string, maxLength: number) {
  const text = value.trim();
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function toFormState(item?: AccountSeoItem | null): FormState {
  if (!item) {
    return emptyForm;
  }

  return {
    entityKey: item.account_id,
    title: item.seo_title || '',
    description: item.seo_description || '',
    summary: item.seo_summary || '',
    ogTitle: item.seo_og_title || '',
    ogDescription: item.seo_og_description || '',
    ogImage: item.seo_og_image || '',
    indexable: item.seo_indexable ?? true,
  };
}

export default function AccountSeoPage() {
  const [items, setItems] = useState<AccountSeoItem[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const selectedItem = useMemo(
    () => items.find((item) => item.account_id === selectedKey) || null,
    [items, selectedKey],
  );

  const autoSeo = useMemo(
    () => (selectedItem ? buildAutoAccountSeo(selectedItem) : null),
    [selectedItem],
  );
  const suggestionBundle = useMemo(
    () => (selectedItem ? buildAccountSeoSuggestions(selectedItem) : { keywords: [], faqSuggestions: [] }),
    [selectedItem],
  );

  const previewPath = form.entityKey ? `/accounts/${form.entityKey}` : '';
  const searchPreviewTitle = form.title.trim() || autoSeo?.title || '商品标题预览';
  const searchPreviewDescription =
    form.description.trim() || autoSeo?.description || '这里会显示商品详情页的搜索结果摘要。';
  const sharePreviewTitle = form.ogTitle.trim() || autoSeo?.ogTitle || searchPreviewTitle;
  const sharePreviewDescription =
    form.ogDescription.trim() || autoSeo?.ogDescription || searchPreviewDescription;
  const aiPreviewSummary =
    form.summary.trim() || autoSeo?.summary || form.description.trim() || '这里会显示 AI / GEO 摘要。';

  const loadItems = async (keyword = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) {
        params.set('search', keyword.trim());
      }
      const response = await fetch(`/api/admin/search-content/accounts?${params.toString()}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'FAILED_TO_LOAD_ACCOUNT_SEO_OVERRIDES');
      }
      setItems(result.data || []);
    } catch (error: any) {
      toast.error(error.message || 'FAILED_TO_LOAD_ACCOUNT_SEO_OVERRIDES');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    setForm(toFormState(selectedItem));
  }, [selectedItem]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSearch = async () => {
    const keyword = search.trim();
    setQuery(keyword);
    setSelectedKey('');
    await loadItems(keyword);
  };

  const handleApplyAutoSeo = () => {
    if (!autoSeo) {
      return;
    }

    setForm((current) => ({
      ...current,
      title: autoSeo.title,
      description: autoSeo.description,
      summary: autoSeo.summary,
      ogTitle: autoSeo.ogTitle,
      ogDescription: autoSeo.ogDescription,
      ogImage: current.ogImage || autoSeo.ogImage,
    }));
    toast.success('已应用自动 SEO 建议');
  };

  const handleResetToAutoSeo = () => {
    setForm((current) => ({
      ...current,
      title: '',
      description: '',
      summary: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
    }));
    toast.success('已重置为自动 SEO 模式');
  };

  const handleSave = async () => {
    if (!form.entityKey) {
      toast.error('请选择账号');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/search-content/accounts/${form.entityKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'FAILED_TO_SAVE_ACCOUNT_SEO_OVERRIDE');
      }
      toast.success('商品 SEO 已保存');
      await loadItems(query);
      setSelectedKey(form.entityKey);
    } catch (error: any) {
      toast.error(error.message || 'FAILED_TO_SAVE_ACCOUNT_SEO_OVERRIDE');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品详情 SEO</h1>
          <p className="text-sm text-gray-600">
            公开商品详情页会自动生成 SEO 文案，后台填写的内容会优先覆盖自动结果。
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/admin/search-content">返回内容与搜索</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>账号列表</CardTitle>
            <CardDescription>搜索账号 ID、标题或描述，选择后编辑 SEO 覆盖字段。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索账号 ID / 标题"
              />
              <Button type="button" variant="outline" onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                搜索
              </Button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-gray-500">加载中...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-gray-500">暂无可管理的账号</div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.account_id}
                    type="button"
                    onClick={() => setSelectedKey(item.account_id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      item.account_id === selectedKey ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium text-gray-900">{item.title}</span>
                      <span className="shrink-0 text-xs text-gray-500">{item.account_id}</span>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs text-gray-500">
                      <span>{`审核：${item.audit_status || '-'}`}</span>
                      <span>{`状态：${item.status || '-'}`}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {item.seo_override_id ? '已配置手动覆盖' : '当前使用自动 SEO'}
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedItem ? '编辑商品 SEO' : '请选择一个账号'}</CardTitle>
            <CardDescription>
              留空时系统会自动生成标题、描述、OG 和 AI 摘要；手动填写后优先使用手动值。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedItem ? (
              <>
                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">{selectedItem.title}</div>
                      <div className="text-sm text-gray-600">{`${siteUrl}${previewPath}`}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={handleApplyAutoSeo}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        应用自动 SEO
                      </Button>
                      <Button type="button" variant="outline" onClick={handleResetToAutoSeo}>
                        重置为自动 SEO
                      </Button>
                      <Button asChild variant="outline">
                        <Link href={previewPath} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          打开预览
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="seoTitle">SEO 标题</Label>
                    <Input
                      id="seoTitle"
                      value={form.title}
                      onChange={(e) => updateForm('title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ogTitle">OG 标题</Label>
                    <Input
                      id="ogTitle"
                      value={form.ogTitle}
                      onChange={(e) => updateForm('ogTitle', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="seoDescription">SEO 描述</Label>
                    <Textarea
                      id="seoDescription"
                      rows={4}
                      value={form.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ogDescription">OG 描述</Label>
                    <Textarea
                      id="ogDescription"
                      rows={4}
                      value={form.ogDescription}
                      onChange={(e) => updateForm('ogDescription', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="summary">AI / 搜索摘要</Label>
                    <Textarea
                      id="summary"
                      rows={5}
                      value={form.summary}
                      onChange={(e) => updateForm('summary', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ogImage">OG 图片</Label>
                    <Input
                      id="ogImage"
                      value={form.ogImage}
                      onChange={(e) => updateForm('ogImage', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-xl border bg-white p-4">
                    <div className="text-sm font-medium text-gray-900">搜索结果预览</div>
                    <div className="mt-4 space-y-1">
                      <div className="text-xs text-green-700">{`${siteUrl}${previewPath}`}</div>
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
                        {(form.ogImage.trim() || autoSeo?.ogImage) ? '已配置 OG 图片' : '未配置 OG 图片'}
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="font-medium text-gray-900">{trimPreviewText(sharePreviewTitle, 48)}</div>
                        <p className="text-sm leading-6 text-gray-600">
                          {trimPreviewText(sharePreviewDescription, 110)}
                        </p>
                        <div className="text-xs text-gray-500">{`${siteUrl}${previewPath}`}</div>
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
                    系统会自动组合商品标题、哈夫币、租金、押金和商品说明生成默认 SEO 文案。
                    你也可以点击“应用自动 SEO”把建议回填到表单后再微调。
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
                    <div className="text-sm text-gray-500">关闭后将输出 noindex，并从公开索引列表中排除。</div>
                  </div>
                  <Switch
                    checked={form.indexable}
                    onCheckedChange={(checked) => updateForm('indexable', checked)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? '保存中...' : '保存商品 SEO'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
                先从左侧选择一个商品账号，再配置该详情页的 SEO 信息。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
