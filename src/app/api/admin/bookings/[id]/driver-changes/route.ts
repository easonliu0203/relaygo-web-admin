import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/bookings/[id]/driver-changes
 * 取得指定訂單的司機變更歷史（審計用）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const db = new DatabaseService();

    const { data: changes, error } = await db.supabase
      .from('booking_driver_changes')
      .select('id, previous_driver_id, new_driver_id, reason, previous_status, changed_by, changed_at')
      .eq('booking_id', bookingId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('❌ 讀取司機變更歷史失敗:', error);
      return NextResponse.json(
        { success: false, error: '讀取司機變更歷史失敗', details: error.message },
        { status: 500 }
      );
    }

    const rows: any[] = changes || [];

    // 收集所有相關 driver_id 一次查 users，避免 N+1
    const driverIds = Array.from(
      new Set(
        rows
          .flatMap((r: any) => [r.previous_driver_id, r.new_driver_id])
          .filter((v: any): v is string => !!v)
      )
    );

    let driverMap: Record<string, { name: string | null; phone: string | null }> = {};
    if (driverIds.length > 0) {
      const { data: users, error: usersError } = await db.supabase
        .from('users')
        .select('id, name, phone')
        .in('id', driverIds);

      if (usersError) {
        console.error('⚠️ 讀取司機姓名失敗（仍回傳 ID）:', usersError);
      } else {
        driverMap = Object.fromEntries(
          (users || []).map((u: any) => [u.id, { name: u.name, phone: u.phone }])
        );
      }
    }

    const data = rows.map((r: any) => ({
      id: r.id,
      changedAt: r.changed_at,
      previousStatus: r.previous_status,
      reason: r.reason,
      changedBy: r.changed_by,
      previousDriver: {
        id: r.previous_driver_id,
        name: r.previous_driver_id ? driverMap[r.previous_driver_id]?.name ?? null : null,
        phone: r.previous_driver_id ? driverMap[r.previous_driver_id]?.phone ?? null : null,
      },
      newDriver: {
        id: r.new_driver_id,
        name: driverMap[r.new_driver_id]?.name ?? null,
        phone: driverMap[r.new_driver_id]?.phone ?? null,
      },
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('❌ API 錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: '內部伺服器錯誤',
        details: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}
