'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Plus, MoreHorizontal, Edit, Lock, Trash2, ToggleLeft, ToggleRight, Search, Filter, CheckCircle2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AdminHeader } from '@/components/admin-header';

interface Admin {
  id: string;
  username: string;
  realName: string;
  role: 'superadmin' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin/verification-requests';

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 创建管理员对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    realName: '',
    role: 'admin' as 'superadmin' | 'admin',
  });
  const [creating, setCreating] = useState(false);

  // 重置密码对话框
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // 获取当前管理员信息
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, [page, statusFilter, searchQuery]);

  // 获取当前登录的管理员信息
  const fetchCurrentAdmin = async () => {
    try {
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success) {
        setCurrentAdmin(result.data as Admin);
      } else {
        if (response.status === 401 || response.status === 403) {
          router.push('/admin/login');
        }
      }
    } catch (error) {
      console.error('获取当前管理员信息失败:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/admin/admin-users?${params}`, {
        credentials: 'include', // 确保浏览器发送 Cookie
      });
      const result = await response.json();

      if (result.success) {
        setAdmins(result.data);
        setTotal(result.total);

        // 获取当前登录的管理员信息
        fetchCurrentAdmin();
      } else {
        if (response.status === 401 || response.status === 403) {
          router.push('/admin/login');
        } else {
          alert(result.error || '获取管理员列表失败');
        }
      }
    } catch (error) {
      console.error('获取管理员列表失败:', error);
      alert('获取管理员列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password || !formData.realName) {
      alert('请填写所有必填字段');
      return;
    }

    if (formData.password.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert('管理员账号创建成功');
        setCreateDialogOpen(false);
        setFormData({ username: '', password: '', realName: '', role: 'admin' });
        fetchAdmins();
      } else {
        alert(result.error || '创建管理员账号失败');
      }
    } catch (error) {
      console.error('创建管理员账号失败:', error);
      alert('创建管理员账号失败');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (admin: Admin) => {
    try {
      const newStatus = admin.status === 'active' ? 'suspended' : 'active';

      const response = await fetch(`/api/admin/admin-users/${admin.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`管理员${newStatus === 'active' ? '启用' : '禁用'}成功`);
        fetchAdmins();
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAdmin || newPassword.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }

    setResettingPassword(true);
    try {
      const response = await fetch(`/api/admin/admin-users/${selectedAdmin.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        alert('密码重置成功');
        setResetPasswordDialogOpen(false);
        setNewPassword('');
        setSelectedAdmin(null);
      } else {
        alert(result.error || '密码重置失败');
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      alert('密码重置失败');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    try {
      const response = await fetch(`/api/admin/admin-users/${admin.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert('管理员删除成功');
        fetchAdmins();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const canManage = currentAdmin?.role === 'superadmin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white">
      <AdminHeader
        title="管理员账号管理"
        showAdminUsers={false}
      />

      <div className="container mx-auto p-6">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">管理员账号管理</CardTitle>
                <CardDescription className="text-purple-100">
                  {canManage ? '管理平台管理员账号' : '查看管理员账号列表'}
                </CardDescription>
              </div>
              {canManage && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-purple-600 hover:bg-purple-50">
                      <Plus className="mr-2 h-4 w-4" />
                      创建管理员
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleCreateAdmin}>
                      <DialogHeader>
                        <DialogTitle>创建管理员账号</DialogTitle>
                        <DialogDescription>
                          填写以下信息创建新的管理员账号
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="username">用户名 *</Label>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="请输入用户名"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">密码 *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="请输入密码（至少6位）"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="realName">真实姓名 *</Label>
                          <Input
                            id="realName"
                            value={formData.realName}
                            onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                            placeholder="请输入真实姓名"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">角色 *</Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value: 'superadmin' | 'admin') =>
                              setFormData({ ...formData, role: value })
                            }
                          >
                            <SelectTrigger id="role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">普通管理员</SelectItem>
                              <SelectItem value="superadmin">超级管理员</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateDialogOpen(false)}
                        >
                          取消
                        </Button>
                        <Button type="submit" disabled={creating}>
                          {creating ? '创建中...' : '创建'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* 筛选和搜索 */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="搜索用户名..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="suspended">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 管理员列表 */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-500">加载中...</p>
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无管理员账号</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>用户名</TableHead>
                      <TableHead>真实姓名</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      {canManage && <TableHead className="text-right">操作</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{admin.username}</TableCell>
                        <TableCell>{admin.realName}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              admin.role === 'superadmin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {admin.role === 'superadmin' ? '超级管理员' : '普通管理员'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {admin.status === 'active' ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-green-600">启用</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-red-600">禁用</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(admin.createdAt).toLocaleString('zh-CN')}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {admin.id !== currentAdmin?.id && admin.role !== 'superadmin' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleToggleStatus(admin)}
                                      className="cursor-pointer"
                                    >
                                      {admin.status === 'active' ? (
                                        <>
                                          <ToggleLeft className="mr-2 h-4 w-4" />
                                          禁用
                                        </>
                                      ) : (
                                        <>
                                          <ToggleRight className="mr-2 h-4 w-4" />
                                          启用
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedAdmin(admin);
                                        setResetPasswordDialogOpen(true);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Lock className="mr-2 h-4 w-4" />
                                      重置密码
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          className="cursor-pointer text-red-600"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          删除
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            确定要删除管理员 "{admin.realName}" 吗？此操作不可恢复。
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>取消</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteAdmin(admin)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            删除
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                                {admin.id === currentAdmin?.id && (
                                  <DropdownMenuItem disabled className="text-gray-400">
                                    不能操作自己
                                  </DropdownMenuItem>
                                )}
                                {admin.role === 'superadmin' && admin.id !== currentAdmin?.id && (
                                  <DropdownMenuItem disabled className="text-gray-400">
                                    不能操作超级管理员
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 分页 */}
            {total > pageSize && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  共 {total} 条记录，第 {page} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page * pageSize >= total}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 重置密码对话框 */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>重置密码</DialogTitle>
              <DialogDescription>
                为管理员 "{selectedAdmin?.realName}" 重置密码
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="newPassword">新密码 *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetPasswordDialogOpen(false);
                  setNewPassword('');
                  setSelectedAdmin(null);
                }}
              >
                取消
              </Button>
              <Button type="submit" disabled={resettingPassword}>
                {resettingPassword ? '重置中...' : '重置密码'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-500">加载中...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AdminUsersContent />
    </Suspense>
  );
}
