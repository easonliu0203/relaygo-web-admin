'use client';

import { useState, useEffect } from 'react';
import {
  Card, Button, Table, Tag, Space, Modal, Form,
  Input, Radio, message, Image, Descriptions, Spin, Empty, Tabs, Avatar
} from 'antd';
import {
  ClockCircleOutlined, ReloadOutlined, CheckCircleOutlined,
  CloseCircleOutlined, FileTextOutlined, CarOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, BankOutlined,
  EyeOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

// 文件類型中文名稱
const documentTypeNames: Record<string, string> = {
  selfie_photo: '自拍照片',
  id_card_front: '身分證（正面）',
  id_card_back: '身分證（背面）',
  drivers_license: '駕照',
  vehicle_registration: '行照',
  taxi_permit: '多元登記證',
  insurance_policy: '保險單',
  police_clearance: '良民證',
  no_accident_record: '無肇事紀錄',
};

// 車輛照片類型中文名稱
const vehiclePhotoTypeNames: Record<string, string> = {
  front_left: '左前方',
  front_right: '右前方',
  rear_left: '左後方',
  rear_right: '右後方',
  front_seat: '前座區',
  rear_seat_1: '後座區 1',
  rear_seat_2: '後座區 2',
  rear_seat_3: '後座區 3',
  trunk: '後車箱',
};

interface Driver {
  id: string;
  userId: string;
  firebaseUid: string;
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  reviewStatus: string;
  reviewSubmittedAt: string;
  reviewNotes: string | null;
  companyName: string | null;
  companyTaxId: string | null;
  vehicleType: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  documents: Array<{ type: string; url: string; status: string; uploaded_at: string }>;
  vehiclePhotos: Array<{ photo_type: string; url: string; uploaded_at: string }>;
  referrer: { name: string; promoCode: string } | null;
  createdAt: string;
}

export default function PendingDriversPage() {
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 載入待審核司機列表
  const loadDrivers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/drivers/pending-review');
      const result = await response.json();

      if (result.success) {
        setDrivers(result.data);
      } else {
        message.error(result.error || '載入失敗');
      }
    } catch (error) {
      console.error('載入待審核司機失敗:', error);
      message.error('載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  // 查看司機詳情
  const handleViewDetail = (driver: Driver) => {
    setSelectedDriver(driver);
    setDetailModalVisible(true);
  };

  // 開始審核
  const handleStartReview = (driver: Driver) => {
    setSelectedDriver(driver);
    reviewForm.resetFields();
    setReviewModalVisible(true);
  };

  // 提交審核結果
  const handleSubmitReview = async (values: any) => {
    if (!selectedDriver) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/drivers/${selectedDriver.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: values.status,
          notes: values.notes,
          reviewedBy: 'admin', // TODO: 從登入狀態獲取
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success(result.message);
        setReviewModalVisible(false);
        setDetailModalVisible(false);
        loadDrivers(); // 重新載入列表
      } else {
        message.error(result.error || '審核失敗');
      }
    } catch (error) {
      console.error('提交審核失敗:', error);
      message.error('提交審核失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 表格欄位定義
  const columns = [
    {
      title: '司機',
      key: 'driver',
      render: (_: any, record: Driver) => (
        <Space>
          <Avatar src={record.avatarUrl} icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{record.displayName}</div>
            <div className="text-xs text-gray-500">{record.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '靠行公司',
      key: 'company',
      render: (_: any, record: Driver) => (
        record.companyName ? (
          <div>
            <div>{record.companyName}</div>
            <div className="text-xs text-gray-500">{record.companyTaxId}</div>
          </div>
        ) : <span className="text-gray-400">未設定</span>
      ),
    },
    {
      title: '推薦人',
      key: 'referrer',
      render: (_: any, record: Driver) => (
        record.referrer ? (
          <Tag color="blue">{record.referrer.name}</Tag>
        ) : <span className="text-gray-400">無</span>
      ),
    },
    {
      title: '文件數量',
      key: 'documents',
      render: (_: any, record: Driver) => (
        <Space>
          <Tag icon={<FileTextOutlined />}>{record.documents.length} 份文件</Tag>
          <Tag icon={<CarOutlined />}>{record.vehiclePhotos.length} 張照片</Tag>
        </Space>
      ),
    },
    {
      title: '提交時間',
      dataIndex: 'reviewSubmittedAt',
      key: 'reviewSubmittedAt',
      render: (date: string) => date ? new Date(date).toLocaleString('zh-TW') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Driver) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={() => handleStartReview(record)}
          >
            審核
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ClockCircleOutlined className="mr-2" />
            待審核司機
          </h1>
          <p className="text-gray-600">審核司機提交的文件和資料</p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={loadDrivers}
        >
          重新整理
        </Button>
      </div>

      {/* 統計卡片 */}
      <Card size="small">
        <div className="flex items-center">
          <ExclamationCircleOutlined className="text-2xl text-orange-500 mr-3" />
          <div>
            <div className="text-lg font-medium">{drivers.length} 位司機待審核</div>
            <div className="text-gray-500 text-sm">請審核司機提交的文件和資料</div>
          </div>
        </div>
      </Card>

      {/* 司機列表 */}
      <Card>
        {drivers.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="目前沒有待審核的司機"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={drivers}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* 詳情模態框 */}
      <Modal
        title={<><UserOutlined /> 司機詳情 - {selectedDriver?.displayName}</>}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            關閉
          </Button>,
          <Button
            key="review"
            type="primary"
            onClick={() => {
              setDetailModalVisible(false);
              if (selectedDriver) handleStartReview(selectedDriver);
            }}
          >
            開始審核
          </Button>,
        ]}
      >
        {selectedDriver && (
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基本資料',
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="姓名">{selectedDriver.displayName}</Descriptions.Item>
                    <Descriptions.Item label="電話">{selectedDriver.phone}</Descriptions.Item>
                    <Descriptions.Item label="Email">{selectedDriver.email}</Descriptions.Item>
                    <Descriptions.Item label="提交時間">
                      {selectedDriver.reviewSubmittedAt
                        ? new Date(selectedDriver.reviewSubmittedAt).toLocaleString('zh-TW')
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="靠行公司">
                      {selectedDriver.companyName || '未設定'}
                    </Descriptions.Item>
                    <Descriptions.Item label="統一編號">
                      {selectedDriver.companyTaxId || '未設定'}
                    </Descriptions.Item>
                    <Descriptions.Item label="車型">{selectedDriver.vehicleType || '-'}</Descriptions.Item>
                    <Descriptions.Item label="車牌">{selectedDriver.vehiclePlate || '-'}</Descriptions.Item>
                    <Descriptions.Item label="推薦人" span={2}>
                      {selectedDriver.referrer
                        ? `${selectedDriver.referrer.name} (${selectedDriver.referrer.promoCode})`
                        : '無'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'documents',
                label: `證件文件 (${selectedDriver.documents.length})`,
                children: (
                  <div className="grid grid-cols-3 gap-4">
                    {selectedDriver.documents.length === 0 ? (
                      <div className="col-span-3 text-center py-8 text-gray-500">尚未上傳文件</div>
                    ) : (
                      selectedDriver.documents.map((doc, index) => (
                        <Card key={index} size="small" title={documentTypeNames[doc.type] || doc.type}>
                          <Image
                            src={doc.url}
                            alt={doc.type}
                            style={{ maxHeight: 200, objectFit: 'contain' }}
                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgesADTIDLaQDr4wAAAAZdEVYdFNvZnR3YXJlAEFkb2JlIEltYWdlUmVhZHlxyWU8AAADImlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkU1NDY4N0EyQjA0QjExRUE4NzYwRjYxMzVBNUNGNkFDIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkU1NDY4N0EzQjA0QjExRUE4NzYwRjYxMzVBNUNGNkFDIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RTU0Njg3QTBCMDRCMTFFQTG3NjBGNjEzNUE1Q0Y2QUMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RTU0Njg3QTFCMDRCMTFFQTG3NjBGNjEzNUE1Q0Y2QUMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4B//79/Pv6+fj39vX08/Lx8O/u7ezr6uno5+bl5OPi4eDf3t3c29rZ2NfW1dTT0tHQz87NzMvKycjHxsXEw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAAAh+QQFAAAAACwAAAAAMgAyAAAE/"
                          />
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(doc.uploaded_at).toLocaleString('zh-TW')}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'vehiclePhotos',
                label: `車輛照片 (${selectedDriver.vehiclePhotos.length})`,
                children: (
                  <div className="grid grid-cols-3 gap-4">
                    {selectedDriver.vehiclePhotos.length === 0 ? (
                      <div className="col-span-3 text-center py-8 text-gray-500">尚未上傳車輛照片</div>
                    ) : (
                      selectedDriver.vehiclePhotos.map((photo, index) => (
                        <Card key={index} size="small" title={vehiclePhotoTypeNames[photo.photo_type] || photo.photo_type}>
                          <Image
                            src={photo.url}
                            alt={photo.photo_type}
                            style={{ maxHeight: 200, objectFit: 'contain' }}
                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHADTIDLaQDr4wAAAAZdEVYdFNvZnR3YXJlAEFkb2JlIEltYWdlUmVhZHlxyWU8AAADImlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkU1NDY4N0EyQjA0QjExRUE4NzYwRjYxMzVBNUNGNkFDIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkU1NDY4N0EzQjA0QjExRUE4NzYwRjYxMzVBNUNGNkFDIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RTU0Njg3QTBCMDRCMTFFQTG3NjBGNjEzNUE1Q0Y2QUMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RTU0Njg3QTFCMDRCMTFFQTG3NjBGNjEzNUE1Q0Y2QUMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4B//79/Pv6+fj39vX08/Lx8O/u7ezr6uno5+bl5OPi4eDf3t3c29rZ2NfW1dTT0tHQz87NzMvKycjHxsXEw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAAAh+QQFAAAAACwAAAAAMgAyAAAE/"
                          />
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(photo.uploaded_at).toLocaleString('zh-TW')}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* 審核模態框 */}
      <Modal
        title={<><CheckCircleOutlined /> 審核司機 - {selectedDriver?.displayName}</>}
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
      >
        <Form
          form={reviewForm}
          layout="vertical"
          onFinish={handleSubmitReview}
        >
          <Form.Item
            name="status"
            label="審核結果"
            rules={[{ required: true, message: '請選擇審核結果' }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="approved">
                  <Tag color="green" icon={<CheckCircleOutlined />}>審核通過</Tag>
                  <span className="text-gray-500 text-sm ml-2">司機可以開始接單</span>
                </Radio>
                <Radio value="missing_documents">
                  <Tag color="orange" icon={<ExclamationCircleOutlined />}>需補件</Tag>
                  <span className="text-gray-500 text-sm ml-2">文件不完整，需要補充</span>
                </Radio>
                <Radio value="rejected">
                  <Tag color="red" icon={<CloseCircleOutlined />}>審核失敗</Tag>
                  <span className="text-gray-500 text-sm ml-2">不符合資格</span>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
          >
            {({ getFieldValue }) => {
              const status = getFieldValue('status');
              const isRequired = status === 'rejected' || status === 'missing_documents';
              return (
                <Form.Item
                  name="notes"
                  label="審核備註"
                  rules={[{ required: isRequired, message: '請填寫審核備註說明原因' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder={isRequired ? '請說明原因（必填）' : '選填，可填寫審核意見'}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item className="mb-0 mt-4">
            <Space className="w-full justify-end">
              <Button onClick={() => setReviewModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                提交審核
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
