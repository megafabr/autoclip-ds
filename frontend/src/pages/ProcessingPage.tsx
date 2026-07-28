import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Card, Progress, Steps, Typography, Button, Alert, Space, Spin, message } from 'antd'
import { CheckCircleOutlined, LoadingOutlined, ExclamationCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { projectApi } from '../services/api'
import { useProjectStore } from '../store/useProjectStore'

const { Content } = Layout
const { Title, Text } = Typography
const { Step } = Steps

interface ProcessingStatus {
  status: 'processing' | 'completed' | 'error'
  current_step: number
  total_steps: number
  step_name: string
  progress: number
  error_message?: string
}

const ProcessingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject } = useProjectStore()
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const steps = [
    { title: '大纲提取', description: '从Video转写文本中提取结构性大纲' },
    { title: 'Time定位', description: '基于SRT字幕定位话题Time区间' },
    { title: 'ContentScore', description: '多维度评估Clip质量与传播潜力' },
    { title: 'Title生成', description: '为高分Clip生成吸引人的Title' },
    { title: '主题聚类', description: '将相关Clip聚合为CollectionRecommended' },
    { title: 'Video切割', description: '使用FFmpeg生成Clip与CollectionVideo' }
  ]

  useEffect(() => {
    if (!id) return
    
    loadProject()
    const interval = setInterval(checkStatus, 2000) // 每2秒检查一次Status
    
    return () => clearInterval(interval)
  }, [id])

  const loadProject = async () => {
    if (!id) return
    
    try {
      const project = await projectApi.getProject(id)
      setCurrentProject(project)
      
      // 如果ProjectCompleted，直接跳转到Details页
      if (project.status === 'completed') {
        navigate(`/project/${id}`)
        return
      }
      
      // 如果ProjectStatus是Waiting处理，开始处理
      if (project.status === 'pending') {
        await startProcessing()
      }
    } catch (error) {
      message.error('加载ProjectFailed')
      console.error('Load project error:', error)
    } finally {
      setLoading(false)
    }
  }

  const startProcessing = async () => {
    if (!id) return
    
    try {
      await projectApi.startProcessing(id)
      message.success('开始处理Project')
    } catch (error) {
      message.error('启动Processing failed')
      console.error('Start processing error:', error)
    }
  }

  const checkStatus = async () => {
    if (!id) return
    
    try {
      const statusData = await projectApi.getProcessingStatus(id)
      setStatus(statusData)
      
      // 如果Processing completed，跳转到Project details页
      if (statusData.status === 'completed') {
        message.success('🎉 VideoProcessing completed！正在跳转到结果页面...')
        setTimeout(() => {
          navigate(`/project/${id}`)
        }, 2000)
      }
      
      // 如果Processing failed，显示详细错误信息
      if (statusData.status === 'error') {
        const errorMsg = statusData.error_message || '处理过程中发生未知错误'
        message.error(`Processing failed: ${errorMsg}`)
        
        // 提供重试选项
        message.info('您可以返回首页重新Upload文件或联系技术支持', 5)
      }
      
    } catch (error: any) {
      console.error('Check status error:', error)
      
      // 根据错误类型提供不同的处理建议
      if (error.response?.status === 404) {
        message.error('Project不存在或已被Delete')
        setTimeout(() => navigate('/'), 2000)
      } else if (error.code === 'ECONNABORTED') {
        message.warning('网络连接超时，正在重试...')
      } else {
        message.error('获取处理StatusFailed，请Refresh页面重试')
      }
    }
  }

  const getStepStatus = (stepIndex: number) => {
    if (!status) return 'wait'
    
    if (status.status === 'error') {
      return stepIndex < status.current_step ? 'finish' : 'error'
    }
    
    if (stepIndex < status.current_step) return 'finish'
    if (stepIndex === status.current_step) return 'process'
    return 'wait'
  }

  const getStepIcon = (stepIndex: number) => {
    const stepStatus = getStepStatus(stepIndex)
    
    if (stepStatus === 'finish') return <CheckCircleOutlined />
    if (stepStatus === 'process') return <LoadingOutlined />
    if (stepStatus === 'error') return <ExclamationCircleOutlined />
    return null
  }

  if (loading) {
    return (
      <Content style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </Content>
    )
  }

  return (
    <Content style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={2}>Video processing progress</Title>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/')}
          >
            返回首页
          </Button>
        </div>

        {currentProject && (
          <Card>
            <Title level={4}>{currentProject.name}</Title>
            <Text type="secondary">ProjectID: {currentProject.id}</Text>
          </Card>
        )}

        {status?.status === 'error' && (
          <Alert
            message="Processing failed"
            description={
              <div>
                <p>{status.error_message || '处理过程中发生未知错误'}</p>
                <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  可能的原因：文件格式不支持、文件损坏、网络问题或服务器错误
                </p>
              </div>
            }
            type="error"
            showIcon
            action={
              <Space>
                <Button size="small" onClick={() => window.location.reload()}>
                  Refresh页面
                </Button>
                <Button size="small" onClick={() => navigate('/')}>
                  返回首页
                </Button>
              </Space>
            }
          />
        )}

        {status && status.status === 'processing' && (
          <Card title="处理进度">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>总体进度</Text>
                  <Text>{Math.round(status.progress)}%</Text>
                </div>
                <Progress 
                  percent={status.progress} 
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>

              <div>
                <Text strong>当前步骤: </Text>
                <Text>{status.step_name}</Text>
              </div>

              <Steps 
                direction="vertical" 
                current={status.current_step}
                status="process"
              >
                {steps.map((step, index) => (
                  <Step
                    key={index}
                    title={step.title}
                    description={step.description}
                    status={getStepStatus(index)}
                    icon={getStepIcon(index)}
                  />
                ))}
              </Steps>
            </Space>
          </Card>
        )}

        {status?.status === 'completed' && (
          <Alert
            message="Processing completed"
            description="VideoSuccessProcessing completed，正在跳转到Project details页..."
            type="success"
            showIcon
          />
        )}
      </Space>
    </Content>
  )
}

export default ProcessingPage