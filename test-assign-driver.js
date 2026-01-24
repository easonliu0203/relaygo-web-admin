/**
 * 測試手動派單 API
 * 用於調試 assign-driver 端點
 */

const bookingId = '0816ef6f-46fa-4b41-b045-502a2ea9d1d8';
const driverId = '416556f9-adbf-4c2e-920f-164d80f5307a';

async function testAssignDriver() {
  try {
    console.log('🧪 測試手動派單 API');
    console.log('訂單 ID:', bookingId);
    console.log('司機 ID:', driverId);
    console.log('');

    const response = await fetch('http://localhost:3001/api/admin/bookings/' + bookingId + '/assign-driver', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driverId: driverId
      })
    });

    console.log('HTTP 狀態:', response.status);
    console.log('');

    const data = await response.json();
    console.log('響應數據:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ 測試成功！');
    } else {
      console.log('❌ 測試失敗！');
    }

  } catch (error) {
    console.error('❌ 測試錯誤:', error);
  }
}

testAssignDriver();

