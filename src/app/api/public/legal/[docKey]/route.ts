import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * 公開 API：取得法律文件 HTML 內容
 * GET /api/public/legal/{docKey}?lang=zh-TW
 *
 * - 不需登入驗證
 * - 回傳完整 HTML 頁面（可直接用 WebView 載入）
 * - lang 參數預設 zh-TW，支援 en/ja/ko/zh-CN/vi/th/id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docKey: string }> }
) {
  try {
    const { docKey } = await params;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh-TW';

    const { data, error } = await supabase
      .from('legal_documents')
      .select('title, title_i18n, content, content_i18n, version, updated_at')
      .eq('doc_key', docKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const title = data.title_i18n?.[lang] || data.title_i18n?.['zh-TW'] || data.title;
    const content = data.content_i18n?.[lang] || data.content_i18n?.['zh-TW'] || data.content;

    // 如果請求 JSON 格式
    if (searchParams.get('format') === 'json') {
      return NextResponse.json({
        title,
        content,
        version: data.version,
        updated_at: data.updated_at,
      });
    }

    // 預設回傳完整 HTML 頁面
    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px 16px;
      color: #333;
      line-height: 1.8;
      font-size: 15px;
      background: #fff;
    }
    h1 { font-size: 22px; color: #1a1a1a; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #1890ff; }
    h2 { font-size: 18px; color: #333; margin: 20px 0 8px; }
    h3 { font-size: 16px; color: #555; margin: 16px 0 6px; }
    p { margin: 8px 0; }
    a { color: #1890ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul, ol { padding-left: 24px; margin: 8px 0; }
    li { margin: 4px 0; }
    blockquote { border-left: 4px solid #1890ff; margin: 16px 0; padding: 8px 16px; background: #f5f5f5; border-radius: 0 4px 4px 0; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    strong { font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e8e8; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${content}
  <div class="footer">
    v${data.version} · ${new Date(data.updated_at).toLocaleDateString(lang === 'zh-TW' ? 'zh-TW' : lang)}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
