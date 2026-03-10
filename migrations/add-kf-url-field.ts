import { pool } from './db';

async function addKfUrlField() {
  const client = await pool.connect();

  try {
    // 检查字段是否已存在
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'wecom_customer_service'
      AND column_name = 'kf_url'
    `);

    if (checkResult.rows.length > 0) {
      console.log('kf_url 字段已存在，跳过迁移');
      return;
    }

    // 添加字段
    await client.query(`
      ALTER TABLE wecom_customer_service
      ADD COLUMN kf_url VARCHAR(500)
    `);

    await client.query(`
      COMMENT ON COLUMN wecom_customer_service.kf_url
      IS '企业微信客服链接，格式：https://work.weixin.qq.com/kfid/kfcXXXXX'
    `);

    console.log('✅ 成功添加 kf_url 字段');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addKfUrlField().catch(console.error);
