// Firebase Admin SDK — server-side only (API routes)
// 用於驗證 ID Token 和管理 custom claims
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminFirestore: Firestore | null = null;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;

  if (getApps().length > 0) {
    _adminApp = getApps()[0];
    return _adminApp;
  }

  // 支援兩種格式：
  // 1. FIREBASE_SERVICE_ACCOUNT_KEY（完整 JSON）
  // 2. FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL（分開的，同 Railway）
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw) {
    const serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    _adminApp = initializeApp({ credential: cert(serviceAccount) });
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      throw new Error(
        '缺少 Firebase Admin 設定。需要 FIREBASE_SERVICE_ACCOUNT_KEY（JSON）或 FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL'
      );
    }

    _adminApp = initializeApp({
      credential: cert({ projectId, privateKey, clientEmail }),
    });
  }

  return _adminApp;
}

export function getAdminAuth(): Auth {
  if (_adminAuth) return _adminAuth;
  _adminAuth = getAuth(getAdminApp());
  return _adminAuth;
}

export function getAdminFirestore(): Firestore {
  if (_adminFirestore) return _adminFirestore;
  _adminFirestore = getFirestore(getAdminApp());
  return _adminFirestore;
}

/**
 * 驗證 Firebase ID Token 並檢查 admin claim
 * @returns 解碼後的 token（含 uid, email, admin 等）
 * @throws 非 admin 或 token 無效時拋出錯誤
 */
export async function verifyAdminToken(idToken: string) {
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);

  if (!decoded.admin) {
    throw new Error('NOT_ADMIN');
  }

  return decoded;
}
