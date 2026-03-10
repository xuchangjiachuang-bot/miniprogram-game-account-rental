const https = require('https');

async function getIP() {
  return new Promise((resolve, reject) => {
    https.get('https://ifconfig.me', (res) => {
      let ip = '';
      res.on('data', chunk => ip += chunk);
      res.on('end', () => resolve(ip));
    }).on('error', (err) => reject(err));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('开始检测IP变化...\n');
  console.log('=' .repeat(80));
  
  const ips = new Set();
  const attempts = 20; // 检测20次
  const interval = 3000; // 每3秒检测一次
  
  for (let i = 1; i <= attempts; i++) {
    const ip = await getIP();
    const timestamp = new Date().toLocaleString('zh-CN');
    
    console.log(`#${i.toString().padStart(2, '0')} [${timestamp}] IP: ${ip}`);
    
    ips.add(ip);
    
    if (i < attempts) {
      await sleep(interval);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('检测结果:');
  console.log(`检测次数: ${attempts}`);
  console.log(`发现IP数量: ${ips.size}`);
  console.log('\n唯一IP列表:');
  ips.forEach((ip, index) => {
    console.log(`${index + 1}. ${ip}`);
  });
  console.log('\n建议将以上所有IP添加到微信小程序后台的IP白名单');
  console.log('='.repeat(80));
}

main();
