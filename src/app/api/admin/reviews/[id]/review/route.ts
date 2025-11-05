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
 * @route POST /api/admin/reviews/:id/review
 * @desc 審核單個評價
 * @access Admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id;
    const body = await request.json();
    const { status, adminNotes } = body;

    console.log('[Admin API] 審核評價:', { reviewId, status, adminNotes });

    // 1. 驗證參數
    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少審核狀態',
        },
        { status: 400 }
      );
    }

    // 2. 驗證狀態值
    const validStatuses = ['approved', 'rejected', 'hidden'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: '無效的審核狀態，必須是 approved、rejected 或 hidden',
        },
        { status: 400 }
      );
    }

    // 3. 檢查評價是否存在
    const { data: existingReview, error: checkError } = await supabaseAdmin
      .from('reviews')
      .select('id, status, reviewee_id')
      .eq('id', reviewId)
      .single();

    if (checkError || !existingReview) {
      console.error('[Admin API] 評價不存在:', checkError);
      return NextResponse.json(
        {
          success: false,
          error: '評價不存在',
        },
        { status: 404 }
      );
    }

    // 4. 更新評價狀態
    const { data: review, error: updateError } = await supabaseAdmin
      .from('reviews')
      .update({
        status: status,
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
        // TODO: 從 session 獲取管理員 ID
        // reviewed_by: adminUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError) {
      console.error('[Admin API] 更新評價失敗:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: '更新評價失敗',
        },
        { status: 500 }
      );
    }

    console.log('[Admin API] ✅ 評價審核成功:', {
      reviewId: review.id,
      status: review.status,
    });

    // 5. 如果是批准狀態，觸發器會自動更新司機統計
    // 這裡可以選擇性地返回更新後的司機統計數據

    return NextResponse.json({
      success: true,
      data: {
        reviewId: review.id,
        status: review.status,
        reviewedAt: review.reviewed_at,
        adminNotes: review.admin_notes,
      },
    });
  } catch (error) {
    console.error('[Admin API] ❌ 審核評價異常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '審核評價失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * @route GET /api/admin/reviews/:id/review
 * @desc 獲取單個評價的詳細信息
 * @access Admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id;

    console.log('[Admin API] 獲取評價詳情:', { reviewId });

    // 查詢評價詳情
    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .select(
        `
        *,
        reviewer:users!reviewer_id(
          id,
          email,
          phone,
          firebase_uid,
          user_profiles(first_name, last_name)
        ),
        reviewee:users!reviewee_id(
          id,
          email,
          phone,
          firebase_uid,
          user_profiles(first_name, last_name)
        ),
        booking:bookings(
          id,
          booking_number,
          start_date,
          status,
          pickup_location,
          destination,
          total_amount
        ),
        reviewed_by_user:users!reviewed_by(
          id,
          email,
          user_profiles(first_name, last_name)
        )
      `
      )
      .eq('id', reviewId)
      .single();

    if (error || !review) {
      console.error('[Admin API] 評價不存在:', error);
      return NextResponse.json(
        {
          success: false,
          error: '評價不存在',
        },
        { status: 404 }
      );
    }

    console.log('[Admin API] ✅ 獲取評價詳情成功');

    // 處理評價數據，構建用戶顯示名稱
    const reviewerData = Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer;
    const reviewerProfile = Array.isArray(reviewerData?.user_profiles)
      ? reviewerData?.user_profiles[0]
      : reviewerData?.user_profiles;

    let reviewerDisplayName = '未知用戶';
    if (review.is_anonymous) {
      reviewerDisplayName = '匿名用戶';
    } else if (reviewerProfile) {
      const firstName = reviewerProfile.first_name || '';
      const lastName = reviewerProfile.last_name || '';
      reviewerDisplayName = `${firstName} ${lastName}`.trim() || reviewerData?.email || '未知用戶';
    } else if (reviewerData?.email) {
      reviewerDisplayName = reviewerData.email;
    }

    const revieweeData = Array.isArray(review.reviewee) ? review.reviewee[0] : review.reviewee;
    const revieweeProfile = Array.isArray(revieweeData?.user_profiles)
      ? revieweeData?.user_profiles[0]
      : revieweeData?.user_profiles;

    let revieweeDisplayName = '未知用戶';
    if (revieweeProfile) {
      const firstName = revieweeProfile.first_name || '';
      const lastName = revieweeProfile.last_name || '';
      revieweeDisplayName = `${firstName} ${lastName}`.trim() || revieweeData?.email || '未知用戶';
    } else if (revieweeData?.email) {
      revieweeDisplayName = revieweeData.email;
    }

    let reviewedByDisplayName = null;
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
        reviewedByDisplayName = `${firstName} ${lastName}`.trim() || reviewedByData?.email || '未知用戶';
      } else if (reviewedByData?.email) {
        reviewedByDisplayName = reviewedByData.email;
      }
    }

    // 構建處理後的評價數據
    const processedReview = {
      ...review,
      reviewer: {
        ...reviewerData,
        display_name: reviewerDisplayName,
      },
      reviewee: {
        ...revieweeData,
        display_name: revieweeDisplayName,
      },
      reviewed_by_user: review.reviewed_by_user ? {
        ...review.reviewed_by_user,
        display_name: reviewedByDisplayName,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: processedReview,
    });
  } catch (error) {
    console.error('[Admin API] ❌ 獲取評價詳情異常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '獲取評價詳情失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * @route DELETE /api/admin/reviews/:id/review
 * @desc 刪除評價（軟刪除，設置為 hidden）
 * @access Admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id;

    console.log('[Admin API] 刪除評價:', { reviewId });

    // 軟刪除：設置狀態為 hidden
    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .update({
        status: 'hidden',
        admin_notes: '管理員刪除',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      console.error('[Admin API] 刪除評價失敗:', error);
      return NextResponse.json(
        {
          success: false,
          error: '刪除評價失敗',
        },
        { status: 500 }
      );
    }

    console.log('[Admin API] ✅ 評價已刪除（軟刪除）');

    return NextResponse.json({
      success: true,
      data: {
        reviewId: review.id,
        status: review.status,
      },
    });
  } catch (error) {
    console.error('[Admin API] ❌ 刪除評價異常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '刪除評價失敗',
      },
      { status: 500 }
    );
  }
}

