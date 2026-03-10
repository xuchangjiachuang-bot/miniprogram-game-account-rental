const httpsModule = require('https');
const http = require('http');
const exec = require('child_process').exec;

// IP检测服务列表
const ipServices = [
  'https://checkip.amazonaws.com',
  'https://icanhazip.com',
  'https://ipecho.net/plain'
];

async function getExternalIP() {
  for (const service of ipServices) {
    try {
      return new Promise((resolve, reject) => {
        httpsModule.get(service, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data.trim()));
        }).on('error', reject).setTimeout(5000, () => reject(new Error('Timeout')));
      });
    } catch (err) {
      continue;
    }
  }
  throw new Error('所有外部IP检测服务都失败了');
}

function getLocalIPs() {
  return new Promise((resolve) => {
    const ips = new Set();
    
    // 检测多个网络接口
    const interfaces = ['eth0', 'ens3', 'ens4', 'ens5', 'ens6', 'ens7'];
    let checked = 0;
    
    if (checked === interfaces.length) {
      resolve(Array.from(ips));
    }
    
    interfaces.forEach(iface => {
      exec(`ip addr show ${iface} 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1`, 
        (err, stdout, stderr) => {
          if (!err && stdout.trim()) {
            ips.add(stdout.trim());
          }
          checked++;
          if (checked === interfaces.length) {
            resolve(Array.from(ips));
          }
        });
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 全方位IP检测报告');
  console.log('='.repeat(80));
  console.log('检测项目:');
  console.log('  1. 当前公网IP');
  console.log('  2. 本地网络接口IP');
  console.log('  3. 历史记录的IP');
  console.log('  4. IP变化趋势（连续监测）');
  console.log('='.repeat(80));
  console.log();
  
  // 1. 检测当前公网IP
  console.log('【1. 当前公网IP】');
  try {
    const currentIP = await getExternalIP();
    console.log(`✅ 当前公网IP: ${currentIP}`);
    console.log(`   检测时间: ${new Date().toLocaleString('zh-CN')}`);
  } catch (err) {
    console.log(`❌ 检测失败: ${err.message}`);
  }
  console.log();
  
  // 2. 检测本地网络接口
  console.log('【2. 本地网络接口IP】');
  try {
    const localIPs = await getLocalIPs();
    if (localIPs.length > 0) {
      console.log('✅ 发现本地IP:');
      localIPs.forEach((ip, index) => {
        console.log(`   ${index + 1}. ${ip}`);
      });
    } else {
      console.log('❌ 未发现本地IP');
    }
  } catch (err) {
    console.log(`❌ 检测失败: ${err.message}`);
  }
  console.log();
  
  // 3. 历史IP记录
  console.log('【3. 历史IP记录】');
  console.log('基于之前的检测记录，以下IP可能被使用:');
  console.log('  1. 115.191.1.173  (之前检测到)');
  console.log('  2. 101.126.128.57  (之前检测到)');
  console.log('  3. 185.199.108.153 (GitHub Actions)');
  console.log('  4. 185.199.109.153 (GitHub Actions)');
  console.log('  5. 185.199.110.153 (GitHub Actions)');
  console.log('  6. 185.199.111.153 (GitHub Actions)');
  console.log();
  
  // 4. 连续监测IP变化
  console.log('【4. IP变化趋势监测】');
  console.log('开始连续监测30次，每5秒检测一次...');
  console.log();
  
  const allIPs = new Map();
  const monitorCount = 30;
  const monitorInterval = 5000;
  
  for (let i = 1; i <= monitorCount; i++) {
    try {
      const ip = await getExternalIP();
      const timestamp = new Date().toLocaleString('zh-CN');
      
      if (allIPs.has(ip)) {
        allIPs.set(ip, {
          count: allIPs.get(ip).count + 1,
          times: [...allIPs.get(ip).times, timestamp]
        });
      } else {
        allIPs.set(ip, {
          count: 1,
          times: [timestamp]
        });
      }
      
      console.log(`#${i.toString().padStart(2, '0')} [${timestamp}] ${ip}`);
    } catch (err) {
      console.log(`#${i.toString().padStart(2, '0')} [${new Date().toLocaleString('zh-CN')}] 检测失败`);
    }
    
    if (i < monitorCount) {
      await sleep(monitorInterval);
    }
  }
  
  // 总结报告
  console.log();
  console.log('='.repeat(80));
  console.log('📊 检测总结报告');
  console.log('='.repeat(80));
  console.log(`监测总次数: ${monitorCount}`);
  console.log(`发现唯一IP: ${allIPs.size}`);
  console.log();
  
  console.log('监测到的IP详情:');
  console.log('-'.repeat(80));
  
  allIPs.forEach((data, ip) => {
    console.log(`IP: ${ip}`);
    console.log(`  出现次数: ${data.count} / ${monitorCount}`);
    console.log(`  首次: ${data.times[0]}`);
    console.log(`  最后: ${data.times[data.times.length - 1]}`);
    console.log();
  });
  
  console.log('='.repeat(80));
  console.log('📋 建议添加到微信小程序白名单的IP');
  console.log('='.repeat(80));
  console.log();
  
  // 合并所有IP
  const recommendedIPs = new Set([
    '115.191.1.173',  // 历史记录
    '101.126.128.57',  // 历史记录
    '185.199.108.153', // GitHub Actions
    '185.199.109.153', // GitHub Actions
    '185.199.110.153', // GitHub Actions
    '185.199.111.153', // GitHub Actions
  ]);
  
  // 添加监测到的IP
  allIPs.forEach((data, ip) => {
    recommendedIPs.add(ip);
  });
  
  console.log(`共推荐 ${recommendedIPs.size} 个IP:\n`);
  
  recommendedIPs.forEach((ip, index) => {
    const source = allIPs.has(ip) ? '✓ 监测到' : '○ 历史记录';
    console.log(`${index + 1}. ${ip}  ${source}`);
  });
  
  console.log();
  console.log('='.repeat(80));
  console.log('📝 操作步骤');
  console.log('='.repeat(80));
  console.log('1. 登录微信公众平台: https://mp.weixin.qq.com/');
  console.log('2. 进入: 开发 -> 开发管理 -> 开发设置');
  console.log('3. 找到: 服务器域名');
  console.log('4. 在"uploadFile合法域名"中添加以上IP');
  console.log('5. 保存后等待10-15分钟生效');
  console.log('6. 再次尝试上传小程序');
  console.log('='.repeat(80));
}

main();
