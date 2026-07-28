import React, { useState, useRef, useEffect } from 'react'
import { Input, Button, Space, message, Tooltip, Modal } from 'antd'
import { EditOutlined, CheckOutlined } from '@ant-design/icons'
import { projectApi } from '../services/api'
import MagicWandIcon from './icons/MagicWandIcon'

interface EditableTitleProps {
  title: string
  clipId: string
  onTitleUpdate?: (newTitle: string) => void
  maxLength?: number
  style?: React.CSSProperties
  className?: string
}

const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  clipId,
  onTitleUpdate,
  maxLength = 200,
  style,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const inputRef = useRef<any>(null)

  // 当外部title变化时，同步内部Status
  useEffect(() => {
    setEditValue(title)
  }, [title])

  // 当title变化时，如果不在Edit模式，确保显示最新值
  useEffect(() => {
    if (!isEditing) {
      setEditValue(title)
    }
  }, [title, isEditing])

  // 进入Edit模式时聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // TextArea组件没有select方法，使用setSelectionRange代替
      if (inputRef.current.setSelectionRange) {
        inputRef.current.setSelectionRange(0, inputRef.current.value.length)
      }
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditValue(title)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setEditValue(title)
    setIsEditing(false)
  }

  const handleSave = async () => {
    const trimmedValue = editValue.trim()
    
    if (!trimmedValue) {
      message.error('Title不能为空')
      return
    }
    
    if (trimmedValue.length > maxLength) {
      message.error(`Title长度不能超过${maxLength}个字符`)
      return
    }
    
    if (trimmedValue === title) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      await projectApi.updateClipTitle(clipId, trimmedValue)
      message.success('Title更新Success')
      setIsEditing(false)
      // 先更新本地Status，再调用回调
      onTitleUpdate?.(trimmedValue)
    } catch (error: any) {
      console.error('更新TitleFailed:', error)
      message.error(error.userMessage || error.message || '更新TitleFailed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateTitle = async () => {
    console.log('开始生成Title，clipId:', clipId)
    setGenerating(true)
    try {
      const result = await projectApi.generateClipTitle(clipId)
      console.log('生成Title结果:', result)
      if (result.success && result.generated_title) {
        setEditValue(result.generated_title)
        message.success('Title生成Success，您可以继续Edit或点击Save')
      } else {
        message.error('Title生成Failed')
      }
    } catch (error: any) {
      console.error('生成TitleFailed:', error)
      message.error(error.userMessage || error.message || '生成TitleFailed')
    } finally {
      setGenerating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <Modal
        title="EditTitle"
        open={isEditing}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnClose
        maskClosable={false}
      >
        <div style={{ marginBottom: '16px' }}>
          <Input.TextArea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            maxLength={maxLength}
            placeholder="请输入Title"
            autoSize={{ minRows: 3, maxRows: 8 }}
            style={{ 
              resize: 'none',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            字符数: {editValue.length}/{maxLength}
          </div>
          <Space>
            <Tooltip title="AI生成Title">
              <Button
                icon={<MagicWandIcon />}
                loading={generating}
                onClick={() => {
                  console.log('AI生成Title按钮被点击');
                  handleGenerateTitle();
                }}
                disabled={loading}
              >
                AI生成
              </Button>
            </Tooltip>
            <Button onClick={handleCancel} disabled={loading || generating}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={loading}
              onClick={handleSave}
              disabled={generating}
            >
              Save
            </Button>
          </Space>
        </div>
      </Modal>
    )
  }

  return (
    <div
      style={{
        cursor: 'pointer',
        padding: '4px 0',
        ...style
      }}
      className={className}
      onClick={handleStartEdit}
      title="点击EditTitle"
    >
      <span style={{ 
        wordBreak: 'break-word',
        lineHeight: '1.5',
        fontSize: '14px',
        minHeight: '20px',
        display: 'inline'
      }}>
        {title}
        <EditOutlined 
          style={{ 
            color: '#1890ff', 
            fontSize: '12px',
            opacity: 0.7,
            transition: 'opacity 0.2s',
            marginLeft: '6px',
            display: 'inline'
          }}
        />
      </span>
    </div>
  )
}

export default EditableTitle
