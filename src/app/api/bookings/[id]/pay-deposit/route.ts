import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

interface PayDepositRequest {
  paymentMethod: string;
  customerUid: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body: PayDepositRequest = await request.json();

    console.log('💳 收到支付請求:', {
      bookingId,
      paymentMethod: body.paymentMethod,
      customerUid: body.customerUid
    });

    if (!body.paymentMethod || !body.customerUid) {
      console.error('❌ 缺少必要欄位');
      return NextResponse.json(
        { error: '缺少必要欄位: paymentMethod 或 customerUid' },
        { status: 400 }
      );
    }

    const db = new DatabaseService();

    // 1. 查詢訂單
    const { data: booking, error: bookingError } = await db.supabase
      .from('bookings')
      .select(`
        id,
        status,
        deposit_amount,
        total_amount,
        customer:customer_id (
          id,
          firebase_uid
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ 查詢訂單失敗:', {
        bookingId,
        error: bookingError,
        message: bookingError?.message
      });
      return NextResponse.json(
        { error: '訂單不存在', details: bookingError?.message },
        { status: 404 }
      );
    }

    console.log('✅ 查詢到訂單:', {
      id: booking.id,
      status: booking.status,
      deposit_amount: booking.deposit_amount,
      customer_firebase_uid: booking.customer?.firebase_uid
    });

    // 2. 驗證客戶身份
    if (booking.customer?.firebase_uid !== body.customerUid) {
      console.error('❌ 客戶身份驗證失敗:', {
        expected: booking.customer?.firebase_uid,
        received: body.customerUid
      });
      return NextResponse.json(
        { error: '無權限操作此訂單' },
        { status: 403 }
      );
    }

    console.log('✅ 客戶身份驗證通過');

    // 3. 檢查訂單狀態
    if (booking.status !== 'pending') {
      console.error('❌ 訂單狀態不允許支付:', booking.status);
      return NextResponse.json(
        { error: `訂單狀態不允許支付，當前狀態: ${booking.status}` },
        { status: 400 }
      );
    }

    console.log('✅ 訂單狀態檢查通過');

    // 4. 檢查是否已經有支付記錄
    const { data: existingPayment } = await db.supabase
      .from('payments')
      .select('id, status')
      .eq('booking_id', bookingId)
      .eq('type', 'deposit')  // ✅ 修復: 使用 'type' 而不是 'payment_type'
      .single();

    if (existingPayment && existingPayment.status === 'completed') {
      console.error('❌ 訂金已支付:', existingPayment);
      return NextResponse.json(
        { error: '此訂單的訂金已經支付完成' },
        { status: 400 }
      );
    }

    console.log('✅ 支付檢查通過，準備創建支付記錄');

    // 5. 獲取封測階段設定
    let betaSettings: any = null;
    try {
      const result = await db.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'beta_testing_config')
        .single();
      betaSettings = result.data;
    } catch (error) {
      console.warn('無法獲取封測設定，使用預設值:', error);
    }

    // 使用預設的封測設定
    const isAutoPaymentEnabled = betaSettings?.value?.auto_payment_enabled ?? true;
    const paymentDelaySeconds = betaSettings?.value?.payment_delay_seconds ?? 5;

    // 6. 創建支付記錄
    const paymentData = {
      booking_id: bookingId,
      customer_id: booking.customer.id,  // ✅ 添加: customer_id 是必填欄位
      type: 'deposit',  // ✅ 修復: 使用 'type' 而不是 'payment_type'
      amount: booking.deposit_amount,
      currency: 'TWD',  // ✅ 添加: currency 欄位
      status: isAutoPaymentEnabled ? 'processing' : 'pending',
      payment_provider: 'mock',
      payment_method: body.paymentMethod,
      is_test_mode: true,
      transaction_id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分鐘後過期
    };

    const { data: payment, error: paymentError } = await db.supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('❌ 創建支付記錄失敗:', {
        error: paymentError,
        message: paymentError?.message,
        paymentData
      });
      return NextResponse.json(
        { error: '創建支付記錄失敗', details: paymentError?.message },
        { status: 500 }
      );
    }

    console.log('✅ 支付記錄創建成功:', {
      id: payment.id,
      transaction_id: payment.transaction_id,
      amount: payment.amount,
      status: payment.status
    });

    // 7. 如果是自動支付，模擬支付處理
    if (isAutoPaymentEnabled) {
      console.log(`⏱️  模擬支付將在 ${paymentDelaySeconds} 秒後完成`);

      // 使用 setTimeout 模擬異步支付處理
      setTimeout(async () => {
        try {
          // 更新支付狀態為完成
          await db.supabase
            .from('payments')
            .update({
              status: 'completed',
              paid_at: new Date().toISOString()
            })
            .eq('id', payment.id);

          // 更新訂單狀態
          await db.supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              deposit_paid_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          console.log(`✅ 模擬支付完成: 訂單 ${bookingId}, 支付 ${payment.id}`);
        } catch (error) {
          console.error('❌ 模擬支付處理失敗:', error);
        }
      }, paymentDelaySeconds * 1000);
    }

    console.log('✅ 支付 API 處理完成，返回結果');

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        transactionId: payment.transaction_id,
        amount: payment.amount,
        status: payment.status,
        isAutoPayment: isAutoPaymentEnabled,
        estimatedProcessingTime: isAutoPaymentEnabled ? paymentDelaySeconds : null,
        expiresAt: payment.expires_at,
      }
    });

  } catch (error) {
    console.error('❌ 支付 API 錯誤:', {
      error: error,
      message: error instanceof Error ? error.message : '未知錯誤',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: '內部伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    );
  }
}
