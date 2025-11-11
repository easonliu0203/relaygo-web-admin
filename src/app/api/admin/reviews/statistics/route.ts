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
 * @route GET /api/admin/reviews/statistics
 * @desc 獲取評價統計報表
 * @access Admin
 * @query startDate - 開始日期（可選，格式：YYYY-MM-DD）
 * @query endDate - 結束日期（可選，格式：YYYY-MM-DD）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('[Admin API] 獲取評價統計報表:', { startDate, endDate });

    // 構建日期範圍查詢
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `created_at.gte.${startDate}T00:00:00Z,created_at.lte.${endDate}T23:59:59Z`;
    } else if (startDate) {
      dateFilter = `created_at.gte.${startDate}T00:00:00Z`;
    } else if (endDate) {
      dateFilter = `created_at.lte.${endDate}T23:59:59Z`;
    }

    // 1. 查詢總體統計
    let totalQuery = supabaseAdmin.from('reviews').select('*', { count: 'exact', head: true });

    if (dateFilter) {
      totalQuery = totalQuery.or(dateFilter);
    }

    const { count: totalReviews } = await totalQuery;

    // 2. 查詢各狀態的評價數量
    const statusCounts = await Promise.all([
      supabaseAdmin
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then((res) => ({ status: 'pending', count: res.count || 0 })),
      supabaseAdmin
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .then((res) => ({ status: 'approved', count: res.count || 0 })),
      supabaseAdmin
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .then((res) => ({ status: 'rejected', count: res.count || 0 })),
      supabaseAdmin
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hidden')
        .then((res) => ({ status: 'hidden', count: res.count || 0 })),
    ]);

    // 3. 查詢平均評分（僅已批准的評價）
    const { data: approvedReviews } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('status', 'approved');

    const averageRating =
      approvedReviews && approvedReviews.length > 0
        ? approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length
        : 0;

    // 4. 查詢評分分布（僅已批准的評價）
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    if (approvedReviews) {
      approvedReviews.forEach((review: any) => {
        if (review.rating >= 1 && review.rating <= 5) {
          ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
        }
      });
    }

    // 5. 查詢最近 30 天的評價趨勢
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentReviews } = await supabaseAdmin
      .from('reviews')
      .select('created_at, rating, status')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // 按日期分組統計
    const dailyStats: Record<
      string,
      { date: string; count: number; averageRating: number; approved: number; pending: number }
    > = {};

    if (recentReviews) {
      recentReviews.forEach((review: any) => {
        const date = review.created_at.split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            count: 0,
            averageRating: 0,
            approved: 0,
            pending: 0,
          };
        }
        dailyStats[date].count++;
        if (review.status === 'approved') {
          dailyStats[date].approved++;
          dailyStats[date].averageRating += review.rating;
        }
        if (review.status === 'pending') {
          dailyStats[date].pending++;
        }
      });

      // 計算每日平均評分
      Object.values(dailyStats).forEach((stat: any) => {
        if (stat.approved > 0) {
          stat.averageRating = stat.averageRating / stat.approved;
        }
      });
    }

    const ratingTrend = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));

    // 6. 查詢評價最多的司機（Top 10）
    const { data: topDrivers } = await supabaseAdmin
      .from('drivers')
      .select(
        `
        user_id,
        total_reviews,
        average_rating,
        user:users!user_id(display_name, email)
      `
      )
      .order('total_reviews', { ascending: false })
      .limit(10);

    // 7. 查詢評分最高的司機（Top 10，至少有 5 條評價）
    const { data: topRatedDrivers } = await supabaseAdmin
      .from('drivers')
      .select(
        `
        user_id,
        total_reviews,
        average_rating,
        user:users!user_id(display_name, email)
      `
      )
      .gte('total_reviews', 5)
      .order('average_rating', { ascending: false })
      .limit(10);

    // 8. 查詢平均審核時間（小時）
    const { data: reviewedReviews } = await supabaseAdmin
      .from('reviews')
      .select('created_at, reviewed_at')
      .not('reviewed_at', 'is', null);

    let averageReviewTime = 0;
    if (reviewedReviews && reviewedReviews.length > 0) {
      const totalTime = reviewedReviews.reduce((sum: number, review: any) => {
        const created = new Date(review.created_at).getTime();
        const reviewed = new Date(review.reviewed_at!).getTime();
        return sum + (reviewed - created);
      }, 0);
      averageReviewTime = totalTime / reviewedReviews.length / (1000 * 60 * 60); // 轉換為小時
    }

    console.log('[Admin API] ✅ 統計報表生成成功');

    // 9. 返回統計數據
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalReviews: totalReviews || 0,
          averageRating: parseFloat(averageRating.toFixed(2)),
          pendingReviews: statusCounts.find((s: any) => s.status === 'pending')?.count || 0,
          approvedReviews: statusCounts.find((s: any) => s.status === 'approved')?.count || 0,
          rejectedReviews: statusCounts.find((s: any) => s.status === 'rejected')?.count || 0,
          hiddenReviews: statusCounts.find((s: any) => s.status === 'hidden')?.count || 0,
          averageReviewTimeHours: parseFloat(averageReviewTime.toFixed(2)),
        },
        ratingDistribution,
        ratingTrend,
        topDrivers: topDrivers?.map((driver: any) => ({
          driverId: driver.user_id,
          driverName: driver.user?.display_name || driver.user?.email || 'Unknown',
          totalReviews: driver.total_reviews,
          averageRating: parseFloat(driver.average_rating) || 0,
        })),
        topRatedDrivers: topRatedDrivers?.map((driver: any) => ({
          driverId: driver.user_id,
          driverName: driver.user?.display_name || driver.user?.email || 'Unknown',
          totalReviews: driver.total_reviews,
          averageRating: parseFloat(driver.average_rating) || 0,
        })),
      },
    });
  } catch (error) {
    console.error('[Admin API] ❌ 獲取統計報表異常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '獲取統計報表失敗',
      },
      { status: 500 }
    );
  }
}

