const { S3Storage } = require("coze-coding-dev-sdk");
const fs = require("fs");
const path = require("path");

async function uploadMiniprogram() {
  console.log('开始上传 miniprogram 到对象存储...\n');

  // 初始化 S3Storage
  const storage = new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    bucketName: process.env.COZE_BUCKET_NAME,
    region: "cn-beijing",
  });

  // 确保文件存在
  const tarFile = path.join(__dirname, "../miniprogram-latest.tar.gz");
  if (!fs.existsSync(tarFile)) {
    console.error('错误: miniprogram-latest.tar.gz 文件不存在');
    return;
  }

  console.log('文件信息:');
  console.log(`  路径: ${tarFile}`);
  console.log(`  大小: ${(fs.statSync(tarFile).size / 1024 / 1024).toFixed(2)} MB\n`);

  try {
    // 读取文件
    console.log('正在读取文件...');
    const fileContent = fs.readFileSync(tarFile);

    // 上传到对象存储
    console.log('正在上传到对象存储...');
    const key = await storage.uploadFile({
      fileContent: fileContent,
      fileName: "miniprogram.tar.gz",
      contentType: "application/gzip",
    });

    console.log(`✅ 上传成功！`);
    console.log(`  Key: ${key}\n`);

    // 生成预签名URL（7天有效期）
    console.log('正在生成下载链接...');
    const downloadUrl = await storage.generatePresignedUrl({
      key: key,
      expireTime: 604800, // 7天
    });

    console.log('\n' + '='.repeat(80));
    console.log('📥 下载链接');
    console.log('='.repeat(80));
    console.log(downloadUrl);
    console.log('='.repeat(80));
    console.log(`有效期: 7天`);
    console.log(`文件大小: ${(fs.statSync(tarFile).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('上传失败:', error.message);
    console.error(error);
  }
}

uploadMiniprogram();
