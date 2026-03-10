const https = require('http');
const httpsModule = require('https');

// 多个IP检测服务
const ipServices = [
  'https://api.ipify.org?format=json',
  'https://icanhazip.com',
  'https://ipecho.net/plain',
  'https://checkip.amazonaws.com'
];

async function getIP(service) {
  return new Promise((resolve, reject) => {
    const client = service.startsWith('https') ? httpsModule : http;
    client.get(service, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.ip || data.trim());
        } catch (e) {
          resolve(data.trim());
        }
      });
    }).on('error', (err) => {
      reject(err);
    }).setTimeout(5000, () => {
      reject(new Error('Timeout'));
    });
  });
}

async function getIPWithRetry() {
  for (const service of ipServices) {
    try {
      const ip = await getIP(service);
      if (ip && ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
        return ip;
      }
    } catch (err) {
      console.log(`  服务失败: ${service}`);
    }
  }
  throw new Error('所有IP检测服务都失败了');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('开始检测IP变化...\n');
  console.log('='.repeat(80));
  console.log('说明: 将使用多个IP检测服务轮询检测，确保准确性');
  console.log('='.repeat(80));
  
  const ips = new Map(); // 使用Map记录IP出现次数和时间
  const attempts = 20; // 检测20次
  const interval = 3000; // 每3秒检测一次
  
  for (let i = 1; i <= attempts; i++) {
    try {
      const ip = await getIPWithRetry();
      const timestamp = new Date().toLocaleString('zh-CN');
      
      console.log(`#${i.toString().padStart(2, '0')} [${timestamp}] IP: ${ip}`);
      
      if (ips.has(ip)) {
        ips.set(ip, {
          count: ips.get(ip).count + 1,
          firstSeen: ips.get(ip).firstSeen,
          lastSeen: timestamp
        });
      } else {
        ips.set(ip, {
          count: 1,
          firstSeen: timestamp,
          lastSeen: timestamp
        });
      }
    } catch (err) {
      const timestamp = new Date().toLocaleString('zh-CN');
      console.log(`#${i.toString().padStart(2, '0')} [${timestamp}] 检测失败: ${err.message}`);
    }
    
    if (i < attempts) {
      await sleep(interval);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('检测结果:');
  console.log(`检测次数: ${attempts}`);
  console.log(`发现唯一IP数量: ${ips.size}`);
  console.log('\nIP详情:');
  console.log('-'.repeat(80));
  
  ips.forEach((data, ip) => {
    console.log(`IP: ${ip}`);
    console.log(`  出现次数: ${data.count}`);
    console.log(`  首次发现: ${data.firstSeen}`);
    console.log(`  最后发现: ${data.lastSeen}`);
    console.log();
  });
  
  console.log('='.repeat(80));
  console.log('建议操作:');
  console.log('1. 将以上所有IP添加到微信小程序后台的IP白名单');
  console.log('2. 白名单位置: 微信公众平台 -> 开发 -> 开发管理 -> 开发设置 -> 服务器域名');
  console.log('3. 选择"uploadFile合法域名"或"request合法域名"添加IP');
  console.log('='.repeat(80));
}

main();
