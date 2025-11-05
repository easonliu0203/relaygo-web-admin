#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const SERVICE_URL = 'http://localhost:3001';
const CHECK_INTERVAL = 30000; // 30秒檢查一次
const MAX_RESTART_ATTEMPTS = 3;

let restartAttempts = 0;
let serviceProcess = null;

// 檢查服務是否運行
function checkService() {
  return new Promise((resolve) => {
    const req = http.get(SERVICE_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 啟動服務
function startService() {
  console.log(`[${new Date().toLocaleString()}] 正在啟動管理後台服務...`);
  
  const projectRoot = path.join(__dirname, '..');
  serviceProcess = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });
  
  serviceProcess.on('exit', (code) => {
    console.log(`[${new Date().toLocaleString()}] 服務進程退出，代碼: ${code}`);
    serviceProcess = null;
    
    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
      restartAttempts++;
      console.log(`[${new Date().toLocaleString()}] 嘗試重新啟動 (${restartAttempts}/${MAX_RESTART_ATTEMPTS})...`);
      setTimeout(startService, 5000);
    } else {
      console.log(`[${new Date().toLocaleString()}] 達到最大重啟次數，停止監控`);
      process.exit(1);
    }
  });
  
  serviceProcess.on('error', (error) => {
    console.error(`[${new Date().toLocaleString()}] 服務啟動失敗:`, error);
  });
}

// 監控服務
async function monitorService() {
  const isRunning = await checkService();
  
  if (isRunning) {
    if (restartAttempts > 0) {
      console.log(`[${new Date().toLocaleString()}] 服務恢復正常`);
      restartAttempts = 0;
    }
  } else {
    console.log(`[${new Date().toLocaleString()}] 服務未運行，嘗試啟動...`);
    
    if (!serviceProcess) {
      startService();
    }
  }
}

// 優雅關閉
function gracefulShutdown() {
  console.log(`\n[${new Date().toLocaleString()}] 正在關閉服務監控...`);
  
  if (serviceProcess) {
    serviceProcess.kill('SIGTERM');
    setTimeout(() => {
      if (serviceProcess) {
        serviceProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  process.exit(0);
}

// 主程序
async function main() {
  console.log('========================================');
  console.log('    Relay GO 管理後台服務監控');
  console.log('========================================');
  console.log(`服務地址: ${SERVICE_URL}`);
  console.log(`檢查間隔: ${CHECK_INTERVAL / 1000}秒`);
  console.log(`最大重啟次數: ${MAX_RESTART_ATTEMPTS}`);
  console.log('========================================\n');
  
  // 註冊信號處理
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  
  // 初始檢查
  await monitorService();
  
  // 定期監控
  setInterval(monitorService, CHECK_INTERVAL);
}

main().catch(console.error);
