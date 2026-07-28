import React, { useState, useEffect } from 'react'
import { 
  Layout, 
  Typography, 
  Select, 
  Spin, 
  Empty,
  message 
} from 'antd'
import { useNavigate } from 'react-router-dom'
import ProjectCard from '../components/ProjectCard'
import FileUpload from '../components/FileUpload'
import BilibiliDownload from '../components/BilibiliDownload'

import { projectApi } from '../services/api'
import { useSimpleProgressStore } from '../stores/useSimpleProgressStore'
import { Project, useProjectStore } from '../store/useProjectStore'
import { useProjectPolling } from '../hooks/useProjectPolling'

const { Content } = Layout
const { Title, Text } = Typography
const { Option } = Select

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { projects, setProjects, deleteProject, loading, setLoading } = useProjectStore()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'upload' | 'bilibili'>('bilibili')

  // Использование Hook опроса состояния проектов
  useProjectPolling({
    onProjectsUpdate: (updatedProjects) => {
      setProjects(updatedProjects || [])
    },
    enabled: true,
    interval: 30000 // Опрос каждые 30 секунд для снижения количества запросов
  })

  // Глобальная защита: если нет активных проектов, остановить опрос прогресса и очистить кеш
  useEffect(() => {
    const hasActive = projects.some(p => p.status === 'processing' || p.status === 'pending')
    if (!hasActive) {
      try {
        const { stopPolling, clearAllProgress } = useSimpleProgressStore.getState()
        stopPolling()
        clearAllProgress()
        console.log('Нет активных проектов, опрос прогресса остановлен, кеш очищен')
      } catch (e) {
        console.warn('Ошибка остановки глобального опроса прогресса:', e)
      }
    }
  }, [projects])

  useEffect(() => {
    // Отложенная загрузка проектов, чтобы избежать большого количества запросов при запуске
    const timer = setTimeout(() => {
      loadProjects()
    }, 1000) // Загрузка через 1 секунду
    
    return () => clearTimeout(timer)
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      // Получение реальных данных проектов через Backend API
      const projects = await projectApi.getProjects()
      // Проверка, что projects является массивом
      const safeProjects = Array.isArray(projects) ? projects : []
      setProjects(safeProjects)
    } catch (error) {
      message.error('Не удалось загрузить проекты')
      console.error('Load projects error:', error)
      // Если API недоступен, использовать пустой список
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (id: string) => {
    try {
      await projectApi.deleteProject(id)
      deleteProject(id)
      message.success('Проект успешно удалён')
    } catch (error) {
      message.error('Не удалось удалить проект')
      console.error('Delete project error:', error)
    }
  }

  // Called by ProjectCard after user retry succeeds.
  // ProjectCard.handleRetry already sent start/retryProcessing request. Here we only:
  // show notification and refresh list. Never send another retry request (avoids duplicate requests:
  // loadProjects → remount → auto-start loop).
  const handleRetryProject = async () => {
    message.success('Повторная обработка проекта запущена')
    try {
      await loadProjects()
    } catch (error) {
      console.error('Refresh after retry error:', error)
    }
  }

  const handleProjectCardClick = (project: Project) => {
    // Projects in importing state cannot open details page
    if (project.status === 'pending') {
      message.warning('Проект импортируется, попробуйте открыть детали позже')
      return
    }
    
    // Other states can open details page normally
    navigate(`/project/${project.id}`)
  }

  const filteredProjects = (projects || [])
    .filter(project => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      return matchesStatus
    })
    .sort((a, b) => {
      // Sort by creation time descending, newest first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  return (
    <Layout style={{
      minHeight: '100vh',
      background: 'var(--ac-bg)'
    }}>
      <Content style={{ padding: '40px 56px 56px', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          {/* Область загрузки файлов */}
          <div style={{ 
            marginBottom: '48px',
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{ width: '100%', maxWidth: '820px' }}>
              <div style={{ fontSize: '13px', color: 'var(--ac-muted)', margin: '0 4px 14px', letterSpacing: '0.2px' }}>
                Вставьте ссылку, AI автоматически создаст фрагменты
              </div>
              <div style={{
                background: 'var(--ac-card)',
                borderRadius: '16px',
                border: '1px solid var(--ac-line)',
                padding: '18px',
                boxShadow: 'var(--ac-shadow)'
              }}>
              {/* Переключение вкладок — сегментный режим */}
              <div style={{
                display: 'inline-flex',
                marginBottom: '14px',
                borderRadius: '999px',
                background: 'var(--ac-line-2)',
                padding: '3px',
                gap: '2px'
              }}>
                 <button
                   style={{
                     padding: '8px 18px',
                     borderRadius: '999px',
                     background: activeTab === 'bilibili' ? 'var(--ac-card)' : 'transparent',
                     color: activeTab === 'bilibili' ? 'var(--ac-ink)' : 'var(--ac-sub)',
                     cursor: 'pointer',
                     fontSize: '14px',
                     fontWeight: 500,
                     transition: 'all 0.2s ease',
                     border: 'none',
                     boxShadow: activeTab === 'bilibili' ? '0 1px 2px rgba(0,0,0,.08)' : 'none'
                   }}
                   onClick={() => setActiveTab('bilibili')}
                 >
                   Импорт по ссылке
                 </button>
                <button
                   style={{
                     padding: '8px 18px',
                     borderRadius: '999px',
                     background: activeTab === 'upload' ? 'var(--ac-card)' : 'transparent',
                     color: activeTab === 'upload' ? 'var(--ac-ink)' : 'var(--ac-sub)',
                     cursor: 'pointer',
                     fontSize: '14px',
                     fontWeight: 500,
                     transition: 'all 0.2s ease',
                     border: 'none',
                     boxShadow: activeTab === 'upload' ? '0 1px 2px rgba(0,0,0,.08)' : 'none'
                   }}
                   onClick={() => setActiveTab('upload')}
                 >
                   Импорт файлов
                 </button>
              </div>
              
              {/* Область содержимого */}
              <div>
                {activeTab === 'bilibili' && (
                  <BilibiliDownload onDownloadSuccess={async () => {
                    // Refresh project list after processing completed
                    await loadProjects()
                    // Do not show duplicate toast. BilibiliDownload already displays unified notification
                  }} />
                )}
                {activeTab === 'upload' && (
                  <FileUpload onUploadSuccess={async () => {
                    // Refresh project list after processing completed
                    await loadProjects()
                    message.success('Проект создан, обработка запущена...')
                  }} />
                )}
              </div>
              </div>
            </div>
          </div>

          {/* Область управления проектами */}
          <div style={{
            background: 'transparent',
            padding: '0',
            marginBottom: '32px'
          }}>
            {/* Заголовок списка проектов */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: '56px',
              marginBottom: '22px'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <Title
                  level={2}
                  style={{ margin: 0, color: 'var(--ac-ink)', fontSize: '16px', fontWeight: 600 }}
                >
                  Мои проекты
                </Title>
                <Text style={{ color: 'var(--ac-muted)', fontSize: '13px' }}>
                  {filteredProjects.length}
                </Text>
              </div>
              
              {/* Фильтр состояния перемещён вправо */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center'
              }}>
                <Select
                  placeholder="Все статусы"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  variant="borderless"
                  style={{ minWidth: '120px', fontSize: '13px' }}
                  suffixIcon={<span style={{ color: 'var(--ac-muted)', fontSize: '10px' }}>⌄</span>}
                  allowClear
                >
                  <Option value="all">Все статусы</Option>
                  <Option value="completed">Завершено</Option>
                  <Option value="processing">В обработке</Option>
                  <Option value="error">Ошибка обработки</Option>
                </Select>
              </div>
            </div>

            {/* Содержимое списка проектов */}
             <div>
               {loading ? (
                 <div style={{
                   textAlign: 'center',
                   padding: '72px 0',
                   background: 'var(--ac-card)',
                   borderRadius: '16px',
                   border: '1px solid var(--ac-line)'
                 }}>
                   <Spin size="large" />
                   <div style={{ marginTop: '18px', color: 'var(--ac-muted)', fontSize: '14px' }}>
                     Загрузка списка проектов…
                   </div>
                 </div>
               ) : filteredProjects.length === 0 ? (
                 <div style={{
                   textAlign: 'center',
                   padding: '72px 0',
                   background: 'var(--ac-card)',
                   borderRadius: '16px',
                   border: '1px solid var(--ac-line)'
                 }}>
                   <Empty
                     image={Empty.PRESENTED_IMAGE_SIMPLE}
                     description={
                       <div>
                         <Text type="secondary">
                           {projects.length === 0 ? 'Нет проектов. Используйте область импорта выше для создания первого проекта' : 'Подходящие проекты не найдены'}
                         </Text>
                       </div>
                     }
                   />
                 </div>
               ) : (
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                   gap: '24px',
                   justifyContent: 'start'
                 }}>
                   {filteredProjects.map((project: Project) => (
                     <div key={project.id} style={{ position: 'relative', zIndex: 1 }}>
                       <ProjectCard 
                         project={project} 
                         onDelete={handleDeleteProject}
                         onRetry={() => handleRetryProject()}
                         onClick={() => handleProjectCardClick(project)}
                       />
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </div>
         </div>
      </Content>
    </Layout>
  )
}

export default HomePage