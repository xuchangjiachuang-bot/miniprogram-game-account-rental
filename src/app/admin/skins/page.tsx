'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, Search } from 'lucide-react';
import { SkinOption, HomepageConfig } from '@/lib/config-types';

export default function SkinOptionsPage() {
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // 皮肤编辑状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkin, setEditingSkin] = useState<SkinOption | null>(null);
  const [skinForm, setSkinForm] = useState<Partial<SkinOption>>({
    name: '',
    iconUrl: '',
    category: '',
    enabled: true
  });

  // 根据皮肤名称生成首字母代码
  const generateSkinCode = (name: string): string => {
    if (!name) return '';

    // 提取中文字符的首字母拼音
    const pinyinMap: { [key: string]: string } = {
      '雷': 'LEI', '神': 'SHEN', '火': 'HUO', '麒': 'QI', '麟': 'LIN',
      '天': 'TIAN', '龙': 'LONG', '毁': 'HUI', '灭': 'MIE', '修': 'XIU',
      '罗': 'LUO', '黑': 'HEI', '骑': 'QI', '士': 'SHI', '烈': 'LIE',
      '幻': 'HUAN', '枪': 'QIANG', '刀': 'DAO', '剑': 'JIAN', '弓': 'GONG',
      '弩': 'NU', '斧': 'FU', '锤': 'CHUI', '棒': 'BANG', '棍': 'GUN',
      '刺': 'CI', '盾': 'DUN', '盔': 'KUI', '甲': 'JIA', '战': 'ZHAN',
      '斗': 'DOU', '法': 'FA', '师': 'SHI', '盗': 'DAO',
      '贼': 'ZEI', '牧': 'MU', '德': 'DE', '象': 'XIANG'
    };

    // 处理英文字母和数字
    let code = name.split('').map(char => {
      if (/^[a-zA-Z0-9]$/.test(char)) {
        return char.toUpperCase();
      }
      // 中文字符转换为拼音首字母
      if (pinyinMap[char]) {
        return pinyinMap[char].charAt(0);
      }
      // 其他字符（如连字符、下划线等）
      if (/[\-_]/.test(char)) {
        return '_';
      }
      return '';
    }).join('');

    // 移除连续的下划线
    code = code.replace(/_+/g, '_');

    return code || name.substring(0, 10).toUpperCase();
  };

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
    try {
      const res = await fetch('/api/admin/homepage-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const result = await res.json();
      if (result.success) {
        toast.success('配置保存成功');
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存配置失败');
    }
  };

  const openDialog = (item?: SkinOption) => {
    if (item) {
      setEditingSkin(item);
      setSkinForm({ ...item });
    } else {
      setEditingSkin(null);
      setSkinForm({
        name: '',
        iconUrl: '',
        category: '',
        enabled: true
      });
    }
    setDialogOpen(true);
  };

  const saveSkin = () => {
    if (!skinForm.name) {
      toast.error('请填写皮肤名称');
      return;
    }

    if (!config) return;

    // 自动生成皮肤代码
    const autoCode = generateSkinCode(skinForm.name!);

    const newItem: SkinOption = {
      id: editingSkin?.id || Date.now().toString(),
      name: skinForm.name!,
      code: autoCode,
      iconUrl: skinForm.iconUrl || '',
      category: skinForm.category || '',
      enabled: skinForm.enabled ?? true,
      createdAt: editingSkin?.createdAt || new Date().toISOString()
    };

    let newSkinOptions;
    if (editingSkin) {
      newSkinOptions = config.skinOptions.map(item =>
        item.id === newItem.id ? newItem : item
      );
    } else {
      newSkinOptions = [...config.skinOptions, newItem];
    }

    setConfig({
      ...config,
      skinOptions: newSkinOptions
    });

    setDialogOpen(false);
    toast.success(editingSkin ? '皮肤选项更新成功' : '皮肤选项添加成功');
  };

  const deleteSkin = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      skinOptions: config.skinOptions.filter(item => item.id !== id)
    });
    toast.success('皮肤选项删除成功');
  };

  const toggleSkinEnabled = (id: string, enabled: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      skinOptions: config.skinOptions.map(item =>
        item.id === id ? { ...item, enabled } : item
      )
    });
    toast.success(enabled ? '皮肤已启用' : '皮肤已禁用');
  };

  // 过滤皮肤选项
  const filteredSkins = config?.skinOptions.filter(skin => {
    const matchesSearch = skin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (skin.code && skin.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || skin.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  // 获取所有分类
  const categories = ['all', ...Array.from(new Set(config?.skinOptions.map(s => s.category).filter(Boolean) || []))];

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
          <h1 className="text-3xl font-bold">皮肤选项管理</h1>
          <p className="text-muted-foreground">管理首页筛选和账号上架的皮肤选项</p>
        </div>
        <Button onClick={saveConfig}>
          保存配置
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>皮肤列表</CardTitle>
              <CardDescription>添加、编辑和删除皮肤选项</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加皮肤
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSkin ? '编辑皮肤' : '添加皮肤'}</DialogTitle>
                  <DialogDescription>填写皮肤信息</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="skin-name">皮肤名称 *</Label>
                    <Input
                      id="skin-name"
                      value={skinForm.name}
                      onChange={(e) => setSkinForm({ ...skinForm, name: e.target.value })}
                      placeholder="例如：M4A1-雷神"
                    />
                  </div>
                  {skinForm.name && (
                    <div>
                      <Label htmlFor="skin-code">皮肤代码（自动生成）</Label>
                      <Input
                        id="skin-code"
                        value={generateSkinCode(skinForm.name)}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="skin-category">分类</Label>
                    <Input
                      id="skin-category"
                      value={skinForm.category}
                      onChange={(e) => setSkinForm({ ...skinForm, category: e.target.value })}
                      placeholder="例如：步枪、狙击枪、手枪"
                    />
                  </div>
                  <div>
                    <Label htmlFor="skin-icon">图标URL</Label>
                    <Input
                      id="skin-icon"
                      value={skinForm.iconUrl}
                      onChange={(e) => setSkinForm({ ...skinForm, iconUrl: e.target.value })}
                      placeholder="输入图标图片URL（可选）"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="skin-enabled"
                      checked={skinForm.enabled}
                      onCheckedChange={(checked) => setSkinForm({ ...skinForm, enabled: checked })}
                    />
                    <Label htmlFor="skin-enabled">启用</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={saveSkin}>
                      {editingSkin ? '更新' : '添加'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索和过滤 */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索皮肤名称或代码..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? '所有分类' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* 皮肤列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkins.map((skin) => (
              <Card key={skin.id} className={!skin.enabled ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {skin.iconUrl ? (
                        <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                          <img src={skin.iconUrl} alt={skin.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-muted-foreground">
                          -
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{skin.name}</CardTitle>
                        {skin.code && (
                          <CardDescription className="text-xs">代码: {skin.code}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(skin)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSkin(skin.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">分类:</span>
                      <span className="font-medium">{skin.category || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">状态:</span>
                      <Switch
                        checked={skin.enabled}
                        onCheckedChange={(checked) => toggleSkinEnabled(skin.id, checked)}
                      />
                    </div>
                    {skin.createdAt && (
                      <div className="text-xs text-muted-foreground">
                        创建时间: {new Date(skin.createdAt).toLocaleString('zh-CN')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSkins.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm || categoryFilter !== 'all' ? '没有找到匹配的皮肤' : '暂无皮肤选项，点击上方按钮添加'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
