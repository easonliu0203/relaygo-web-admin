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
export let firebaseApp: any = null;
export let auth: any = null;
export let db: any = null;
export let storage: any = null;
export let messaging: any = null;

// 初始化 Firebase (僅在客戶端)
export const initializeFirebase = async () => {
  if (typeof window === 'undefined' || firebaseApp) return;

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');

    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    // Storage 延遲載入 - 只在需要時才載入，避免 undici 相容性問題
    // storage 會在 initializeStorage() 中初始化

    // 嘗試載入 messaging (可能不支援)
    try {
      const { getMessaging, isSupported } = await import('firebase/messaging');
      if (await isSupported()) {
        messaging = getMessaging(firebaseApp);
      }
    } catch (error) {
      console.log('Firebase messaging not supported');
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
};

// 初始化 Storage (僅在需要時呼叫)
// 注意：由於 undici 相容性問題，Storage 功能暫時停用
// 如需使用，請確保 Next.js 和 Firebase 版本相容
export const initializeStorage = async () => {
  throw new Error('Firebase Storage is currently disabled due to undici compatibility issues. Please use alternative file upload methods.');

  /*
  if (typeof window === 'undefined') return;
  if (storage) return storage;

  try {
    await initializeFirebase();
    const { getStorage } = await import('firebase/storage');
    storage = getStorage(firebaseApp);
    return storage;
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
    if (!firebaseApp) {
      await initializeFirebase();
    }
  }

  // 認證相關
  static async signInWithEmailAndPassword(email: string, password: string) {
    await this.ensureInitialized();
    if (!auth) throw new Error('Firebase auth not initialized');

    const { signInWithEmailAndPassword } = await import('firebase/auth');
    return signInWithEmailAndPassword(auth, email, password);
  }

  static async signOut() {
    await this.ensureInitialized();
    if (!auth) throw new Error('Firebase auth not initialized');

    const { signOut } = await import('firebase/auth');
    return signOut(auth);
  }

  static async getCurrentUser() {
    await this.ensureInitialized();
    if (!auth) return null;

    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user: any) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  // 基本 Firestore 操作
  static async getDocument(collection: string, docId: string) {
    await this.ensureInitialized();
    if (!db) throw new Error('Firebase firestore not initialized');

    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(db, collection, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  }

  static async setDocument(collection: string, docId: string, data: any) {
    await this.ensureInitialized();
    if (!db) throw new Error('Firebase firestore not initialized');

    const { doc, setDoc } = await import('firebase/firestore');
    const docRef = doc(db, collection, docId);
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

export default firebaseApp;
