import React, { useState, useEffect } from 'react'
import { Card, Tag, Button, Space, Typography, Popconfirm, message, Tooltip } from 'antd'
import { PlayCircleOutlined, DeleteOutlined, DownloadOutlined, ReloadOutlined, LoadingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Project } from '../store/useProjectStore'
import { projectApi } from '../services/api'
import { UnifiedStatusBar } from './UnifiedStatusBar'
// import { 
//   getProjectStatusConfig, 
//   calculateProjectProgress, 
//   normalizeProjectStatus,
//   getProgressStatus 
// } from '../utils/statusUtils'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.extend(timezone)
dayjs.extend(utc)
dayjs.locale('zh-cn')

// Add CSS animation styles
const pulseAnimation = `
  @keyframes pulse {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`

// Inject styles into page
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = pulseAnimation
  document.head.appendChild(style)
}

const { Text } = Typography

// Tracks which project ids have already had a best-effort auto-start, surviving
// component remounts (the list briefly unmounts while HomePage shows its
// loading spinner). A useRef would reset on every remount and let auto-start
// fire again, which created an infinite onRetry→loadProjects→remount loop.
// Project ids are unique per import, so once-per-session is exactly right.
const autoStartedProjectIds = new Set<string>()

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
  onRetry?: (id: string) => void
  onClick?: () => void
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete, onRetry, onClick }) => {
  const navigate = useNavigate()
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null)
  const [thumbnailLoading, setThumbnailLoading] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  // Get category information
  const getCategoryInfo = (category?: string) => {
    const categoryMap: Record<string, { name: string; icon: string; color: string }> = {
      'default': { name: 'Default', icon: '🎬', color: '#4facfe' },
      'knowledge': { name: 'Knowledge', icon: '📚', color: '#52c41a' },
      'business': { name: 'Business', icon: '💼', color: '#faad14' },
      'opinion': { name: 'Opinion', icon: '💭', color: '#722ed1' },
      'experience': { name: 'Experience', icon: '🌟', color: '#13c2c2' },
      'speech': { name: 'Speech', icon: '🎤', color: '#eb2f96' },
      'content_review': { name: 'Content Review', icon: '🎭', color: '#f5222d' },
      'entertainment': { name: 'Entertainment', icon: '🎪', color: '#fa8c16' }
    }
    return categoryMap[category || 'default'] || categoryMap['default']
  }

  // Thumbnail cache management
  const thumbnailCacheKey = `thumbnail_${project.id}`
  
  // Generate project video thumbnail with cache
  useEffect(() => {
    const generateThumbnail = async () => {
      // Prefer backend thumbnail
      if (project.thumbnail) {
        setVideoThumbnail(project.thumbnail)
        console.log(`Using backend thumbnail: ${project.id}`)
        return
      }
      
      if (!project.video_path) {
        console.log('Project has no video path:', project.id)
        return
      }
      
      // Check cache
      const cachedThumbnail = localStorage.getItem(thumbnailCacheKey)
      if (cachedThumbnail) {
        setVideoThumbnail(cachedThumbnail)
        return
      }
      
      setThumbnailLoading(true)
      
      try {
        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        video.muted = true
        video.preload = 'metadata'
        
        // Try multiple possible video paths
        const possiblePaths = [
          'input/input.mp4',
          'input.mp4',
          project.video_path,
          `${project.video_path}/input.mp4`
        ].filter(Boolean)
        
        let videoLoaded = false
        
        for (const path of possiblePaths) {
          if (videoLoaded) break
          
          try {
            const videoUrl = projectApi.getProjectFileUrl(project.id, path)
            console.log('Trying to load video:', videoUrl)
            
            await new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error('Video loading timeout'))
              }, 10000) // 10seconds timeout
              
              video.onloadedmetadata = () => {
                clearTimeout(timeoutId)
                console.log('Video metadata loaded:', videoUrl)
                video.currentTime = Math.min(5, video.duration / 4) // Take frame at 1/4 video position or 5 seconds
              }
              
              video.onseeked = () => {
                clearTimeout(timeoutId)
                try {
                  const canvas = document.createElement('canvas')
                  const ctx = canvas.getContext('2d')
                  if (!ctx) {
                    reject(new Error('Unable to get canvas context'))
                    return
                  }
                  
                  // Set suitable thumbnail size
                  const maxWidth = 320
                  const maxHeight = 180
                  const aspectRatio = video.videoWidth / video.videoHeight
                  
                  let width = maxWidth
                  let height = maxHeight
                  
                  if (aspectRatio > maxWidth / maxHeight) {
                    height = maxWidth / aspectRatio
                  } else {
                    width = maxHeight * aspectRatio
                  }
                  
                  canvas.width = width
                  canvas.height = height
                  ctx.drawImage(video, 0, 0, width, height)
                  
                  const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
                  setVideoThumbnail(thumbnail)
                  
                  // Cache thumbnail
                  try {
                    localStorage.setItem(thumbnailCacheKey, thumbnail)
                  } catch (e) {
                    // Clear old cache if localStorage is full
                    const keys = Object.keys(localStorage).filter(key => key.startsWith('thumbnail_'))
                    if (keys.length > 50) { // Keep maximum 50 thumbnail caches
                      keys.slice(0, 10).forEach(key => localStorage.removeItem(key))
                      localStorage.setItem(thumbnailCacheKey, thumbnail)
                    }
                  }
                  
                  videoLoaded = true
                  resolve(thumbnail)
                } catch (error) {
                  reject(error)
                }
              }
              
              video.onerror = (error) => {
                clearTimeout(timeoutId)
                console.error('Video loading failed:', videoUrl, error)
                reject(error)
              }
              
              video.src = videoUrl
            })
            
            break // Break loop after successful load
          } catch (error) {
            console.warn(`Path ${path} load failed:`, error)
            continue // Try next Path
          }
        }
        
        if (!videoLoaded) {
          console.error('All video paths failed')
        }
      } catch (error) {
        console.error('Error generating thumbnail:', error)
      } finally {
        setThumbnailLoading(false)
      }
    }
    
    generateThumbnail()
  }, [project.id, project.video_path, thumbnailCacheKey])

  // Check download status based on progress
  const downloadProgress = project.processing_config?.download_progress || 0
  const isDownloading = project.status === 'pending' && downloadProgress > 0 && downloadProgress < 100
  const isImporting = project.status === 'pending' && !isDownloading
  
  // Normalize status
  const normalizedStatus = project.status === 'error' ? 'failed' : 
                          isDownloading ? 'downloading' :
                          isImporting ? 'importing' : project.status
  
  // Debug information
  console.log('ProjectCard Debug:', {
    projectId: project.id,
    projectStatus: project.status,
    downloadProgress,
    isDownloading,
    isImporting,
    normalizedStatus,
    processingConfig: project.processing_config
  })

  // Auto start pending projects (except downloading projects).
  // Key: each project is auto-tried only once, no toast on failure.
  // Previously isRetrying was added to dependencies and toggled in handleRetry.
  // This caused repeated effects and POST /process requests for unfinished Bilibili projects (returning
  // 400 "Video file not found"）→ many Retry failed messages. Backend starts automatically after download.
  // pipeline, so only one best-effort start is needed.
  useEffect(() => {
    if (
      project.status === 'pending' &&
      !isDownloading &&
      !autoStartedProjectIds.has(project.id)
    ) {
      autoStartedProjectIds.add(project.id)
      // Best-effort, one-shot per project. Uploads (file already present) start
      // processing; Bilibili imports whose download isn't done yet return 400 here —
      // that's fine, the backend auto-starts the pipeline when the download
      // completes. Silent + no onRetry so this never drives the parent's
      // toast/reload path.
      handleRetry({ silent: true })
    }
  }, [project.status, project.id, isDownloading])
  
  // Calculate progress percentage
  const progressPercent = project.status === 'completed' ? 100 : 
                         project.status === 'failed' ? 0 :
                         isDownloading ? downloadProgress : // Show actual download progress
                         isImporting ? 5 : // Pending status shows 5% progress
                         project.current_step && project.total_steps ? 
                         Math.round((project.current_step / project.total_steps) * 100) : 
                         project.status === 'processing' ? 10 : 0

  const handleRetry = async (opts?: { silent?: boolean }) => {
    if (isRetrying) return

    setIsRetrying(true)
    try {
      // Use startProcessing for PENDING status, retryProcessing for others
      if (project.status === 'pending') {
        await projectApi.startProcessing(project.id)
      } else {
        await projectApi.retryProcessing(project.id)
      }
      // Let parent component handle toast / refresh. Silent auto start must not trigger parent.
      // Otherwise flow becomes handleRetryProject → loadProjects → remount → auto start again.
      // infinite loop. Only manual retry notifies parent.
      if (onRetry && !opts?.silent) {
        onRetry(project.id)
      }
    } catch (error) {
      console.error('Retry failed:', error)
      // Silent auto start failure does not notify user。
      if (!opts?.silent) {
        message.error('Retry failed, please try again')
      }
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <Card
      hoverable
      className="project-card"
      style={{
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'var(--ac-card)',
        border: '1px solid var(--ac-line)',
        boxShadow: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        marginBottom: '0px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--ac-shadow)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      bodyStyle={{
        padding: '18px 20px 20px',
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column'
      }}
      cover={
        <div
          style={{
            height: 160,
            position: 'relative',
            background: videoThumbnail
              ? `url(${videoThumbnail}) center/cover`
              : 'var(--ac-thumb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
          onClick={() => {
            // Importing projects cannot open details
            if (project.status === 'pending') {
              message.warning('Project is importing, check later')
              return
            }
            
            // Processing projects cannot open details
            if (project.status === 'processing') {
              message.warning('Project is processing, check after completion')
              return
            }
            
            if (onClick) {
              onClick()
            } else {
              navigate(`/project/${project.id}`)
            }
          }}
        >
          {/* Thumbnail loading status */}
          {thumbnailLoading && (
            <div style={{ textAlign: 'center', color: 'var(--ac-muted)' }}>
              <LoadingOutlined style={{ fontSize: '22px', marginBottom: '4px' }} />
              <div style={{ fontSize: '12px' }}>Generating cover...</div>
            </div>
          )}

          {/* Default display without thumbnail */}
          {!videoThumbnail && !thumbnailLoading && (
            <PlayCircleOutlined style={{ fontSize: '32px', color: 'var(--ac-muted)' }} />
          )}
          
          {/* Category label - top left */}
          {project.video_category && project.video_category !== 'default' && (
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px'
            }}>
              <Tag
                style={{
                  background: `${getCategoryInfo(project.video_category).color}15`,
                  border: `1px solid ${getCategoryInfo(project.video_category).color}40`,
                  borderRadius: '3px',
                  color: getCategoryInfo(project.video_category).color,
                  fontSize: '10px',
                  fontWeight: 500,
                  padding: '2px 6px',
                  lineHeight: '14px',
                  height: '18px',
                  margin: 0
                }}
              >
                <span style={{ marginRight: '2px' }}>{getCategoryInfo(project.video_category).icon}</span>
                {getCategoryInfo(project.video_category).name}
              </Tag>
            </div>
          )}
          
          {/* Remove top-right status indicator - poor readability */}
          
          {/* Update time and action buttons - move to cover bottom */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            background: 'linear-gradient(to top, rgba(0,0,0,0.42), rgba(0,0,0,0))',
            borderRadius: '0',
            padding: '10px 12px',
            height: '52px'
          }}>
            <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.92)' }}>
              {dayjs(project.created_at).tz('Asia/Shanghai').fromNow()}
            </Text>
            
            {/* Action buttons */}
            <div 
              className="card-action-buttons"
              style={{
                display: 'flex',
                gap: '4px',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              }}
            >
              {/* Failed status: show retry and delete only */}
              {normalizedStatus === 'failed' ? (
                <>
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    loading={isRetrying}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRetry()
                    }}
                    style={{
                      height: '20px',
                      width: '20px',
                      borderRadius: '3px',
                      color: '#52c41a',
                      border: '1px solid rgba(82, 196, 26, 0.5)',
                      background: 'rgba(82, 196, 26, 0.1)',
                      padding: 0,
                      minWidth: '20px',
                      fontSize: '10px'
                    }}
                  />
                  
                  <Popconfirm
                    title="Delete this project?"
                    description="Cannot be recovered after deletion"
                    onConfirm={(e) => {
                      e?.stopPropagation()
                      onDelete(project.id)
                    }}
                    onCancel={(e) => {
                      e?.stopPropagation()
                    }}
                    okText="Confirm"
                    cancelText="Cancel"
                  >
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      style={{
                        height: '20px',
                        width: '20px',
                        borderRadius: '3px',
                        color: '#ff6b6b',
                        border: '1px solid rgba(255, 107, 107, 0.5)',
                        background: 'rgba(255, 107, 107, 0.1)',
                        padding: 0,
                        minWidth: '20px',
                        fontSize: '10px'
                      }}
                    />
                  </Popconfirm>
                </>
              ) : (
                /* Other states: show download, retry and delete */
                <>
                  <Space size={4}>
                    {/* Retry button - available during processing and pending */}
                    {(normalizedStatus === 'processing' || normalizedStatus === 'importing' || project.status === 'pending') && (
                      <Tooltip title={project.status === 'pending' ? "Start processing" : "Resubmit task"}>
                        <Button
                          type="text"
                          icon={<ReloadOutlined />}
                          loading={isRetrying}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetry()
                          }}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '3px',
                            color: '#1890ff',
                            border: '1px solid rgba(24, 144, 255, 0.5)',
                            background: 'rgba(24, 144, 255, 0.1)',
                            padding: 0,
                            minWidth: '20px',
                            fontSize: '10px'
                          }}
                        />
                      </Tooltip>
                    )}
                    
                    {/* Download button - only visible when completed */}
                    {normalizedStatus === 'completed' && (
                      <Button
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Implement download feature
                          message.info('Download feature under development')
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '3px',
                          color: 'rgba(255, 255, 255, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(255, 255, 255, 0.1)',
                          padding: 0,
                          minWidth: '20px',
                          fontSize: '10px'
                        }}
                      />
                    )}
                    
                    {/* Delete button */}
                    <Popconfirm
                      title="Delete this project?"
                      description="Cannot be recovered after deletion"
                      onConfirm={(e) => {
                        e?.stopPropagation()
                        onDelete(project.id)
                      }}
                      onCancel={(e) => {
                        e?.stopPropagation()
                      }}
                      okText="Confirm"
                      cancelText="Cancel"
                    >
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '3px',
                          color: 'rgba(255, 255, 255, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(255, 255, 255, 0.1)',
                          padding: 0,
                          minWidth: '20px',
                          fontSize: '10px'
                        }}
                      />
                    </Popconfirm>
                  </Space>
                 </>
               )}
            </div>
          </div>
        </div>
      }
    >
      <div style={{ padding: '0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Project name - always on top */}
          <div style={{ marginBottom: '12px', position: 'relative' }}>
            <Tooltip title={project.name} placement="top">
              <Text 
                strong 
                style={{ 
                  fontSize: '13px', 
                  color: '#ffffff',
                  fontWeight: 600,
                  lineHeight: '16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'help',
                  height: '32px'
                }}
              >
                {project.name}
              </Text>
            </Tooltip>
          </div>
          
          {/* Status and statistics — Calm Premium, see DESIGN.md */}
          {(normalizedStatus === 'importing' || normalizedStatus === 'downloading' || normalizedStatus === 'processing' || normalizedStatus === 'failed') ? (
            // Processing / failed: progress line or final point
            <div style={{ marginBottom: '2px' }}>
              <UnifiedStatusBar
                projectId={project.id}
                status={normalizedStatus}
                downloadProgress={progressPercent}
                onStatusChange={(newStatus) => {
                  console.log(`Project ${project.id} status changed: ${normalizedStatus} -> ${newStatus}`)
                }}
                onDownloadProgressUpdate={(progress) => {
                  console.log(`Project ${project.id} download progress updated: ${progress}%`)
                }}
              />
            </div>
          ) : (
            // Completed: ● Completed  +  gray mono metadata (N clips · M collections)
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <UnifiedStatusBar
                projectId={project.id}
                status={normalizedStatus}
                downloadProgress={progressPercent}
                onStatusChange={() => {}}
              />
              <div style={{ color: 'var(--ac-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                <span className="ac-mono">{project.total_clips || 0}</span> clips
                <span style={{ margin: '0 6px' }}>·</span>
                <span className="ac-mono">{project.total_collections || 0}</span> collections
              </div>
            </div>
          )}

          {/* Detailed progress hidden - percentage shown in status block */}

        </div>
      </div>
    </Card>
  )
}

export default ProjectCard