import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 上传微信支付证书文件并解析证书信息
 * POST /api/admin/payment/cert-upload
 *
 * 支持的文件类型：
 * - apiclient_cert.p12 (.p12 格式)
 * - apiclient_cert.pem (.pem 格式)
 * - apiclient_key.pem (.pem 格式)
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: '请选择文件' }, { status: 400 });
    }

    // 验证文件类型
    const filename = file.name;
    const ext = path.extname(filename).toLowerCase();

    const allowedExtensions = ['.p12', '.pem'];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: '仅支持 .p12 和 .pem 格式的文件' },
        { status: 400 }
      );
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '文件大小不能超过 5MB' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 创建证书目录
    const certDir = path.join(process.cwd(), 'certs', 'wechat');
    if (!existsSync(certDir)) {
      await mkdir(certDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const savedFilename = `wechat_${timestamp}${ext}`;
    const filepath = path.join(certDir, savedFilename);

    // 保存文件
    await writeFile(filepath, buffer);

    // 解析证书信息
    let certInfo = {
      type: '',
      path: filepath,
      serialNumber: '',
      subject: '',
      issuer: '',
      validFrom: '',
      validTo: '',
    };

    try {
      if (ext === '.p12') {
        // .p12 证书解析暂时不支持，请使用 .pem 证书
        return NextResponse.json({
          success: false,
          error: '.p12 证书格式暂不支持，请上传 .pem 证书'
        }, { status: 400 });
      } else if (ext === '.pem') {
        // 解析 .pem 证书
        const cert = new crypto.X509Certificate(buffer);
        certInfo.type = 'pem';
        certInfo.serialNumber = cert.serialNumber || '';
        certInfo.subject = cert.subject || '';
        certInfo.issuer = cert.issuer || '';
        certInfo.validFrom = cert.validFrom || '';
        certInfo.validTo = cert.validTo || '';

        // 检查是否是私钥文件
        const pemContent = buffer.toString('utf-8');
        if (pemContent.includes('PRIVATE KEY')) {
          certInfo.type = 'private_key';
        } else {
          certInfo.type = 'certificate';
        }
      }

      return NextResponse.json({
        success: true,
        data: certInfo,
        message: '证书上传成功',
      });
    } catch (parseError: any) {
      // 解析失败，但文件已保存
      console.error('证书解析失败:', parseError);
      return NextResponse.json({
        success: true,
        data: {
          ...certInfo,
          path: filepath,
          type: ext === '.p12' ? 'p12' : 'pem',
        },
        message: '证书上传成功，但无法解析证书信息',
        warning: parseError.message,
      });
    }
  } catch (error: any) {
    console.error('证书上传失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '证书上传失败' },
      { status: 500 }
    );
  }
}
