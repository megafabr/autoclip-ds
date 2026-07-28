import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  message, 
  Progress, 
  Tooltip, 
  Modal, 
  Descriptions,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Popconfirm
} from 'antd';
import { 
  ReloadOutlined, 
  EyeOutlined, 
  RedoOutlined, 
  StopOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { uploadApi, UploadRecord } from '../services/uploadApi';
import { BILIBILI_PARTITIONS } from '../services/uploadApi';

const { Title, Text } = Typography;

interface UploadStatusPageProps {}

const UploadStatusPage: React.FC<UploadStatusPageProps> = () => {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UploadRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 获取Upload记录
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await uploadApi.getUploadRecords();
      setRecords(data);
    } catch (error) {
      message.error('获取Upload记录Failed');
      console.error('获取Upload记录Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 重试Upload
  const handleRetry = async (recordId: string | number) => {
    message.info('Bilibili upload feature is under development，敬请期待！', 3);
    return;
    
    // 原有代码已禁用
    try {
      await uploadApi.retryUpload(recordId);
      message.success('重试任务已提交');
      fetchRecords();
    } catch (error) {
      message.error('重试Failed');
      console.error('重试Failed:', error);
    }
  };

  // CancelUpload
  const handleCancel = async (recordId: string | number) => {
    message.info('Bilibili upload feature is under development，敬请期待！', 3);
    return;
    
    // 原有代码已禁用
    try {
      await uploadApi.cancelUpload(recordId);
      message.success('任务Cancelled');
      fetchRecords();
    } catch (error) {
      message.error('CancelFailed');
      console.error('CancelFailed:', error);
    }
  };

  // DeleteUpload
  const handleDelete = async (recordId: string | number) => {
    message.info('Bilibili upload feature is under development，敬请期待！', 3);
    return;
    
    // 原有代码已禁用
    try {
      await uploadApi.deleteUpload(recordId);
      message.success('任务Deleted');
      fetchRecords();
    } catch (error) {
      message.error('DeleteFailed');
      console.error('DeleteFailed:', error);
    }
  };

  // 查看Details
  const handleViewDetail = (record: UploadRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  // 获取Status标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: 'Waiting' },
      processing: { color: 'processing', icon: <PlayCircleOutlined />, text: 'Processing' },
      success: { color: 'success', icon: <CheckCircleOutlined />, text: 'Success' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: 'Completed' },
      failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Failed' },
      cancelled: { color: 'default', icon: <StopOutlined />, text: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 获取分区Name
  const getPartitionName = (partitionId: number) => {
    const partition = BILIBILI_PARTITIONS.find(p => p.id === partitionId);
    return partition ? partition.name : `分区${partitionId}`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // 格式化Duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  // 表格列定义
  const columns = [
    {
      title: 'Task ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string | number) => <Text code style={{ color: '#ffffff' }}>{id}</Text>
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => (
        <Tooltip title={title}>
          <Text style={{ color: '#ffffff' }}>{title}</Text>
        </Tooltip>
      )
    },
    {
      title: 'UploadAccount',
      dataIndex: 'account_nickname',
      key: 'account_nickname',
      width: 120,
      render: (nickname: string, record: UploadRecord) => (
        <div>
          <div style={{ color: '#ffffff' }}>{nickname || record.account_username}</div>
          <Text type="secondary" style={{ fontSize: '12px', color: '#cccccc' }}>
            {record.account_username}
          </Text>
        </div>
      )
    },
    {
      title: '分区',
      dataIndex: 'partition_id',
      key: 'partition_id',
      width: 100,
      render: (partitionId: number) => (
        <Tag style={{ color: '#ffffff' }}>{getPartitionName(partitionId)}</Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: UploadRecord) => {
        if (record.status === 'success' || record.status === 'completed') {
          return <Progress percent={100} size="small" status="success" />;
        } else if (record.status === 'failed') {
          return <Progress percent={progress} size="small" status="exception" />;
        } else if (record.status === 'processing') {
          return <Progress percent={progress} size="small" status="active" />;
        } else {
          return <Progress percent={progress} size="small" />;
        }
      }
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (fileSize: number) => <span style={{ color: '#ffffff' }}>{formatFileSize(fileSize)}</span>
    },
    {
      title: 'Created time',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => <span style={{ color: '#ffffff' }}>{new Date(date).toLocaleString()}</span>
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_unused: unknown, record: UploadRecord) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined style={{ color: '#4facfe' }} />} 
            onClick={() => handleViewDetail(record)}
            size="small"
            style={{ color: '#4facfe' }}
          >
            Details
          </Button>
          {record.status === 'failed' && (
            <Popconfirm
              title="Confirm重试这个Upload task吗？"
              onConfirm={() => handleRetry(record.id)}
              okText="Confirm"
              cancelText="Cancel"
            >
              <Button 
                type="link" 
                icon={<RedoOutlined style={{ color: '#4facfe' }} />} 
                size="small"
                style={{ color: '#4facfe' }}
              >
                重试
              </Button>
            </Popconfirm>
          )}
          {(record.status === 'pending' || record.status === 'processing') && (
            <Popconfirm
              title="Confirm cancel这个Upload task吗？"
              onConfirm={() => handleCancel(record.id)}
              okText="Confirm"
              cancelText="Cancel"
            >
              <Button 
                type="link" 
                icon={<StopOutlined style={{ color: '#ff4d4f' }} />} 
                danger
                size="small"
                style={{ color: '#ff4d4f' }}
              >
                Cancel
              </Button>
            </Popconfirm>
          )}
          {(record.status === 'success' || record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') && (
            <Popconfirm
              title="ConfirmDelete这个Upload task吗？Delete后无法恢复。"
              onConfirm={() => handleDelete(record.id)}
              okText="Confirm"
              cancelText="Cancel"
            >
              <Button 
                type="link" 
                icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} 
                danger
                size="small"
                style={{ color: '#ff4d4f' }}
              >
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // 统计信息
  const getStatistics = () => {
    const safeRecords = Array.isArray(records) ? records : [];
    const total = safeRecords.length;
    const success = safeRecords.filter(r => r.status === 'success' || r.status === 'completed').length;
    const failed = safeRecords.filter(r => r.status === 'failed').length;
    const processing = safeRecords.filter(r => r.status === 'processing').length;
    const pending = safeRecords.filter(r => r.status === 'pending').length;
    
    return { total, success, failed, processing, pending };
  };

  const stats = getStatistics();

  useEffect(() => {
    fetchRecords();
    // 每30秒自动Refresh
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px', background: '#141414', minHeight: '100vh' }}>
      <style>
        {`
          .dark-table .ant-table-thead > tr > th {
            background: #262626 !important;
            color: #ffffff !important;
            border-bottom: 1px solid #404040 !important;
            font-weight: 600 !important;
          }
          .dark-table .ant-table-tbody > tr > td {
            background: #1f1f1f !important;
            color: #ffffff !important;
            border-bottom: 1px solid #303030 !important;
          }
          .dark-table .ant-table-tbody > tr:hover > td {
            background: #262626 !important;
          }
          .dark-table .ant-pagination .ant-pagination-item {
            background: #262626 !important;
            border-color: #404040 !important;
          }
          .dark-table .ant-pagination .ant-pagination-item a {
            color: #ffffff !important;
          }
          .dark-table .ant-pagination .ant-pagination-item-active {
            background: #1890ff !important;
          }
          .dark-table .ant-pagination .ant-pagination-item-active a {
            color: #ffffff !important;
          }
          /* 确保所有文字都是白色 */
          .dark-table .ant-typography,
          .dark-table .ant-typography-caption,
          .dark-table .ant-typography-text,
          .dark-table .ant-typography-paragraph {
            color: #ffffff !important;
          }
          /* 确保链接按钮文字可见 */
          .dark-table .ant-btn-link {
            color: #4facfe !important;
          }
          .dark-table .ant-btn-link:hover {
            color: #00a8ff !important;
          }
          .dark-table .ant-btn-link.ant-btn-dangerous {
            color: #ff4d4f !important;
          }
          .dark-table .ant-btn-link.ant-btn-dangerous:hover {
            color: #ff7875 !important;
          }
          /* 确保图标颜色正确 */
          .dark-table .anticon {
            color: inherit !important;
          }
          /* 确保标签文字可见 */
          .dark-table .ant-tag {
            color: #ffffff !important;
          }
          .dark-table .ant-tag-blue {
            color: #4facfe !important;
          }
          .dark-table .ant-tag-green {
            color: #52c41a !important;
          }
          .dark-table .ant-tag-red {
            color: #ff4d4f !important;
          }
          .dark-table .ant-tag-orange {
            color: #faad14 !important;
          }
          /* 确保进度条文字可见 */
          .dark-table .ant-progress-text {
            color: #ffffff !important;
          }
          /* 确保分页器所有元素可见 */
          .dark-table .ant-pagination-prev,
          .dark-table .ant-pagination-next {
            color: #ffffff !important;
          }
          .dark-table .ant-pagination-prev:hover,
          .dark-table .ant-pagination-next:hover {
            color: #4facfe !important;
          }
          .dark-table .ant-pagination-options .ant-select-selector {
            color: #ffffff !important;
          }
          .dark-table .ant-pagination-options .ant-select-selection-item {
            color: #ffffff !important;
          }
          /* 模态框样式 */
          .dark-modal .ant-modal-content {
            background: #1f1f1f !important;
            border: 1px solid #303030 !important;
          }
          .dark-modal .ant-modal-header {
            background: #1f1f1f !important;
            border-bottom: 1px solid #303030 !important;
          }
          .dark-modal .ant-modal-title {
            color: #ffffff !important;
          }
          .dark-modal .ant-modal-body {
            background: #1f1f1f !important;
            color: #ffffff !important;
          }
          .dark-modal .ant-modal-close {
            color: #ffffff !important;
          }
          .dark-modal .ant-modal-close:hover {
            color: #4facfe !important;
          }
        `}
      </style>
      <Card style={{ background: '#1f1f1f', border: '1px solid #303030' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0, color: '#ffffff' }}>Upload taskStatus</Title>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={fetchRecords}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card style={{ background: '#262626', border: '1px solid #404040' }}>
              <Statistic 
                title={<span style={{ color: '#ffffff' }}>总任务数</span>} 
                value={stats.total} 
                valueStyle={{ color: '#ffffff' }} 
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#262626', border: '1px solid #404040' }}>
              <Statistic 
                title={<span style={{ color: '#ffffff' }}>Success</span>} 
                value={stats.success} 
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#262626', border: '1px solid #404040' }}>
              <Statistic 
                title={<span style={{ color: '#ffffff' }}>Failed</span>} 
                value={stats.failed} 
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#262626', border: '1px solid #404040' }}>
              <Statistic 
                title={<span style={{ color: '#ffffff' }}>Processing</span>} 
                value={stats.processing + stats.pending} 
                valueStyle={{ color: '#1890ff' }}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Task list */}
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          scroll={{ x: 1200 }}
          style={{ background: '#1f1f1f' }}
          className="dark-table"
        />
      </Card>

      {/* Details模态框 */}
      <Modal
        title="Upload taskDetails"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
        style={{ background: '#1f1f1f' }}
        styles={{
          body: { background: '#1f1f1f', color: '#ffffff' },
          header: { background: '#1f1f1f', color: '#ffffff', borderBottom: '1px solid #303030' }
        }}
        className="dark-modal"
      >
        {selectedRecord && (
          <div>
            <Descriptions 
              column={2} 
              bordered
              labelStyle={{ 
                background: '#1f1f1f', 
                color: '#ffffff',
                fontWeight: 'bold',
                borderRight: '1px solid #303030'
              }}
              contentStyle={{ 
                background: '#262626', 
                color: '#ffffff',
                borderLeft: '1px solid #303030'
              }}
              style={{ 
                background: '#262626',
                border: '1px solid #303030'
              }}
            >
              <Descriptions.Item label="Task ID" span={1}>
                <Text code style={{ color: '#ffffff' }}>{selectedRecord.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={1}>
                {getStatusTag(selectedRecord.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Title" span={2}>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="UploadAccount" span={1}>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.account_nickname || selectedRecord.account_username}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="分区" span={1}>
                <Tag>{getPartitionName(selectedRecord.partition_id)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ProjectName" span={1}>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.project_name || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ClipID" span={1}>
                <Text code style={{ color: '#ffffff' }}>{selectedRecord.clip_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="进度" span={2}>
                <Progress 
                  percent={selectedRecord.progress} 
                  status={
                    selectedRecord.status === 'failed' ? 'exception' :
                    selectedRecord.status === 'success' || selectedRecord.status === 'completed' ? 'success' :
                    selectedRecord.status === 'processing' ? 'active' : 'normal'
                  }
                />
              </Descriptions.Item>
              <Descriptions.Item label="文件大小" span={1}>
                <Text style={{ color: '#ffffff' }}>{formatFileSize(selectedRecord.file_size)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="UploadDuration" span={1}>
                <Text style={{ color: '#ffffff' }}>{formatDuration(selectedRecord.upload_duration)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="BV号" span={1}>
                {selectedRecord.bv_id ? <Text code style={{ color: '#ffffff' }}>{selectedRecord.bv_id}</Text> : <Text style={{ color: '#ffffff' }}>-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="AV号" span={1}>
                {selectedRecord.av_id ? <Text code style={{ color: '#ffffff' }}>{selectedRecord.av_id}</Text> : <Text style={{ color: '#ffffff' }}>-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Created time" span={1}>
                <Text style={{ color: '#ffffff' }}>{new Date(selectedRecord.created_at).toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="更新Time" span={1}>
                <Text style={{ color: '#ffffff' }}>{new Date(selectedRecord.updated_at).toLocaleString()}</Text>
              </Descriptions.Item>
            </Descriptions>

            {selectedRecord.description && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5} style={{ color: '#ffffff' }}>Description</Title>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.description}</Text>
              </div>
            )}

            {selectedRecord.tags && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5} style={{ color: '#ffffff' }}>标签</Title>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.tags}</Text>
              </div>
            )}

            {selectedRecord.error_message && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5} style={{ color: '#ffffff' }}>错误信息</Title>
                <Alert
                  message="Upload failed"
                  description={selectedRecord.error_message}
                  type="error"
                  showIcon
                />
              </div>
            )}

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <Space>
                {selectedRecord.status === 'failed' && (
                  <Popconfirm
                    title="Confirm重试这个Upload task吗？"
                    onConfirm={() => {
                      handleRetry(selectedRecord.id);
                      setDetailModalVisible(false);
                    }}
                    okText="Confirm"
                    cancelText="Cancel"
                  >
                    <Button type="primary" icon={<RedoOutlined />}>
                      重试
                    </Button>
                  </Popconfirm>
                )}
                <Button onClick={() => setDetailModalVisible(false)}>
                  Close
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UploadStatusPage;
