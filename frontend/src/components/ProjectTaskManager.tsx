import React, { useState } from 'react'
import { Card, Table, Tag, Progress, Space, Typography, Button, Modal, message, Row, Col, Statistic } from 'antd'
import { ReloadOutlined, EyeOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useTaskStatus } from '../hooks/useTaskStatus'
import { TaskStatus as TaskStatusType } from '../hooks/useTaskStatus'

const { Text } = Typography
const { confirm } = Modal

interface ProjectTaskManagerProps {
  projectId: string
  projectName?: string
}

export const ProjectTaskManager: React.FC<ProjectTaskManagerProps> = ({ 
  projectId
}) => {
  const { tasks, loading, loadProjectTasks } = useTaskStatus()
  const [selectedTask, setSelectedTask] = useState<TaskStatusType | null>(null)
  const [taskDetailVisible, setTaskDetailVisible] = useState(false)

  // 获取当前Project的任务
  const allTasks = tasks || []
  const projectTasks = allTasks.filter((task: TaskStatusType) => task.project_id === projectId)
  const activeTasks = projectTasks.filter((task: TaskStatusType) => 
    task.status === 'running' || task.status === 'pending'
  )
  const completedTasks = projectTasks.filter((task: TaskStatusType) => task.status === 'completed')
  const failedTasks = projectTasks.filter((task: TaskStatusType) => task.status === 'failed')

  // RefreshTask list
  const handleRefresh = () => {
    loadProjectTasks(projectId)
    message.success('Task list已Refresh')
  }

  // 查看Task details
  const handleViewTask = (task: TaskStatusType) => {
    setSelectedTask(task)
    setTaskDetailVisible(true)
  }

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    confirm({
      title: '确认Delete',
      icon: <ExclamationCircleOutlined />,
      content: 'Confirm delete这个任务吗？Delete后无法恢复。',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        message.success(`任务Deleted: ${taskId}`)
      }
    })
  }

  // 获取Status图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'running':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
    }
  }

  // 表格列定义
  const columns = [
    {
      title: 'Task name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TaskStatusType) => (
        <Space>
          {getStatusIcon(record.status)}
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'success' : status === 'running' ? 'processing' : status === 'failed' ? 'error' : status === 'pending' ? 'warning' : 'default'}>
          {status === 'completed' ? 'Completed' :
           status === 'running' ? 'Running' :
           status === 'failed' ? 'Failed' :
           status === 'pending' ? 'Waiting' : status}
        </Tag>
      )
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: TaskStatusType) => (
        <Progress 
          percent={Math.round(progress)} 
          size="small"
          status={record.status === 'failed' ? 'exception' : 'normal'}
        />
      )
    },
    {
      title: '当前步骤',
      dataIndex: 'current_step',
      key: 'current_step',
      render: (step: string) => step || '-'
    },
    {
      title: 'Created time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (timestamp: string) => (
        <Text type="secondary">
          {new Date(timestamp).toLocaleString('zh-CN')}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: TaskStatusType) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewTask(record)}
            title="查看Details"
          />
          <Button
            type="text"
            size="small"
            icon={<ExclamationCircleOutlined />}
            onClick={() => handleDeleteTask(record.id)}
            title="Delete task"
            danger
          />
        </Space>
      )
    }
  ]

  if (projectTasks.length === 0) {
    return (
      <Card title="任务管理" size="small">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text type="secondary">该ProjectNone任务记录</Text>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>任务管理</span>
          <Button 
            type="primary" 
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      }
      size="small"
    >
      {/* 任务统计 */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Statistic
            title="总任务数"
            value={projectTasks.length}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="活跃任务"
            value={activeTasks.length}
            valueStyle={{ color: '#1890ff' }}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Completed"
            value={completedTasks.length}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Failed任务"
            value={failedTasks.length}
            valueStyle={{ color: '#ff4d4f' }}
            prefix={<CloseCircleOutlined />}
          />
        </Col>
      </Row>

      {/* 活跃任务 */}
      {activeTasks.length > 0 && (
        <Card 
          size="small" 
          style={{ marginBottom: '16px' }}
          title={`活跃任务 (${activeTasks.length})`}
        >
          <Space wrap>
            {activeTasks.map((task: TaskStatusType) => (
              <div key={task.id} style={{ marginBottom: '8px' }}>
                <Text>{task.message || task.id}</Text>
                <Progress percent={task.progress} size="small" />
              </div>
            ))}
          </Space>
        </Card>
      )}

      {/* Task list */}
      <Table
        columns={columns}
        dataSource={projectTasks}
        rowKey="id"
        pagination={{
          pageSize: 5,
          showSizeChanger: false,
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
        }}
        size="small"
        loading={loading}
      />

      {/* Task details弹窗 */}
      <Modal
        title="Task details"
        open={taskDetailVisible}
        onCancel={() => setTaskDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTaskDetailVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedTask && (
          <div>
            <Text>Task ID: {selectedTask.id}</Text>
            <br />
            <Text>Status: {selectedTask.status}</Text>
            <br />
            <Text>进度: {selectedTask.progress}%</Text>
            <br />
            <Text>消息: {selectedTask.message}</Text>
          </div>
        )}
      </Modal>
    </Card>
  )
}
