import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    const db = new DatabaseService(true);

    const { data: users, error } = await db.supabase
      .from('users')
      .select(`
        id,
        email,
        firebase_uid,
        role,
        status,
        created_at,
        user_profiles (
          first_name,
          last_name,
          phone
        )
      `)
      .order('email', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: '查詢失敗', details: error.message },
        { status: 500 }
      );
    }

    // 需要保留的帳號
    const requiredAccounts = [
      { 
        email: 'customer.test@relaygo.com', 
        name: '王小明', 
        expectedFirebaseUID: 'hUu4fH5dTlW9VUYm6GojXvRLdni2',
        role: 'customer' 
      },
      { 
        email: 'driver.test@relaygo.com', 
        name: '李小花', 
        expectedFirebaseUID: 'CMfTxhJFlUVDkosJPyUoJvKjCQk1',
        role: 'driver' 
      },
      { 
        email: 'admin@example.com', 
        name: '管理員', 
        expectedFirebaseUID: null,
        role: 'admin' 
      }
    ];

    // 檢查每個需要保留的帳號
    const accountStatus = requiredAccounts.map(required => {
      const found = users?.find((u: any) => u.email === required.email);
      
      if (found) {
        const profile = found.user_profiles?.[0] || found.user_profiles;
        const name = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
          : '未知';

        const uidMatch = !required.expectedFirebaseUID || 
                        found.firebase_uid === required.expectedFirebaseUID;

        return {
          email: required.email,
          expectedName: required.name,
          actualName: name,
          exists: true,
          firebaseUID: found.firebase_uid,
          expectedFirebaseUID: required.expectedFirebaseUID,
          uidMatch,
          role: found.role,
          status: found.status,
          supabaseId: found.id
        };
      } else {
        return {
          email: required.email,
          expectedName: required.name,
          exists: false,
          firebaseUID: null,
          expectedFirebaseUID: required.expectedFirebaseUID,
          uidMatch: false,
          role: null,
          status: null,
          supabaseId: null
        };
      }
    });

    // 所有帳號列表
    const allAccounts = users?.map((user: any) => {
      const profile = user.user_profiles?.[0] || user.user_profiles;
      const name = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : '未知';

      return {
        id: user.id,
        email: user.email,
        name,
        firebaseUID: user.firebase_uid,
        role: user.role,
        status: user.status,
        createdAt: user.created_at
      };
    });

    return NextResponse.json({
      success: true,
      total: users?.length || 0,
      accountStatus,
      allAccounts,
      summary: {
        total: users?.length || 0,
        required: requiredAccounts.length,
        existing: accountStatus.filter(a => a.exists).length,
        missing: accountStatus.filter(a => !a.exists).length,
        uidMismatch: accountStatus.filter(a => a.exists && !a.uidMatch).length
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: '查詢失敗', details: error.message },
      { status: 500 }
    );
  }
}

