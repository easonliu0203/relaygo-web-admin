const TRANSLATE_URL = 'https://asia-east1-ride-platform-f1676.cloudfunctions.net/translate';

/**
 * 呼叫 Google Cloud Function 翻譯文字
 * 失敗時靜默回傳 null，不阻斷聊天
 */
export async function translateText(text: string, targetLang: string): Promise<string | null> {
  try {
    const response = await fetch(TRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.translatedText ?? null;
  } catch {
    return null;
  }
}
