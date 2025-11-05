import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 配置 - 使用 service_role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 創建 Supabase Admin 客戶端（繞過 RLS）
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * @route GET /api/admin/reviews
 * @desc 獲取評價列表（管理員）
 * @access Admin
 * @query status - 評價狀態（pending/approved/rejected/hidden/all）
 * @query page - 頁碼（預設 1）
 * @query limit - 每頁數量（預設 20）
 * @query search - 搜索關鍵字（可選）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    console.log('[Admin API] 獲取評價列表:', { status, page, limit, search });

    // 計算分頁參數
    const offset = (page - 1) * limit;

    // 構建查詢
    let query = supabaseAdmin
      .from('reviews')
      .select(
        `
        *,
        reviewer:users!reviewer_id(
          id,
          email,
          phone,
          user_profiles(first_name, last_name)
        ),
        reviewee:users!reviewee_id(
          id,
          email,
          phone,
          user_profiles(first_name, last_name)
        ),
        booking:bookings(id, booking_number, start_date, status),
        reviewed_by_user:users!reviewed_by(
          id,
          email,
          user_profiles(first_name, last_name)
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 狀態篩選
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // 搜索功能（搜索評論內容或訂單號）
    if (search) {
      query = query.or(`comment.ilike.%${search}%,booking.booking_number.ilike.%${search}%`);
    }

    const { data: reviews, error, count } = await query;

    if (error) {
      console.error('[Admin API] 查詢評價失敗:', error);
      return NextResponse.json(
        {
          success: false,
          error: '查詢評價失敗',
        },
        { status: 500 }
      );
    }

    console.log('[Admin API] ✅ 查詢成功，共 %d 條評價', count);

    // 處理評價數據，構建用戶顯示名稱
    const processedReviews = (reviews || []).map((review: any) => {
      // 處理 reviewer（評價者）
      const reviewerData = Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer;
      const reviewerProfile = Array.isArray(reviewerData?.user_profiles)
        ? reviewerData?.user_profiles[0]
        : reviewerData?.user_profiles;

      let reviewerName = '未知用戶';
      if (review.is_anonymous) {
        reviewerName = '匿名用戶';
      } else if (reviewerProfile) {
        const firstName = reviewerProfile.first_name || '';
        const lastName = reviewerProfile.last_name || '';
        reviewerName = `${firstName} ${lastName}`.trim() || reviewerData?.email || '未知用戶';
      } else if (reviewerData?.email) {
        reviewerName = reviewerData.email;
      }

      // 處理 reviewee（被評價者）
      const revieweeData = Array.isArray(review.reviewee) ? review.reviewee[0] : review.reviewee;
      const revieweeProfile = Array.isArray(revieweeData?.user_profiles)
        ? revieweeData?.user_profiles[0]
        : revieweeData?.user_profiles;

      let revieweeName = '未知用戶';
      if (revieweeProfile) {
        const firstName = revieweeProfile.first_name || '';
        const lastName = revieweeProfile.last_name || '';
        revieweeName = `${firstName} ${lastName}`.trim() || revieweeData?.email || '未知用戶';
      } else if (revieweeData?.email) {
        revieweeName = revieweeData.email;
      }

      // 處理 reviewed_by_user（審核者）
      let reviewedByName = null;
      if (review.reviewed_by_user) {
        const reviewedByData = Array.isArray(review.reviewed_by_user)
          ? review.reviewed_by_user[0]
          : review.reviewed_by_user;
        const reviewedByProfile = Array.isArray(reviewedByData?.user_profiles)
          ? reviewedByData?.user_profiles[0]
          : reviewedByData?.user_profiles;

        if (reviewedByProfile) {
          const firstName = reviewedByProfile.first_name || '';
          const lastName = reviewedByProfile.last_name || '';
          reviewedByName = `${firstName} ${lastName}`.trim() || reviewedByData?.email || '未知用戶';
        } else if (reviewedByData?.email) {
          reviewedByName = reviewedByData.email;
        }
      }

      return {
        ...review,
        reviewerName,
        revieweeName,
        reviewedByName,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        reviews: processedReviews,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Admin API] ❌ 獲取評價列表異常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '獲取評價列表失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * @route POST /api/admin/reviews
 * @desc 批量操作評價（批量審核、批量刪除等）
 * @access Admin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, reviewIds, status, adminNotes } = body;

    console.log('[Admin API] 批量操作評價:', { action, reviewIds, status });

    // 驗證參數
    if (!action || !reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填參數或參數格式錯誤',
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'approve':
        // 批量批准
        result = await supabaseAdmin
          .from('reviews')
          .update({
            status: 'approved',
            admin_notes: adminNotes || null,
            reviewed_at: new Date().toISOString(),
            // TODO: 從 session 獲取管理員 ID
            // reviewed_by: adminUserId,
            updated_at: new Date().toISOString(),
          })
          .in('id', reviewIds)
          .select();
        break;

      case 'reject':
        // 批量拒絕
        result = await supabaseAdmin
          .from('reviews')
          .update({
            status: 'rejected',
            admin_notes: adminNotes || null,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', reviewIds)
          .select();
        break;

      case 'hide':
        // 批量隱藏
        result = await supabaseAdmin
          .from('reviews')
          .update({
            status: 'hidden',
            admin_notes: adminNotes || null,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', reviewIds)
          .select();
        break;

      case 'delete':
        // 批量刪除（軟刪除，實際上是設置為 hidden）
        result = await supabaseAdmin
          .from('reviews')
          .update({
            status: 'hidden',
            admin_notes: (adminNotes || '') + ' [已刪除]',
            updated_at: new Date().toISOString(),
          })
          .in('id', reviewIds)
          .select();
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: '不支持的操作類型',
          },
          { status: 400 }
        );
    }

    if (result.error) {
      console.error('[Admin API] 批量操作失敗:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: '批量操作失敗',
        },
        { status: 500 }
      );
    }

    console.log('[Admin API] ✅ 批量操作成功，影響 %d 條評價', result.data?.length || 0);

    return NextResponse.json({
      success: true,
      data: {
        affectedCount: result.data?.length || 0,
        reviews: result.data,
      },
    });
  } catch (error) {
    console.error('[Admin API] ❌ 批量操作異常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量操作失敗',
      },
      { status: 500 }
    );
  }
}

