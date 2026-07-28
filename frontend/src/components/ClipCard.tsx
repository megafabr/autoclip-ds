import React, { useState, useEffect, useRef } from 'react'
import { Card, Button, Tooltip, Modal, message } from 'antd'
import { PlayCircleOutlined, DownloadOutlined, ClockCircleOutlined, StarFilled, UploadOutlined } from '@ant-design/icons'
import ReactPlayer from 'react-player'
import { Clip } from '../store/useProjectStore'
import BilibiliManager from './BilibiliManager'
import EditableTitle from './EditableTitle'
import './ClipCard.css'

interface ClipCardProps {
  clip: Clip
  videoUrl?: string
  onDownload: (clipId: string) => void
  projectId?: string
  onClipUpdate?: (clipId: string, updates: Partial<Clip>) => void
}

const ClipCard: React.FC<ClipCardProps> = ({ 
  clip, 
  videoUrl, 
  onDownload,
  projectId,
  onClipUpdate
}) => {
  const [showPlayer, setShowPlayer] = useState(false)
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null)
  const [showBilibiliManager, setShowBilibiliManager] = useState(false)
  const playerRef = useRef<ReactPlayer>(null)

  // Generate video thumbnail
  useEffect(() => {
    if (videoUrl) {
      generateThumbnail()
    }
  }, [videoUrl])

  const generateThumbnail = () => {
    if (!videoUrl) return
    
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.currentTime = 1 // Get first second frame as thumbnail
    
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
      setVideoThumbnail(thumbnail)
    }
    
    video.src = videoUrl
  }

  const handleDownloadWithTitle = async () => {
    try {
      // Direct API callDownload method handles filename
      await onDownload(clip.id)
    } catch (error) {
      console.error('Download failed:', error)
      message.error('Download failed')
    }
  }

  const handleClosePlayer = () => {
    setShowPlayer(false)
  }

  const handleTitleUpdate = (newTitle: string) => {
    // Update local state
    onClipUpdate?.(clip.id, { title: newTitle })
  }


  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0
    
    try {
      // Parse time format "HH:MM:SS,mmm" or "HH:MM:SS.mmm"
      const parseTime = (timeStr: string): number => {
        const normalized = timeStr.replace(',', '.')
        const parts = normalized.split(':')
        if (parts.length !== 3) return 0
        
        const hours = parseInt(parts[0]) || 0
        const minutes = parseInt(parts[1]) || 0
        const seconds = parseFloat(parts[2]) || 0
        
        return hours * 3600 + minutes * 60 + seconds
      }
      
      const start = parseTime(startTime)
      const end = parseTime(endTime)
      
      return Math.max(0, end - start)
    } catch (error) {
      console.error('Error calculating duration:', error)
      return 0
    }
  }

  const getDuration = () => {
    if (!clip.start_time || !clip.end_time) return '00:00'
    const start = clip.start_time.replace(',', '.')
    const end = clip.end_time.replace(',', '.')
    return `${start.substring(0, 8)} - ${end.substring(0, 8)}`
  }


  // Get description content
  const getDisplayContent = () => {
    // Prefer recommendation reason (AI generated key points)
    if (clip.recommend_reason && clip.recommend_reason.trim()) {
      return clip.recommend_reason
    }
    
    // If no recommendation reason, try getting key points from content
    if (clip.content && Array.isArray(clip.content) && clip.content.length > 0) {
      // Filter possible transcript text(usually transcript text is long and contains punctuation)
      const contentPoints = clip.content.filter(item => {
        const text = item.trim()
        // Text over 100 chars or many symbols may be transcript
        if (text.length > 100) return false
        if (text.split(/[，。！？；：""''（）【】]/).length > 3) return false
        return true
      })
      
      if (contentPoints.length > 0) {
        return contentPoints.join(' ')
      }
    }
    
    // Fallback to outline
    if (clip.outline && clip.outline.trim()) {
      return clip.outline
    }
    
    return 'No key points available'
  }

  const textRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <Card
          className="clip-card"
          hoverable
          style={{ 
            height: '380px',
            borderRadius: '16px',
            border: '1px solid var(--ac-line)',
            background: 'var(--ac-card)',
            overflow: 'hidden',
            cursor: 'pointer'
          }}
          styles={{
            body: {
              padding: 0,
            },
          }}
          cover={
            <div 
              style={{ 
                height: '200px', 
                background: videoThumbnail 
                  ? `url(${videoThumbnail}) center/cover` 
                  : 'var(--ac-thumb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
              onClick={() => setShowPlayer(true)}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.3s ease'
                }}
                className="video-overlay"
              >
                <PlayCircleOutlined style={{ fontSize: '40px', color: 'rgba(255,255,255,0.95)' }} />
              </div>
              
              {/* Top right recommendation score — calm glass capsule + mono number */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(6px)',
                  color: 'rgba(255,255,255,0.95)',
                  padding: '4px 9px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <StarFilled style={{ fontSize: '10px', opacity: 0.85 }} />
                <span className="ac-mono">{(clip.final_score * 100).toFixed(0)}</span>
              </div>
              
              {/* Bottom left time range — glass capsule + mono */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(6px)',
                  color: 'rgba(255,255,255,0.95)',
                  padding: '4px 9px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <ClockCircleOutlined style={{ fontSize: '11px', opacity: 0.85 }} />
                <span className="ac-mono">{getDuration()}</span>
              </div>

              {/* Bottom right video duration — glass capsule + mono */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(6px)',
                  color: 'rgba(255,255,255,0.95)',
                  padding: '4px 9px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span className="ac-mono">{formatDuration(calculateDuration(clip.start_time, clip.end_time))}</span>
              </div>
            </div>
          }
        >
          <div style={{ 
            padding: '16px', 
            height: '180px', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Content area - fixed height */}
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0 // Allow flex items to shrink
            }}>
              {/* Title area - fixed height */}
              <div style={{ 
                height: '44px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <EditableTitle
                  title={clip.title || clip.generated_title || 'Unnamed Clip'}
                  clipId={clip.id}
                  onTitleUpdate={handleTitleUpdate}
                  style={{ 
                    fontSize: '16px',
                    fontWeight: 600,
                    lineHeight: '1.4',
                    color: 'var(--ac-ink)',
                    width: '100%'
                  }}
                />
              </div>
              
              {/* Key points area - fixed height */}
              <div style={{ 
                height: '58px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <Tooltip 
                  title={getDisplayContent()} 
                  placement="top" 
                  overlayStyle={{ maxWidth: '300px' }}
                  mouseEnterDelay={0.5}
                >
                  <div 
                    ref={textRef}
                    style={{ 
                      fontSize: '13px',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.5',
                      color: 'var(--ac-sub)',
                      cursor: 'pointer',
                      wordBreak: 'break-word',
                      textOverflow: 'ellipsis',
                      width: '100%'
                    }}
                  >
                    {getDisplayContent()}
                  </div>
                </Tooltip>
              </div>
            </div>
            
            {/* Action buttons - fixed bottom */}
            <div style={{ 
              display: 'flex', 
              gap: '8px',
              height: '28px',
              alignItems: 'center',
              marginTop: 'auto'
            }}>
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => setShowPlayer(true)}
                style={{
                  color: 'var(--ac-ink)',
                  border: '1px solid var(--ac-line)',
                  borderRadius: '999px',
                  fontSize: '12px',
                  height: '28px',
                  padding: '0 14px',
                  background: 'transparent'
                }}
              >
                Play
              </Button>
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={handleDownloadWithTitle}
                style={{
                  color: 'var(--ac-sub)',
                  border: '1px solid var(--ac-line)',
                  borderRadius: '999px',
                  fontSize: '12px',
                  height: '28px',
                  padding: '0 14px',
                  background: 'transparent'
                }}
              >
                Download
              </Button>
              <Button
                type="text"
                size="small"
                icon={<UploadOutlined />}
                onClick={() => message.info('Coming soon', 3)}
                style={{
                  color: 'var(--ac-sub)',
                  border: '1px solid var(--ac-line)',
                  borderRadius: '999px',
                  fontSize: '12px',
                  height: '28px',
                  padding: '0 14px',
                  background: 'transparent'
                }}
              >
                Upload
              </Button>
            </div>
          </div>
        </Card>

      {/* Video Play modal */}
      <Modal
        open={showPlayer}
        onCancel={handleClosePlayer}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadWithTitle}>
            Download video
          </Button>,
          <Button 
            key="upload" 
            type="default" 
            icon={<UploadOutlined />} 
            onClick={() => message.info('Coming soon', 3)}
          >
            Upload to Bilibili
          </Button>
        ]}
        width={800}
        centered
        destroyOnClose
        styles={{
          header: {
            borderBottom: '1px solid #303030',
            background: 'var(--ac-card)'
          }
        }}
        closeIcon={
          <span style={{ color: 'var(--ac-ink)', fontSize: '16px' }}>×</span>
        }
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            width: '100%',
            paddingRight: '30px' // Reserve space for close button
          }}>
            <EditableTitle
              title={clip.title || clip.generated_title || 'Video Preview'}
              clipId={clip.id}
              onTitleUpdate={(newTitle) => {
                // Update clip title
                console.log('Player title updated:', newTitle)
                // Trigger parent component update callback here
                if (onClipUpdate) {
                  onClipUpdate(clip.id, { title: newTitle })
                }
              }}
              style={{ 
                color: 'var(--ac-ink)',
                fontSize: '16px', 
                fontWeight: '500',
                flex: 1,
                maxWidth: 'calc(100% - 40px)' // Ensure no overlap with close button
              }}
            />
          </div>
        }
      >
        {videoUrl && (
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            width="100%"
            height="400px"
            controls
            playing={showPlayer}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload',
                  preload: 'metadata'
                },
                forceHLS: false,
                forceDASH: false
              }
            }}
            onReady={() => {
              console.log('Video ready for seeking')
            }}
            onError={(error) => {
              console.error('ReactPlayer error:', error)
            }}
          />
        )}
      </Modal>

      {/* Bilibili management modal */}
      <BilibiliManager
        visible={showBilibiliManager}
        onClose={() => setShowBilibiliManager(false)}
        projectId={projectId || ''}
        clipIds={[clip.id]}
        clipTitles={[clip.title || clip.generated_title || 'Video Clip']}
        onUploadSuccess={() => {
          // After upload success refresh data or show notification
          console.log('Upload successful')
        }}
      />
    </>
  )
}

export default ClipCard
