/**
 * BookingNotifier (web-admin 版本)
 *
 * 跟 backend/src/services/notification/BookingNotifier.ts 邏輯一致，
 * 只是用 web-admin 端的 DatabaseService / firebaseAdmin helper。
 *
 * 為什麼兩處複製？
 *   web-admin 跟 backend 都需要從各自的 API 路由發推播。各自直接連 Supabase + Firestore
 *   比走「web-admin → 呼 backend API → 發推」少一段網路躍點，也避免 backend 故障時
 *   web-admin 完全發不出推播。
 *
 * 字串來源：Supabase Storage `translations/push/{locale}.json`
 * 詳見 CLAUDE.md「i18n 翻譯系統」章節。
 */
import admin from 'firebase-admin';
import axios from 'axios';
import { DatabaseService } from '@/lib/supabase';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

type EventType = 'driver_assigned' | 'driver_confirmed' | 'driver_departed' | 'driver_arrived' | 'driver_changed';

interface PushString {
  title: string;
  body: string;
}

interface NotifyArgs {
  bookingId: string;
  recipientUserId: string; // Supabase users.id (UUID)
  eventType: EventType;
  vars?: Record<string, string>;
}

const SUPABASE_REF = process.env.SUPABASE_PROJECT_REF || 'vlyhwegpvpnjyocqmfqc';
const BASE_URL = `https://${SUPABASE_REF}.supabase.co/storage/v1/object/public/translations/push`;
const ACTIVE_LOCALES = [
  'zh_TW', 'zh_CN', 'en_US', 'ja_JP', 'ko_KR',
  'th_TH', 'ms_MY', 'es_ES', 'id_ID', 'tl_PH', 'vi_VN',
];
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const HARDCODED_FALLBACK: Record<EventType, PushString> = {
  driver_assigned: { title: '您有新派單', body: '訂單 #{shortId},請查看並確認接單' },
  driver_confirmed: { title: '司機已接單', body: '{driverName} 已接單,請等待司機出發' },
  driver_departed: { title: '司機已出發', body: '{driverName} 已出發前往上車地點' },
  driver_arrived: { title: '司機已到達', body: '{driverName} 已抵達上車地點,請準備上車' },
  driver_changed: { title: '司機已更換', body: '本訂單司機已更換為 {driverName},請與新司機聯絡' },
};

// Vercel serverless: 全域變數可能被冷啟動重置；用 module-level cache 就好
let i18nCache: Map<string, Record<string, PushString>> = new Map();
let i18nLastFetchedAt = 0;
let i18nFetchInFlight: Promise<void> | null = null;

async function ensureI18nLoaded(): Promise<void> {
  const stale = Date.now() - i18nLastFetchedAt > REFRESH_INTERVAL_MS;
  if (i18nCache.size > 0 && !stale) return;
  if (i18nFetchInFlight) {
    await i18nFetchInFlight;
    return;
  }
  i18nFetchInFlight = loadAllPushTranslations();
  try {
    await i18nFetchInFlight;
  } finally {
    i18nFetchInFlight = null;
  }
}

async function loadAllPushTranslations(): Promise<void> {
  await Promise.allSettled(
    ACTIVE_LOCALES.map(async (locale) => {
      const res = await axios.get(`${BASE_URL}/${locale}.json`, { timeout: 8000, responseType: 'json' });
      const cleaned: Record<string, PushString> = {};
      for (const [k, v] of Object.entries(res.data)) {
        if (k.startsWith('_')) continue;
        cleaned[k] = v as PushString;
      }
      i18nCache.set(locale, cleaned);
    })
  );
  i18nLastFetchedAt = Date.now();
}

function normalizeLocale(locale: string | null | undefined): string {
  if (!locale) return 'zh_TW';
  const normalized = locale.replace('-', '_');
  return ACTIVE_LOCALES.includes(normalized) ? normalized : 'zh_TW';
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function getPushText(eventType: EventType, locale: string | null | undefined, vars: Record<string, string>): PushString {
  const normalized = normalizeLocale(locale);
  const localeStrings = i18nCache.get(normalized) || i18nCache.get('en_US') || i18nCache.get('zh_TW');
  const raw = localeStrings?.[eventType] || HARDCODED_FALLBACK[eventType];
  return {
    title: interpolate(raw.title, vars),
    body: interpolate(raw.body, vars),
  };
}

export async function notifyBookingEvent(args: NotifyArgs): Promise<void> {
  const { bookingId, recipientUserId, eventType, vars = {} } = args;
  const logPrefix = `[BookingNotifier ${eventType} booking=${bookingId.slice(0, 8)}]`;

  try {
    const db = new DatabaseService(true);

    // 1. Supabase → firebase_uid + preferred_language
    const { data: user, error: userError } = await db.supabase
      .from('users')
      .select('firebase_uid, preferred_language')
      .eq('id', recipientUserId)
      .single();

    if (userError || !user) {
      console.warn(`${logPrefix} 找不到收件人 user：`, userError?.message || 'no row');
      return;
    }

    if (!user.firebase_uid) {
      console.warn(`${logPrefix} 收件人沒有 firebase_uid，跳過推播`);
      return;
    }

    // 2. Firestore → fcmToken
    const firestore = getAdminFirestore();
    const userDoc = await firestore.collection('users').doc(user.firebase_uid).get();

    if (!userDoc.exists) {
      console.warn(`${logPrefix} Firestore 沒有 users/${user.firebase_uid} 文件`);
      return;
    }

    const fcmToken = userDoc.data()?.fcmToken as string | undefined;
    if (!fcmToken) {
      console.warn(`${logPrefix} 收件人沒有 fcmToken（可能沒裝 app 或沒授權通知）`);
      return;
    }

    // 3. i18n 文案
    await ensureI18nLoaded();
    const { title, body } = getPushText(eventType, user.preferred_language, vars);

    // 4. 發 FCM
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        type: eventType,
        bookingId,
        ...(vars.driverName ? { driverName: vars.driverName } : {}),
        ...(vars.shortId ? { shortId: vars.shortId } : {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'booking_events',
          priority: 'high',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
            contentAvailable: true,
            category: 'BOOKING_EVENT',
          },
        },
        headers: { 'apns-priority': '10' },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`${logPrefix} ✅ FCM sent:`, response);
  } catch (error: any) {
    console.error(`${logPrefix} ❌ 推播失敗：`, error?.message || error);

    if (
      error?.code === 'messaging/invalid-registration-token' ||
      error?.code === 'messaging/registration-token-not-registered'
    ) {
      try {
        const db = new DatabaseService(true);
        const { data: user } = await db.supabase
          .from('users')
          .select('firebase_uid')
          .eq('id', recipientUserId)
          .single();
        if (user?.firebase_uid) {
          await getAdminFirestore().collection('users').doc(user.firebase_uid).update({
            fcmToken: admin.firestore.FieldValue.delete(),
            fcmTokenDeletedAt: admin.firestore.FieldValue.serverTimestamp(),
            fcmTokenDeleteReason: 'Invalid or unregistered token',
          });
          console.log(`${logPrefix} 🧹 已清理失效 fcmToken`);
        }
      } catch (cleanupErr) {
        console.error(`${logPrefix} 清理失效 token 失敗：`, cleanupErr);
      }
    }
  }
}
