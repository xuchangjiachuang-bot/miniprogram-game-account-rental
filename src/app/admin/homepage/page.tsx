'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ImagePlus, Edit, Trash2, GripVertical, Save, Upload, Loader2, Eye, Info, Type } from 'lucide-react';
import { CarouselItem, LogoConfig, HomepageConfig } from '@/lib/config-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HomepageConfigPage() {
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [activeTab, setActiveTab] = useState('carousel');
  const [loading, setLoading] = useState(true);

  // 轮播图编辑状态
  const [carouselDialogOpen, setCarouselDialogOpen] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState<CarouselItem | null>(null);
  const [carouselForm, setCarouselForm] = useState<Partial<CarouselItem>>({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    order: 0,
    enabled: true
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // LOGO编辑状态
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [editingLogo, setEditingLogo] = useState<LogoConfig | null>(null);
  const [logoForm, setLogoForm] = useState<Partial<LogoConfig>>({
    name: '',
    type: 'image',
    imageUrl: '',
    text: '',
    textStyle: {
      fontSize: '2xl',
      fontWeight: 'bold'
    },
    linkUrl: '',
    enabled: true
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/homepage-config');
      const result = await res.json();
      if (result.success) {
        setConfig(result.data);
      }
    } catch (error) {
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) {
      toast.error('配置未加载，请刷新页面重试');
      return;
    }

    try {
      const res = await fetch('/api/admin/homepage-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const result = await res.json();
      if (result.success) {
        toast.success('配置保存成功');

        // 更新 localStorage 中的 LOGO 配置
        try {
          const enabledLogos = config.logos.filter((l: LogoConfig) => l.enabled);
          localStorage.setItem('homepage_logos', JSON.stringify(enabledLogos));

          // 更新皮肤配置（将 skinOptions 转换为 SkinConfig 格式）
          if (config.skinOptions && config.skinOptions.length > 0) {
            const enabledSkins = config.skinOptions
              .filter((s: any) => s.enabled)
              .map((s: any) => s.name);

            const skinConfig = {
              enabled: enabledSkins.length > 0,
              skins: enabledSkins
            };

            localStorage.setItem('skin_config', JSON.stringify(skinConfig));
          } else {
            // 如果没有皮肤选项，禁用皮肤功能
            localStorage.setItem('skin_config', JSON.stringify({
              enabled: false,
              skins: []
            }));
          }

          // 同时保存完整的 homepage_config
          localStorage.setItem('homepage_config', JSON.stringify(config));
        } catch (e) {
          console.error('保存到缓存失败:', e);
        }
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存配置失败');
    }
  };

  // 轮播图操作
  const openCarouselDialog = (item?: CarouselItem) => {
    if (item) {
      setEditingCarousel(item);
      setCarouselForm({ ...item });
    } else {
      setEditingCarousel(null);
      setCarouselForm({
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        order: config?.carousels.length || 0,
        enabled: true
      });
    }
    setCarouselDialogOpen(true);
  };

  // 图片上传函数
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || '上传失败');
    }

    return result.data.imageUrl;
  };

  const saveCarousel = async () => {
    if (!carouselForm.title || !carouselForm.imageUrl) {
      toast.error('请填写标题和上传图片');
      return;
    }

    if (!config) return;

    const newItem: CarouselItem = {
      id: editingCarousel?.id || Date.now().toString(),
      title: carouselForm.title!,
      description: carouselForm.description || '',
      imageUrl: carouselForm.imageUrl!,
      linkUrl: carouselForm.linkUrl || '',
      order: carouselForm.order ?? config.carousels.length,
      enabled: carouselForm.enabled ?? true
    };

    let newCarousels;
    if (editingCarousel) {
      newCarousels = config.carousels.map(item =>
        item.id === newItem.id ? newItem : item
      );
    } else {
      newCarousels = [...config.carousels, newItem];
    }

    setConfig({
      ...config,
      carousels: newCarousels.sort((a, b) => a.order - b.order)
    });

    setCarouselDialogOpen(false);
    toast.success(editingCarousel ? '轮播图更新成功' : '轮播图添加成功');
  };

  const deleteCarousel = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      carousels: config.carousels.filter(item => item.id !== id)
    });
    toast.success('轮播图删除成功');
  };

  // LOGO操作
  const openLogoDialog = (item?: LogoConfig) => {
    if (item) {
      setEditingLogo(item);
      setLogoForm({ ...item });
    } else {
      setEditingLogo(null);
      setLogoForm({
        name: '',
        type: 'image',
        imageUrl: '',
        text: '',
        textStyle: {
          fontSize: '2xl',
          fontWeight: 'bold'
        },
        linkUrl: '',
        enabled: true
      });
    }
    setLogoDialogOpen(true);
  };

  const saveLogo = async () => {
    if (!logoForm.name) {
      toast.error('请填写LOGO名称');
      return;
    }

    if (logoForm.type === 'image' && !logoForm.imageUrl) {
      toast.error('请上传图片');
      return;
    }

    if (logoForm.type === 'text' && !logoForm.text) {
      toast.error('请填写文字内容');
      return;
    }

    if (!config) return;

    const newItem: LogoConfig = {
      id: editingLogo?.id || Date.now().toString(),
      name: logoForm.name!,
      type: logoForm.type || 'image',
      imageUrl: logoForm.imageUrl,
      text: logoForm.text,
      textStyle: logoForm.textStyle,
      linkUrl: logoForm.linkUrl || '',
      enabled: logoForm.enabled ?? true
    };

    let newLogos;
    if (editingLogo) {
      newLogos = config.logos.map(item =>
        item.id === newItem.id ? newItem : item
      );
    } else {
      newLogos = [...config.logos, newItem];
    }

    setConfig({
      ...config,
      logos: newLogos
    });

    setLogoDialogOpen(false);
    toast.success(editingLogo ? 'LOGO更新成功' : 'LOGO添加成功');
  };

  const deleteLogo = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      logos: config.logos.filter(item => item.id !== id)
    });
    toast.success('LOGO删除成功');
  };

  // 获取启用的轮播图
  const enabledCarousels = config?.carousels.filter(c => c.enabled).sort((a, b) => a.order - b.order) || [];

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  if (!config) {
    return <div className="p-6">加载配置失败</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">首页配置</h1>
          <p className="text-muted-foreground">管理首页轮播图、LOGO和文案</p>
        </div>
        <Button onClick={saveConfig}>
          <Save className="mr-2 h-4 w-4" />
          保存配置
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="carousel">轮播图</TabsTrigger>
          <TabsTrigger value="logo">LOGO管理</TabsTrigger>
          <TabsTrigger value="footer">备案信息</TabsTrigger>
        </TabsList>

        {/* 轮播图管理 */}
        <TabsContent value="carousel" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>轮播图管理</CardTitle>
                  <CardDescription>管理首页展示的轮播图，按顺序显示</CardDescription>
                </div>
                <Dialog open={carouselDialogOpen} onOpenChange={setCarouselDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openCarouselDialog()}>
                      <ImagePlus className="mr-2 h-4 w-4" />
                      添加轮播图
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCarousel ? '编辑轮播图' : '添加轮播图'}</DialogTitle>
                      <DialogDescription>填写轮播图信息</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="carousel-title">标题 *</Label>
                        <Input
                          id="carousel-title"
                          value={carouselForm.title}
                          onChange={(e) => setCarouselForm({ ...carouselForm, title: e.target.value })}
                          placeholder="输入轮播图标题"
                        />
                      </div>
                      <div>
                        <Label htmlFor="carousel-description">描述</Label>
                        <Textarea
                          id="carousel-description"
                          value={carouselForm.description}
                          onChange={(e) => setCarouselForm({ ...carouselForm, description: e.target.value })}
                          placeholder="输入轮播图描述"
                        />
                      </div>
                      <div>
                        <Label htmlFor="carousel-image">上传图片 *</Label>
                        <div className="space-y-2">
                          <input
                            id="carousel-image"
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadingImage(true);
                                try {
                                  const imageUrl = await uploadImage(file);
                                  setCarouselForm({ ...carouselForm, imageUrl });
                                  toast.success('图片上传成功');
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : '上传失败');
                                } finally {
                                  setUploadingImage(false);
                                }
                              }
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p>推荐比例：21:9 或 16:9</p>
                              <p>推荐分辨率：1920x810 (21:9) 或 1920x1080 (16:9)</p>
                              <p>最大文件大小：5MB</p>
                            </div>
                          </div>
                          {uploadingImage && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              正在上传...
                            </div>
                          )}
                          {carouselForm.imageUrl && (
                            <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                              <img src={carouselForm.imageUrl} alt="预览" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="carousel-link">链接地址</Label>
                        <Input
                          id="carousel-link"
                          value={carouselForm.linkUrl}
                          onChange={(e) => setCarouselForm({ ...carouselForm, linkUrl: e.target.value })}
                          placeholder="输入链接地址（可选）"
                        />
                      </div>
                      <div>
                        <Label htmlFor="carousel-order">排序</Label>
                        <Input
                          id="carousel-order"
                          type="number"
                          value={carouselForm.order}
                          onChange={(e) => setCarouselForm({ ...carouselForm, order: parseInt(e.target.value) })}
                          placeholder="数字越小越靠前"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="carousel-enabled"
                          checked={carouselForm.enabled}
                          onCheckedChange={(checked) => setCarouselForm({ ...carouselForm, enabled: checked })}
                        />
                        <Label htmlFor="carousel-enabled">启用</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setCarouselDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={saveCarousel}>
                          {editingCarousel ? '更新' : '添加'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.carousels.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <div className="w-48 h-32 bg-muted rounded overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          暂无图片
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.title}</h3>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded">排序: {item.order}</span>
                        {!item.enabled && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">已禁用</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground">链接: {item.linkUrl || '无'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openCarouselDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteCarousel(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {config.carousels.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无轮播图，点击上方按钮添加
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 轮播图预览 */}
          {enabledCarousels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  前端预览效果
                </CardTitle>
                <CardDescription>预览启用的轮播图在首页的实际展示效果</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-xl bg-gray-900 aspect-[21/9] md:aspect-[16/9]">
                  {enabledCarousels.map((carousel, index) => (
                    <div
                      key={carousel.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${index === 0 ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {carousel.imageUrl && (
                        <img
                          src={carousel.imageUrl}
                          alt={carousel.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                        <h2 className="text-3xl md:text-4xl font-bold mb-2">{carousel.title}</h2>
                        {carousel.description && (
                          <p className="text-lg text-gray-200">{carousel.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>当前预览显示第1张轮播图，实际首页会按顺序轮播展示</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* LOGO管理 */}
        <TabsContent value="logo" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>LOGO管理</CardTitle>
                  <CardDescription>管理首页显示的LOGO</CardDescription>
                </div>
                <Dialog open={logoDialogOpen} onOpenChange={setLogoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openLogoDialog()}>
                      <Upload className="mr-2 h-4 w-4" />
                      添加LOGO
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingLogo ? '编辑LOGO' : '添加LOGO'}</DialogTitle>
                      <DialogDescription>填写LOGO信息</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="logo-name">名称 *</Label>
                        <Input
                          id="logo-name"
                          value={logoForm.name}
                          onChange={(e) => setLogoForm({ ...logoForm, name: e.target.value })}
                          placeholder="输入LOGO名称"
                        />
                      </div>
                      <div>
                        <Label htmlFor="logo-type">LOGO类型 *</Label>
                        <Select
                          value={logoForm.type}
                          onValueChange={(value: 'image' | 'text') => setLogoForm({ ...logoForm, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择LOGO类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image">
                              <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                图片LOGO
                              </div>
                            </SelectItem>
                            <SelectItem value="text">
                              <div className="flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                文字LOGO
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {logoForm.type === 'image' ? (
                        <div>
                          <Label htmlFor="logo-image">上传图片 *</Label>
                          <div className="space-y-2">
                            <input
                              id="logo-image"
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadingLogo(true);
                                  try {
                                    const imageUrl = await uploadImage(file);
                                    setLogoForm({ ...logoForm, imageUrl });
                                    toast.success('图片上传成功');
                                  } catch (error) {
                                    toast.error(error instanceof Error ? error.message : '上传失败');
                                  } finally {
                                    setUploadingLogo(false);
                                  }
                                }
                              }}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p>推荐比例：1:1 (正方形)</p>
                                <p>推荐分辨率：128x128 或 256x256</p>
                                <p>最大文件大小：5MB</p>
                              </div>
                            </div>
                            {uploadingLogo && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                正在上传...
                              </div>
                            )}
                            {logoForm.imageUrl && (
                              <div className="relative aspect-square w-32 overflow-hidden rounded-md border mx-auto">
                                <img src={logoForm.imageUrl} alt="预览" className="w-full h-full object-contain" />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="logo-text">文字内容 *</Label>
                            <Input
                              id="logo-text"
                              value={logoForm.text || ''}
                              onChange={(e) => setLogoForm({ ...logoForm, text: e.target.value })}
                              placeholder="输入LOGO文字"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="logo-font-size">字体大小</Label>
                              <Select
                                value={logoForm.textStyle?.fontSize || '2xl'}
                                onValueChange={(value) => setLogoForm({
                                  ...logoForm,
                                  textStyle: { ...logoForm.textStyle, fontSize: value }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="xl">大</SelectItem>
                                  <SelectItem value="2xl">特大</SelectItem>
                                  <SelectItem value="3xl">超大</SelectItem>
                                  <SelectItem value="4xl">巨大</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="logo-font-weight">字体粗细</Label>
                              <Select
                                value={logoForm.textStyle?.fontWeight || 'bold'}
                                onValueChange={(value) => setLogoForm({
                                  ...logoForm,
                                  textStyle: { ...logoForm.textStyle, fontWeight: value }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">常规</SelectItem>
                                  <SelectItem value="medium">中等</SelectItem>
                                  <SelectItem value="bold">粗体</SelectItem>
                                  <SelectItem value="extrabold">超粗</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>预览</Label>
                            <div className="mt-2 p-4 border rounded-lg bg-white">
                              <p
                                className={`text-${logoForm.textStyle?.fontSize || '2xl'} font-${logoForm.textStyle?.fontWeight || 'bold'}`}
                                style={{ backgroundImage: 'linear-gradient(to right, rgb(37, 99, 235), rgb(59, 130, 246))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                              >
                                {logoForm.text || 'LOGO文字预览'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="logo-link">链接地址</Label>
                        <Input
                          id="logo-link"
                          value={logoForm.linkUrl}
                          onChange={(e) => setLogoForm({ ...logoForm, linkUrl: e.target.value })}
                          placeholder="输入链接地址（可选）"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="logo-enabled"
                          checked={logoForm.enabled}
                          onCheckedChange={(checked) => setLogoForm({ ...logoForm, enabled: checked })}
                        />
                        <Label htmlFor="logo-enabled">启用</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setLogoDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={saveLogo}>
                          {editingLogo ? '更新' : '添加'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.logos.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-24 h-24 bg-muted rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.type === 'text' ? (
                        <p
                          className={`text-${item.textStyle?.fontSize || '2xl'} font-${item.textStyle?.fontWeight || 'bold'}`}
                          style={{
                            background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                        >
                          {item.text}
                        </p>
                      ) : item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-muted-foreground text-sm">
                          暂无图片
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded">
                          {item.type === 'text' ? '文字' : '图片'}
                        </span>
                        {!item.enabled && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">已禁用</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.type === 'text' ? `文字: ${item.text}` : `链接: ${item.linkUrl || '无'}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openLogoDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteLogo(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {config.logos.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无LOGO，点击上方按钮添加
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 备案信息管理 */}
        <TabsContent value="footer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>备案信息管理</CardTitle>
              <CardDescription>管理网站底部的备案信息，包括版权声明、ICP备案号等</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="copyright">版权信息 *</Label>
                <Textarea
                  id="copyright"
                  value={config?.footerInfo?.copyright || ''}
                  onChange={(e) => setConfig({
                    ...config!,
                    footerInfo: { ...config!.footerInfo, copyright: e.target.value }
                  })}
                  placeholder="请输入版权信息"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="icpNumber">ICP备案号 *</Label>
                <Input
                  id="icpNumber"
                  value={config?.footerInfo?.icpNumber || ''}
                  onChange={(e) => setConfig({
                    ...config!,
                    footerInfo: { ...config!.footerInfo, icpNumber: e.target.value }
                  })}
                  placeholder="请输入ICP备案号，如：京ICP备12345678号-1"
                />
              </div>

              <div>
                <Label htmlFor="publicSecurityNumber">公网安备号 *</Label>
                <Input
                  id="publicSecurityNumber"
                  value={config?.footerInfo?.publicSecurityNumber || ''}
                  onChange={(e) => setConfig({
                    ...config!,
                    footerInfo: { ...config!.footerInfo, publicSecurityNumber: e.target.value }
                  })}
                  placeholder="请输入公网安备号，如：京公网安备 11010802012345号"
                />
              </div>

              <div>
                <Label htmlFor="otherInfo">其他信息（可选）</Label>
                <Textarea
                  id="otherInfo"
                  value={config?.footerInfo?.otherInfo || ''}
                  onChange={(e) => setConfig({
                    ...config!,
                    footerInfo: { ...config!.footerInfo, otherInfo: e.target.value }
                  })}
                  placeholder="请输入其他信息"
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">预览效果</h4>
                <div className="bg-muted/20 p-4 rounded-lg text-center text-xs text-muted-foreground">
                  <p className="mb-1">{config?.footerInfo?.copyright || '版权信息'}</p>
                  <p className="text-muted-foreground">
                    {config?.footerInfo?.icpNumber && (
                      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">
                        {config.footerInfo.icpNumber}
                      </a>
                    )}
                    {config?.footerInfo?.icpNumber && config?.footerInfo?.publicSecurityNumber && ' | '}
                    {config?.footerInfo?.publicSecurityNumber && (
                      <a href="http://www.beian.gov.cn/portal/registerSystemInfo" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">
                        {config.footerInfo.publicSecurityNumber}
                      </a>
                    )}
                    {config?.footerInfo?.otherInfo && (
                      <>
                        {config.footerInfo.icpNumber || config.footerInfo.publicSecurityNumber ? ' | ' : ''}
                        <span>{config.footerInfo.otherInfo}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
