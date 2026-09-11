import Cookies from 'js-cookie';
import { FirebaseService } from '@/lib/firebase';

/**
 * 取得目前管理員的 Firebase ID Token（每次取新的）。
 *
 * backend 的後台 API（/api/admin/*、推廣人審核、司機推廣人管理）只接受管理員，
 * 會驗證這個 token 與 admin custom claim。Firebase ID Token 1 小時就過期，
 * 登入時存進 cookie 的那份會失效，所以優先向 Firebase SDK 取（SDK 會自動換新），
 * 取不到時才退回登入時存的那份。
 */
export async function getAdminIdToken(): Promise<string | null> {
  try {
    const user = (await FirebaseService.getCurrentUser()) as any;
    if (user && typeof user.getIdToken === 'function') {
      return await user.getIdToken();
    }
  } catch {
    // Firebase 尚未初始化或取不到使用者：改用登入時存的 token
  }

  if (typeof window === 'undefined') return null;
  return Cookies.get('admin_token') || localStorage.getItem('admin_token');
}

/**
 * fetch 包裝：自動附上管理員憑證（覆蓋呼叫端自帶的 Authorization）。
 * 呼叫 backend 後台 API 一律用這個。
 */
export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getAdminIdToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
