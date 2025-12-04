// Firebase 配置 - 僅在客戶端載入
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 服務 - 延遲載入
// 使用 getter 函數來確保總是返回最新的值
let _firebaseApp: any = null;
let _auth: any = null;
let _db: any = null;
let _storage: any = null;
let _messaging: any = null;

// 導出 getter 函數
export const getFirebaseApp = () => _firebaseApp;
export const getAuth = () => _auth;
export const getDb = () => _db;
export const getStorage = () => _storage;
export const getMessaging = () => _messaging;

// 為了向後相容，保留舊的導出方式（但使用 getter）
export const firebaseApp = new Proxy({} as any, {
  get: () => _firebaseApp,
});
export const auth = new Proxy({} as any, {
  get: () => _auth,
});
export const db = new Proxy({} as any, {
  get: () => _db,
});
export const storage = new Proxy({} as any, {
  get: () => _storage,
});
export const messaging = new Proxy({} as any, {
  get: () => _messaging,
});

// 初始化 Firebase (僅在客戶端)
export const initializeFirebase = async () => {
  // 只在伺服器端跳過
  if (typeof window === 'undefined') {
    console.log('⏭️ Firebase initialization skipped (server-side)');
    return;
  }

  // 如果已經完全初始化，直接返回
  if (_firebaseApp && _db && _auth) {
    console.log('✅ Firebase already initialized');
    return;
  }

  try {
    console.log('🔄 Initializing Firebase...');

    const { initializeApp, getApps } = await import('firebase/app');
    _firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    const { getAuth: getAuthFn } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');

    _auth = getAuthFn(_firebaseApp);
    _db = getFirestore(_firebaseApp);

    console.log('✅ Firebase initialized successfully', {
      hasApp: !!_firebaseApp,
      hasAuth: !!_auth,
      hasDb: !!_db,
      authCurrentUser: _auth?.currentUser?.email || 'not logged in'
    });

    // Storage 延遲載入 - 只在需要時才載入，避免 undici 相容性問題
    // storage 會在 initializeStorage() 中初始化

    // 嘗試載入 messaging (可能不支援)
    try {
      const { getMessaging, isSupported } = await import('firebase/messaging');
      if (await isSupported()) {
        _messaging = getMessaging(_firebaseApp);
        console.log('✅ Firebase messaging initialized');
      }
    } catch (error) {
      console.log('⏭️ Firebase messaging not supported');
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

// 初始化 Storage (僅在需要時呼叫)
// 注意：由於 undici 相容性問題，Storage 功能暫時停用
// 如需使用，請確保 Next.js 和 Firebase 版本相容
export const initializeStorage = async () => {
  throw new Error('Firebase Storage is currently disabled due to undici compatibility issues. Please use alternative file upload methods.');

  /*
  if (typeof window === 'undefined') return;
  if (_storage) return _storage;

  try {
    await initializeFirebase();
    const { getStorage } = await import('firebase/storage');
    _storage = getStorage(_firebaseApp);
    return _storage;
  } catch (error) {
    console.error('Firebase storage initialization failed:', error);
    throw error;
  }
  */
};

// 開發環境模擬器連接 (暫時停用)
// 在需要時可以啟用模擬器連接

// Firebase 輔助函數 - 簡化版本
export class FirebaseService {
  // 確保 Firebase 已初始化
  static async ensureInitialized() {
    if (!_firebaseApp) {
      await initializeFirebase();
    }
  }

  // 認證相關
  static async signInWithEmailAndPassword(email: string, password: string) {
    await this.ensureInitialized();
    if (!_auth) throw new Error('Firebase auth not initialized');

    const { signInWithEmailAndPassword } = await import('firebase/auth');
    return signInWithEmailAndPassword(_auth, email, password);
  }

  static async signOut() {
    await this.ensureInitialized();
    if (!_auth) throw new Error('Firebase auth not initialized');

    const { signOut } = await import('firebase/auth');
    return signOut(_auth);
  }

  static async getCurrentUser() {
    await this.ensureInitialized();
    if (!_auth) return null;

    return new Promise((resolve) => {
      const unsubscribe = _auth.onAuthStateChanged((user: any) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  // 基本 Firestore 操作
  static async getDocument(collection: string, docId: string) {
    await this.ensureInitialized();
    if (!_db) throw new Error('Firebase firestore not initialized');

    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(_db, collection, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  }

  static async setDocument(collection: string, docId: string, data: any) {
    await this.ensureInitialized();
    if (!_db) throw new Error('Firebase firestore not initialized');

    const { doc, setDoc } = await import('firebase/firestore');
    const docRef = doc(_db, collection, docId);
    return setDoc(docRef, data);
  }

  // 檔案上傳
  static async uploadFile(path: string, file: File) {
    await this.ensureInitialized();

    // 延遲載入 Storage，避免在不需要時引入 undici
    const storageInstance = await initializeStorage();
    if (!storageInstance) throw new Error('Firebase storage not initialized');

    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storageRef = ref(storageInstance, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  }
}

export default getFirebaseApp;
