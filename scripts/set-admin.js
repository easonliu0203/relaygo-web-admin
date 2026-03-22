#!/usr/bin/env node
/**
 * 管理員權限管理 Script
 *
 * 用法：
 *   node scripts/set-admin.js add kyle@relaygo.com     # 新增管理員
 *   node scripts/set-admin.js remove someone@email.com  # 移除管理員
 *   node scripts/set-admin.js check kyle@relaygo.com    # 檢查是否為管理員
 *   node scripts/set-admin.js list                      # 列出所有管理員（從 Firebase 搜尋）
 *
 * 需要環境變數 FIREBASE_SERVICE_ACCOUNT_KEY（JSON 字串）
 * 或者在 web-admin/.env.local 中設定
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

// 載入 .env 檔案
function loadEnv() {
  // 優先載入 backend/.env（有正確的 Firebase key），再載入 web-admin/.env.local
  const envPaths = [
    path.join(__dirname, '..', '..', 'backend', '.env'),
    path.join(__dirname, '..', '.env.local'),
  ];
  for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) {
        // 去掉首尾引號
        process.env[key] = val.replace(/^["']|["']$/g, '');
      }
    }
  }
  }
}

loadEnv();

// 初始化 Firebase Admin
function initAdmin() {
  if (getApps().length > 0) return getAuth();

  // 優先用分開的環境變數（backend/.env 格式，比較可靠）
  // 若沒有再用 FIREBASE_SERVICE_ACCOUNT_KEY（完整 JSON）
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) });
  } else {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (raw) {
      const serviceAccount = JSON.parse(raw);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      console.error('❌ 缺少 Firebase 設定');
      console.error('   需要 FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL');
      console.error('   或 FIREBASE_SERVICE_ACCOUNT_KEY（完整 JSON）');
      process.exit(1);
    }
  }
  return getAuth();
}

async function addAdmin(auth, email) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
    console.log(`✅ 已將 ${email} 設為管理員`);
    console.log(`   UID: ${user.uid}`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ 找不到帳號: ${email}`);
      console.error('   請先用 APP 或官網註冊此帳號');
    } else {
      console.error('❌ 錯誤:', err.message);
    }
  }
}

async function removeAdmin(auth, email) {
  try {
    const user = await auth.getUserByEmail(email);
    const claims = { ...user.customClaims };
    delete claims.admin;
    await auth.setCustomUserClaims(user.uid, claims);
    console.log(`✅ 已移除 ${email} 的管理員權限`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ 找不到帳號: ${email}`);
    } else {
      console.error('❌ 錯誤:', err.message);
    }
  }
}

async function checkAdmin(auth, email) {
  try {
    const user = await auth.getUserByEmail(email);
    const isAdmin = user.customClaims?.admin === true;
    console.log(`📋 ${email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   管理員: ${isAdmin ? '✅ 是' : '❌ 不是'}`);
    if (user.customClaims) {
      console.log(`   Custom Claims:`, JSON.stringify(user.customClaims));
    }
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ 找不到帳號: ${email}`);
    } else {
      console.error('❌ 錯誤:', err.message);
    }
  }
}

async function main() {
  const [,, action, email] = process.argv;

  if (!action || !['add', 'remove', 'check'].includes(action)) {
    console.log('用法:');
    console.log('  node scripts/set-admin.js add <email>     新增管理員');
    console.log('  node scripts/set-admin.js remove <email>  移除管理員');
    console.log('  node scripts/set-admin.js check <email>   檢查是否為管理員');
    process.exit(0);
  }

  if (!email) {
    console.error('❌ 請提供 email');
    process.exit(1);
  }

  const auth = initAdmin();

  switch (action) {
    case 'add':
      await addAdmin(auth, email);
      break;
    case 'remove':
      await removeAdmin(auth, email);
      break;
    case 'check':
      await checkAdmin(auth, email);
      break;
  }
}

main().catch(console.error);
