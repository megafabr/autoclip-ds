import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Progress,
  message,
  Divider,
  Row,
  Col,
  Typography,
  Alert,
  Spin
} from 'antd'
import {
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { uploadApi } from '../services/uploadApi'
import { BILIBILI_PARTITIONS } from '../services/uploadApi'

const { Option } = Select
const { TextArea } = Input
const { Text } = Typography

interface UploadModalProps {
  visible: boolean
  onCancel: () => void
  projectId: string
  clipIds: string[]
  clipTitles: string[]
  onSuccess?: () => void
}

interface UploadProgress {
  status: 'pending' | 'processing' | 'success' | 'failed'
  message: string
  progress: number
  bvid?: string
  error?: string
}

const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  onCancel,
  projectId,
  clipIds,
  clipTitles,
  onSuccess
}) => {
  const [form] = Form.useForm()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'pending',
    message: '准备Upload...',
    progress: 0
  })
  const [uploadRecordId, setUploadRecordId] = useState<string>('')
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  // 表单初始值
  const initialValues = {
    title: clipTitles.length === 1 ? clipTitles[0] : `${clipTitles[0]} 等${clipIds.length}个Video`,
    description: '',
    tags: [],
    partition_id: undefined,
    account_id: undefined
  }

  // 获取BilibiliAccount list
  const [accounts, setAccounts] = useState<any[]>([])
  useEffect(() => {
    if (visible) {
      // 调用API获取BilibiliAccount list
      uploadApi.getBilibiliAccounts()
        .then(data => {
          setAccounts(data)
        })
        .catch(error => {
          console.error('获取BilibiliAccount listFailed:', error)
          // 如果API调用Failed，使用默认Account
          setAccounts([
            { id: '1', name: '主Account', username: 'main_account' }
          ])
        })
    }
  }, [visible])

  // 提交Upload
  const handleSubmit = async (values: any) => {
    // 显示开发中提示
    message.info('Bilibili upload feature is under development，敬请期待！', 3)
    return
    
    // 原有代码已禁用
    if (!values.account_id) {
      message.error('请选择BilibiliAccount')
      return
    }

    setUploading(true)
    setUploadProgress({
      status: 'pending',
      message: '正在创建Upload task...',
      progress: 10
    })

    try {
      // 创建Upload task
      const response = await uploadApi.createUploadTask(projectId, {
        clip_ids: clipIds,
        account_id: values.account_id,
        title: values.title,
        description: values.description,
        tags: values.tags,
        partition_id: values.partition_id
      })

      setUploadRecordId(response.record_id)
      setUploadProgress({
        status: 'processing',
        message: `Upload task created，正在处理 ${response.clip_count} 个Video...`,
        progress: 30
      })

      // 开始轮询UploadStatus
      startPolling(response.record_id)

      message.success('Upload task created successfully！')
    } catch (error: any) {
      console.error('创建Upload taskFailed:', error)
      setUploadProgress({
        status: 'failed',
        message: `创建Upload taskFailed: ${error.message || '未知错误'}`,
        progress: 0,
        error: error.message
      })
      setUploading(false)
    }
  }

  // 开始轮询UploadStatus
  const startPolling = (recordId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await uploadApi.getUploadRecord(recordId)
        
        if (status.status === 'success') {
          setUploadProgress({
            status: 'success',
            message: 'UploadSuccess！',
            progress: 100,
            bvid: status.bvid
          })
          setUploading(false)
          clearInterval(interval)
          
          // 延迟Close弹窗，让用户看到SuccessStatus
          setTimeout(() => {
            onSuccess?.()
            onCancel()
          }, 2000)
        } else if (status.status === 'failed') {
          setUploadProgress({
            status: 'failed',
            message: `Upload failed: ${status.error_message || '未知错误'}`,
            progress: 0,
            error: status.error_message
          })
          setUploading(false)
          clearInterval(interval)
        } else if (status.status === 'processing') {
          setUploadProgress({
            status: 'processing',
            message: '正在Upload到Bilibili...',
            progress: 60
          })
        } else if (status.status === 'pending') {
          setUploadProgress({
            status: 'processing',
            message: '任务排队中，请稍候...',
            progress: 40
          })
        } else {
          // 其他Status，逐步增加进度
          setUploadProgress(prev => ({
            ...prev,
            message: `任务Status: ${status.status}`,
            progress: Math.min(prev.progress + 5, 90)
          }))
        }
      } catch (error) {
        console.error('获取UploadStatusFailed:', error)
        setUploadProgress({
          status: 'failed',
          message: '获取UploadStatusFailed',
          progress: 0,
          error: '网络错误'
        })
        setUploading(false)
        clearInterval(interval)
      }
    }, 2000)

    setPollingInterval(interval)
  }

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // 弹窗Close时清理Status
  const handleCancel = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    setUploading(false)
    setUploadProgress({
      status: 'pending',
      message: '准备Upload...',
      progress: 0
    })
    setUploadRecordId('')
    form.resetFields()
    onCancel()
  }

  // CancelUpload task
  const handleCancelUpload = async () => {
    if (!uploadRecordId) {
      handleCancel()
      return
    }

    try {
      // 调用CancelUploadAPI
      await uploadApi.cancelUploadTask(uploadRecordId)
      
      // 清理Status
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      setUploading(false)
      setUploadProgress({
        status: 'pending',
        message: '准备Upload...',
        progress: 0
      })
      setUploadRecordId('')
      form.resetFields()
      
      // 显示CancelSuccess消息
      message.success('Upload taskCancelled')
      onCancel()
    } catch (error) {
      console.error('Cancel upload failed:', error)
      message.error('Cancel upload failed，请重试')
    }
  }

  // 获取Status图标
  const getStatusIcon = () => {
    switch (uploadProgress.status) {
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
      case 'processing':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  // 获取进度条Status
  const getProgressStatus = () => {
    if (uploadProgress.status === 'failed') return 'exception'
    if (uploadProgress.status === 'success') return 'success'
    return 'active'
  }

  return (
    <Modal
      title={
        <Space>
          <UploadOutlined style={{ color: '#1890ff' }} />
          <span>Upload到Bilibili</span>
          {clipIds.length > 1 && (
            <Tag color="blue">{clipIds.length} 个Video</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
      maskClosable={!uploading}
      closable={!uploading}
    >
      {!uploading ? (
        // Upload表单
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="BilibiliAccount"
                name="account_id"
                rules={[{ required: true, message: '请选择BilibiliAccount' }]}
              >
                <Select placeholder="选择要使用的BilibiliAccount">
                  {accounts.map(account => (
                    <Option key={account.id} value={account.id}>
                      {account.nickname || account.username} ({account.username})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="分区"
                name="partition_id"
                rules={[{ required: true, message: '请选择Video分区' }]}
              >
                <Select placeholder="选择Video分区" showSearch>
                  {BILIBILI_PARTITIONS.map(partition => (
                    <Option key={partition.id} value={partition.id}>
                      {partition.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: '请输入Video title' }]}
          >
            <Input placeholder="输入Video title" maxLength={80} showCount />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: '请输入Video description' }]}
          >
            <TextArea
              placeholder="输入Video description"
              rows={4}
              maxLength={250}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
            extra="最多Add10个标签，用逗号分隔"
          >
            <Select
              mode="tags"
              placeholder="输入标签，按回车确认"
              maxTagCount={10}
              maxTagTextLength={20}
            />
          </Form.Item>

          <Divider />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={() => message.info('开发中，敬请期待', 3)}
                icon={<UploadOutlined />}
              >
                开始Upload
              </Button>
            </Space>
          </div>
        </Form>
      ) : (
        // Upload进度
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: '24px' }}>
            {getStatusIcon()}
            <Text style={{ marginLeft: '8px', fontSize: '16px' }}>
              {uploadProgress.message}
            </Text>
          </div>

          <Progress
            percent={uploadProgress.progress}
            status={getProgressStatus()}
            strokeWidth={8}
            style={{ marginBottom: '24px' }}
          />

          {uploadProgress.status === 'success' && uploadProgress.bvid && (
            <Alert
              message="UploadSuccess！"
              description={`BV号: ${uploadProgress.bvid}`}
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {uploadProgress.status === 'failed' && uploadProgress.error && (
            <Alert
              message="Upload failed"
              description={uploadProgress.error}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {uploadProgress.status === 'processing' && (
            <div style={{ color: '#666', fontSize: '14px' }}>
              <Spin size="small" style={{ marginRight: '8px' }} />
              正在Processing，请稍候...
              {uploadRecordId && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                  Task ID: {uploadRecordId}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            {uploadProgress.status === 'failed' && (
              <Button
                type="primary"
                onClick={() => {
                  setUploading(false)
                  setUploadProgress({
                    status: 'pending',
                    message: '准备Upload...',
                    progress: 0
                  })
                }}
                style={{ marginRight: '8px' }}
              >
                重新Upload
              </Button>
            )}
            
            <Button
              onClick={handleCancelUpload}
              disabled={uploadProgress.status === 'success'}
            >
              {uploadProgress.status === 'success' ? 'Close' : 'CancelUpload'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default UploadModal
