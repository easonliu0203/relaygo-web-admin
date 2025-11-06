import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const db = new DatabaseService(true);

    console.log('🔧 開始修復帳號...');

    const results = {
      customerUpdate: null as any,
      adminCreate: null as any,
      errors: [] as string[]
    };

    // 1. 更新客戶帳號的 Firebase UID 和姓名
    console.log('\n1. 更新客戶帳號的 Firebase UID 和姓名...');
    
    const { data: customerUser, error: customerUserError } = await db.supabase
      .from('users')
      .update({
        firebase_uid: 'hUu4fH5dTlW9VUYm6GojXvRLdni2'
      })
      .eq('email', 'customer.test@relaygo.com')
      .select()
      .single();

    if (customerUserError) {
      results.errors.push(`更新客戶 Firebase UID 失敗: ${customerUserError.message}`);
      console.error('   ❌ 更新客戶 Firebase UID 失敗:', customerUserError);
    } else {
      console.log('   ✅ 更新客戶 Firebase UID 成功');
      results.customerUpdate = { user: customerUser };
    }

    // 更新客戶姓名
    const { data: customerProfile, error: customerProfileError } = await db.supabase
      .from('user_profiles')
      .update({
        first_name: '小明',
        last_name: '王'
      })
      .eq('user_id', customerUser?.id)
      .select()
      .single();

    if (customerProfileError) {
      results.errors.push(`更新客戶姓名失敗: ${customerProfileError.message}`);
      console.error('   ❌ 更新客戶姓名失敗:', customerProfileError);
    } else {
      console.log('   ✅ 更新客戶姓名成功');
      results.customerUpdate.profile = customerProfile;
    }

    // 2. 創建管理員帳號
    console.log('\n2. 創建管理員帳號...');

    // 先檢查是否已存在
    const { data: existingAdmin } = await db.supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@example.com')
      .single();

    if (existingAdmin) {
      console.log('   ⚠️  管理員帳號已存在，跳過創建');
      results.adminCreate = { skipped: true, id: existingAdmin.id };
    } else {
      // 創建管理員用戶
      const { data: adminUser, error: adminUserError } = await db.supabase
        .from('users')
        .insert({
          email: 'admin@example.com',
          firebase_uid: 'admin_uid_' + Date.now(),
          role: 'admin',
          status: 'active'
        })
        .select()
        .single();

      if (adminUserError) {
        results.errors.push(`創建管理員帳號失敗: ${adminUserError.message}`);
        console.error('   ❌ 創建管理員帳號失敗:', adminUserError);
      } else {
        console.log('   ✅ 創建管理員帳號成功');

        // 創建管理員資料
        const { data: adminProfile, error: adminProfileError } = await db.supabase
          .from('user_profiles')
          .insert({
            user_id: adminUser.id,
            first_name: '管理員',
            last_name: '',
            phone: '0900000000'
          })
          .select()
          .single();

        if (adminProfileError) {
          results.errors.push(`創建管理員資料失敗: ${adminProfileError.message}`);
          console.error('   ❌ 創建管理員資料失敗:', adminProfileError);
        } else {
          console.log('   ✅ 創建管理員資料成功');
        }

        results.adminCreate = {
          user: adminUser,
          profile: adminProfile
        };
      }
    }

    // 3. 驗證結果
    console.log('\n3. 驗證修復結果...');

    const { data: allUsers, error: verifyError } = await db.supabase
      .from('users')
      .select(`
        id,
        email,
        firebase_uid,
        role,
        status,
        user_profiles (
          first_name,
          last_name
        )
      `)
      .order('email', { ascending: true });

    if (verifyError) {
      results.errors.push(`驗證失敗: ${verifyError.message}`);
      console.error('   ❌ 驗證失敗:', verifyError);
    } else {
      console.log(`   ✅ 找到 ${allUsers?.length || 0} 個用戶帳號`);

      allUsers?.forEach((user: any) => {
        const profile = user.user_profiles?.[0] || user.user_profiles;
        const name = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : '未知';
        console.log(`      - ${name} (${user.email}) - UID: ${user.firebase_uid}`);
      });
    }

    console.log('\n========================================');
    console.log('修復完成');
    console.log('========================================\n');

    return NextResponse.json({
      success: results.errors.length === 0,
      message: results.errors.length === 0 ? '修復完成' : '修復完成，但有錯誤',
      results,
      verifiedUsers: allUsers?.map((u: any) => {
        const profile = u.user_profiles?.[0] || u.user_profiles;
        const name = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : '未知';
        return {
          email: u.email,
          name,
          firebaseUID: u.firebase_uid,
          role: u.role,
          status: u.status
        };
      })
    });

  } catch (error: any) {
    console.error('❌ 修復過程中發生錯誤:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '修復過程中發生錯誤', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

