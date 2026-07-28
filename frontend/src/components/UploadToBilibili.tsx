import React from 'react'
import { Card, Tag, Space, Typography } from 'antd'
import { BILIBILI_PARTITIONS } from '../services/uploadApi'

const { Text } = Typography

interface UploadToBilibiliProps {
  partitionId?: number
}

const UploadToBilibili: React.FC<UploadToBilibiliProps> = ({ partitionId }) => {
  // Получить название раздела
  const getPartitionName = (id: number) => {
    const partition = BILIBILI_PARTITIONS.find(p => p.id === id)
    return partition ? partition.name : 'Неизвестный раздел'
  }

  return (
    <Card
      title={
        <Space>
          <span>Информация о разделе Bilibili</span>
          {partitionId && (
            <Tag color="blue">Текущий раздел: {getPartitionName(partitionId)}</Tag>
          )}
        </Space>
      }
      size="small"
      style={{ marginBottom: '16px' }}
    >
      <div>
        <Text type="secondary">
          Поддерживаемые типы разделов: анимация, игры, музыка, знания, развлечения, кино, технологии и цифровые устройства
        </Text>
        <div style={{ marginTop: '12px' }}>
          <Text strong>ID раздела: </Text>
          <Text code>{partitionId || 'Не задано'}</Text>
        </div>
      </div>
    </Card>
  )
}

export default UploadToBilibili

