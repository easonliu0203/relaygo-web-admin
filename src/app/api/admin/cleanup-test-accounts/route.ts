import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

// 保留的測試帳號
const KEEP_ACCOUNTS = [
  'customer.test@relaygo.com',  // 王小明 - 客戶端測試帳號
  'driver.test@relaygo.com',    // 李小花 - 司機端測試帳號
  'admin@example.com'           // 管理員 - 公司端管理帳號
];

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 開始清理測試帳號...');

    const db = new DatabaseService(true); // 使用 service_role key

    // 步驟 1: 查詢所有用戶
    const { data: allUsers, error: usersError } = await db.supabase
      .from('users')
      .select(`
        id,
        email,
        firebase_uid,
        role,
        status,
        created_at
      `)
      .order('created_at', { ascending: true });

    if (usersError) {
      console.error('❌ 查詢用戶失敗:', usersError);
      return NextResponse.json(
        { 
          success: false, 
          error: '查詢用戶失敗', 
          details: usersError.message 
        },
        { status: 500 }
      );
    }

    console.log(`✅ 找到 ${allUsers?.length || 0} 個用戶帳號`);

    // 步驟 2: 分類帳號
    const keepAccounts = [];
    const deleteAccounts = [];

    for (const user of allUsers || []) {
      if (KEEP_ACCOUNTS.includes(user.email)) {
        keepAccounts.push(user);
      } else {
        deleteAccounts.push(user);
      }
    }

    console.log(`📌 保留 ${keepAccounts.length} 個帳號`);
    console.log(`🗑️  需要刪除 ${deleteAccounts.length} 個帳號`);

    if (deleteAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有需要刪除的帳號',
        summary: {
          total: allUsers?.length || 0,
          kept: keepAccounts.length,
          deleted: 0
        }
      });
    }

    // 步驟 3: 刪除帳號
    const deleteResults = [];

    for (const account of deleteAccounts) {
      console.log(`\n正在刪除: ${account.email}...`);

      const result = {
        email: account.email,
        userId: account.id,
        firebaseUid: account.firebase_uid,
        role: account.role,
        deletedRecords: {
          bookings: 0,
          drivers: 0,
          userProfiles: 0,
          users: 0
        },
        errors: [] as string[]
      };

      try {
        // 1. 先查詢相關的訂單 ID
        const { data: customerBookings } = await db.supabase
          .from('bookings')
          .select('id')
          .eq('customer_id', account.id);

        const { data: driverBookings } = await db.supabase
          .from('bookings')
          .select('id')
          .eq('driver_id', account.id);

        const allBookingIds = [
          ...(customerBookings?.map(b => b.id) || []),
          ...(driverBookings?.map(b => b.id) || [])
        ];

        // 2. 刪除相關的 payments（如果有）
        if (allBookingIds.length > 0) {
          const { data: payments, error: paymentsError } = await db.supabase
            .from('payments')
            .delete()
            .in('booking_id', allBookingIds)
            .select();

          if (paymentsError) {
            result.errors.push(`刪除支付記錄失敗: ${paymentsError.message}`);
          } else {
            console.log(`   ✅ 刪除 ${payments?.length || 0} 筆支付記錄`);
          }
        }

        // 3. 刪除相關的訂單（作為客戶）
        const { data: deletedCustomerBookings, error: customerBookingsError } = await db.supabase
          .from('bookings')
          .delete()
          .eq('customer_id', account.id)
          .select();

        if (customerBookingsError) {
          result.errors.push(`刪除客戶訂單失敗: ${customerBookingsError.message}`);
        } else {
          result.deletedRecords.bookings += deletedCustomerBookings?.length || 0;
          console.log(`   ✅ 刪除 ${deletedCustomerBookings?.length || 0} 筆客戶訂單`);
        }

        // 4. 刪除相關的訂單（作為司機）
        const { data: deletedDriverBookings, error: driverBookingsError } = await db.supabase
          .from('bookings')
          .delete()
          .eq('driver_id', account.id)
          .select();

        if (driverBookingsError) {
          result.errors.push(`刪除司機訂單失敗: ${driverBookingsError.message}`);
        } else {
          result.deletedRecords.bookings += deletedDriverBookings?.length || 0;
          console.log(`   ✅ 刪除 ${deletedDriverBookings?.length || 0} 筆司機訂單`);
        }

        // 3. 刪除司機資料（如果是司機）
        if (account.role === 'driver') {
          const { data: driverData, error: driverError } = await db.supabase
            .from('drivers')
            .delete()
            .eq('user_id', account.id)
            .select();

          if (driverError) {
            result.errors.push(`刪除司機資料失敗: ${driverError.message}`);
          } else {
            result.deletedRecords.drivers = driverData?.length || 0;
            console.log(`   ✅ 刪除 ${driverData?.length || 0} 筆司機資料`);
          }
        }

        // 4. 刪除用戶資料
        const { data: profileData, error: profileError } = await db.supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', account.id)
          .select();

        if (profileError) {
          result.errors.push(`刪除用戶資料失敗: ${profileError.message}`);
        } else {
          result.deletedRecords.userProfiles = profileData?.length || 0;
          console.log(`   ✅ 刪除 ${profileData?.length || 0} 筆用戶資料`);
        }

        // 5. 刪除用戶帳號
        const { data: userData, error: userError } = await db.supabase
          .from('users')
          .delete()
          .eq('id', account.id)
          .select();

        if (userError) {
          result.errors.push(`刪除用戶帳號失敗: ${userError.message}`);
        } else {
          result.deletedRecords.users = userData?.length || 0;
          console.log(`   ✅ 刪除 ${userData?.length || 0} 筆用戶帳號`);
        }

        if (result.errors.length === 0) {
          console.log(`   ✅ 帳號刪除完成`);
        } else {
          console.log(`   ⚠️  帳號刪除完成，但有 ${result.errors.length} 個錯誤`);
        }

      } catch (error: any) {
        console.error(`   ❌ 刪除帳號時發生錯誤:`, error);
        result.errors.push(`刪除帳號時發生錯誤: ${error.message}`);
      }

      deleteResults.push(result);
    }

    // 步驟 4: 驗證清理結果
    const { data: remainingUsers, error: verifyError } = await db.supabase
      .from('users')
      .select('id, email, role')
      .order('email', { ascending: true });

    if (verifyError) {
      console.error('❌ 驗證清理結果失敗:', verifyError);
    } else {
      console.log(`\n✅ 資料庫中剩餘 ${remainingUsers?.length || 0} 個用戶帳號`);
    }

    // 步驟 5: 生成報告
    let totalBookings = 0;
    let totalDrivers = 0;
    let totalProfiles = 0;
    let totalUsers = 0;
    let totalErrors = 0;

    deleteResults.forEach(result => {
      totalBookings += result.deletedRecords.bookings;
      totalDrivers += result.deletedRecords.drivers;
      totalProfiles += result.deletedRecords.userProfiles;
      totalUsers += result.deletedRecords.users;
      totalErrors += result.errors.length;
    });

    const summary = {
      total: allUsers?.length || 0,
      kept: keepAccounts.length,
      deleted: deleteAccounts.length,
      remaining: remainingUsers?.length || 0,
      deletedRecords: {
        bookings: totalBookings,
        drivers: totalDrivers,
        userProfiles: totalProfiles,
        users: totalUsers
      },
      errors: totalErrors
    };

    console.log('\n========================================');
    console.log('清理報告');
    console.log('========================================');
    console.log(`刪除的帳號數量: ${deleteResults.length}`);
    console.log(`刪除的訂單記錄: ${totalBookings}`);
    console.log(`刪除的司機資料: ${totalDrivers}`);
    console.log(`刪除的用戶資料: ${totalProfiles}`);
    console.log(`刪除的用戶帳號: ${totalUsers}`);
    console.log(`錯誤數量: ${totalErrors}`);
    console.log('========================================\n');

    return NextResponse.json({
      success: true,
      message: '清理完成',
      summary,
      deleteResults,
      remainingUsers: remainingUsers?.map(u => ({
        email: u.email,
        role: u.role
      }))
    });

  } catch (error: any) {
    console.error('❌ 清理過程中發生錯誤:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '清理過程中發生錯誤', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET 方法：查看當前帳號狀態
export async function GET(request: NextRequest) {
  try {
    const db = new DatabaseService(true);

    const { data: allUsers, error } = await db.supabase
      .from('users')
      .select(`
        id,
        email,
        role,
        status,
        user_profiles (
          first_name,
          last_name
        )
      `)
      .order('email', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: '查詢用戶失敗', details: error.message },
        { status: 500 }
      );
    }

    const keepAccounts = [];
    const deleteAccounts = [];

    for (const user of allUsers || []) {
      const profile = user.user_profiles?.[0] || user.user_profiles;
      const name = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
        : '未知';

      const accountInfo = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        name
      };

      if (KEEP_ACCOUNTS.includes(user.email)) {
        keepAccounts.push(accountInfo);
      } else {
        deleteAccounts.push(accountInfo);
      }
    }

    return NextResponse.json({
      success: true,
      total: allUsers?.length || 0,
      keepAccounts,
      deleteAccounts,
      summary: {
        total: allUsers?.length || 0,
        toKeep: keepAccounts.length,
        toDelete: deleteAccounts.length
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: '查詢失敗', details: error.message },
      { status: 500 }
    );
  }
}

