/**
 * 简化的Project卡片组件 - 集成新的进度系统
 */

import React, { useState, useEffect } from 'react'
import { Card, Typography, Space, Button, Tag, Tooltip, Modal, message } from 'antd'
import { 
  PlayCircleOutlined, 
  EyeOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { SimpleProgressBar } from './SimpleProgressBar'
import { 
  useSimpleProgressStore, 
  isCompleted, 
  isFailed,
  SimpleProgress 
} from '../stores/useSimpleProgressStore'

const { Title, Text } = Typography

interface Project {
  id: string
  title: string
  description?: string
  status: string
  created_at: string
  updated_at: string
  video_path?: string
  srt_path?: string
  category?: string
}

interface SimpleProjectCardProps {
  project: Project
  onStartProcessing?: (projectId: string) => void
  onViewDetails?: (projectId: string) => void
  onDelete?: (projectId: string) => void
  onRetry?: (projectId: string) => void
}

export const SimpleProjectCard: React.FC<SimpleProjectCardProps> = ({
  project,
  onStartProcessing,
  onViewDetails,
  onDelete,
  onRetry
}) => {
  const navigate = useNavigate()
  const { getProgress, startPolling, stopPolling } = useSimpleProgressStore()
  const [showProgress, setShowProgress] = useState(false)
  
  const progress = getProgress(project.id)

  // 根据ProjectStatus决定是否显示进度
  useEffect(() => {
    if (project.status === 'processing') {
      setShowProgress(true)
      // 开始轮询这个Project的进度
      startPolling([project.id], 2000)
    } else {
      setShowProgress(false)
      stopPolling()
    }
  }, [project.status, project.id, startPolling, stopPolling])

  const handleStartProcessing = () => {
    if (onStartProcessing) {
      onStartProcessing(project.id)
    }
  }

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(project.id)
    } else {
      navigate(`/project/${project.id}`)
    }
  }

  const handleDelete = () => {
    Modal.confirm({
      title: '确认Delete',
      content: `Confirm deleteProject "${project.title}" 吗？此操作不可撤销。`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        if (onDelete) {
          onDelete(project.id)
        }
      }
    })
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry(project.id)
    }
  }

  // 获取Status图标和颜色
  const getStatusConfig = (status: string, progress?: SimpleProgress) => {
    if (progress && isFailed(progress.message)) {
      return {
        icon: <ExclamationCircleOutlined />,
        color: '#ff4d4f',
        text: 'Processing failed'
      }
    }
    
    if (progress && isCompleted(progress.stage)) {
      return {
        icon: <CheckCircleOutlined />,
        color: '#52c41a',
        text: 'Processing completed'
      }
    }
    
    if (status === 'processing' || (progress && !isCompleted(progress.stage))) {
      return {
        icon: <ReloadOutlined spin />,
        color: '#1890ff',
        text: 'Processing'
      }
    }
    
    return {
      icon: <PlayCircleOutlined />,
      color: '#666666',
      text: 'Waiting处理'
    }
  }

  const statusConfig = getStatusConfig(project.status, progress || undefined)
  const canStart = project.status === 'pending' || project.status === 'failed'
  const canRetry = project.status === 'failed' || (progress && isFailed(progress.message))

  return (
    <Card
      hoverable
      style={{ margin: '8px 0' }}
      actions={[
        canStart && (
          <Tooltip title="开始处理">
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={handleStartProcessing}
            >
              开始处理
            </Button>
          </Tooltip>
        ),
        canRetry && (
          <Tooltip title="重试">
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleRetry}
            >
              重试
            </Button>
          </Tooltip>
        ),
        <Tooltip title="查看Details">
          <Button 
            icon={<EyeOutlined />}
            onClick={handleViewDetails}
          >
            查看Details
          </Button>
        </Tooltip>,
        <Tooltip title="DeleteProject">
          <Button 
            danger 
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Tooltip>
      ].filter(Boolean)}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* ProjectTitle和Status */}
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={5} style={{ margin: 0, flex: 1 }}>
            {project.title}
          </Title>
          <Tag 
            color={statusConfig.color} 
            icon={statusConfig.icon}
            style={{ margin: 0 }}
          >
            {statusConfig.text}
          </Tag>
        </Space>

        {/* ProjectDescription */}
        {project.description && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {project.description}
          </Text>
        )}

        {/* 分类标签 */}
        {project.category && (
          <Tag color="blue" style={{ fontSize: '11px' }}>
            {project.category}
          </Tag>
        )}

        {/* 进度条 */}
        {showProgress && (
          <SimpleProgressBar
            projectId={project.id}
            autoStart={false} // 已经在useEffect中处理
            showDetails={true}
            onProgressUpdate={(progress) => {
              // 如果Processing completed，更新显示Status
              if (isCompleted(progress.stage)) {
                setShowProgress(false)
                message.success('ProjectProcessing completed！')
              } else if (isFailed(progress.message)) {
                message.error('ProjectProcessing failed！')
              }
            }}
          />
        )}

        {/* Time信息 */}
        <Space style={{ fontSize: '11px', color: '#999' }}>
          <Text type="secondary">
            创建: {new Date(project.created_at).toLocaleDateString()}
          </Text>
          <Text type="secondary">
            更新: {new Date(project.updated_at).toLocaleDateString()}
          </Text>
        </Space>
      </Space>
    </Card>
  )
}
