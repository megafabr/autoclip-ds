import React, { useState, useEffect } from 'react'
import { Layout, Card, Form, Input, Button, Typography, Space, Alert, Divider, Row, Col, Tabs, message, Select, Tag, Switch } from 'antd'
import { KeyOutlined, SaveOutlined, ApiOutlined, SettingOutlined, InfoCircleOutlined, UserOutlined, RobotOutlined, SoundOutlined, PoweroffOutlined } from '@ant-design/icons'
import { settingsApi } from '../services/api'
import BilibiliManager from '../components/BilibiliManager'
import SpeechRecognitionConfig from '../components/SpeechRecognitionConfig'
import { isDesktopMode } from '../utils/desktopMode'
import { trackApiKeyConfigured } from '../analytics/events'
import { isAnalyticsEnabled, setAnalyticsEnabled } from '../analytics/posthog'
import './SettingsPage.css'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [showBilibiliManager, setShowBilibiliManager] = useState(false)
  const [currentProvider, setCurrentProvider] = useState<any>({})
  const [selectedProvider, setSelectedProvider] = useState('dashscope')
  const [analyticsOn, setAnalyticsOn] = useState(isAnalyticsEnabled())

  // Настройка провайдеров
  const providerConfig = {
    dashscope: {
      name: 'Alibaba Tongyi Qianwen',
      icon: <RobotOutlined />,
      color: '#1890ff',
      description: 'Сервис AI-моделей Alibaba Tongyi Qianwen',
      apiKeyField: 'dashscope_api_key',
      placeholder: 'Введите API ключ Tongyi Qianwen'
    },
    openai: {
      name: 'OpenAI',
      icon: <RobotOutlined />,
      color: '#52c41a',
      description: 'Модели OpenAI GPT',
      apiKeyField: 'openai_api_key',
      placeholder: 'Введите API ключ OpenAI'
    },
    gemini: {
      name: 'Google Gemini',
      icon: <RobotOutlined />,
      color: '#faad14',
      description: 'Большая AI-модель Google Gemini',
      apiKeyField: 'gemini_api_key',
      placeholder: 'Введите API ключ Gemini'
    },
    siliconflow: {
      name: 'SiliconFlow',
      icon: <RobotOutlined />,
      color: '#722ed1',
      description: 'Сервис моделей SiliconFlow',
      apiKeyField: 'siliconflow_api_key',
      placeholder: 'Введите API ключ SiliconFlow'
    }
  }

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Проверка запуска в Desktop-режиме
      const isDesktop = await isDesktopMode()
      
      if (isDesktop) {
        // Desktop-режим: вызов полного API
        const [settings, models, provider] = await Promise.allSettled([
          settingsApi.getSettings(),
          settingsApi.getAvailableModels(),
          settingsApi.getCurrentProvider()
        ])
        
        // 检查是否有失败的请求
        const failedRequests = [settings, models, provider].filter(result => result.status === 'rejected')
        if (failedRequests.length > 0) {
          console.warn('部分API请求失败:', failedRequests.map(r => (r as PromiseRejectedResult).reason))
        }
        
        // Обработка данных настроек
        const settingsData = settings.status === 'fulfilled' ? settings.value : {}
        
        // Обработка данных моделей
        const modelsData = models.status === 'fulfilled' ? models.value.models : {}
        
        // Обработка данных провайдеров
        const providerData = provider.status === 'fulfilled'
          ? provider.value
          : { available: false, provider: 'dashscope', display_name: 'Alibaba Tongyi Qianwen', model: 'qwen-plus' }
        const providerName = providerData.provider || 'dashscope'
        setCurrentProvider(providerData)
        
        // Преобразование вложенной структуры настроек
        const flatSettings = {
          llm_provider: providerName, // 使用实际的提供商
          dashscope_api_key: settingsData.api?.api_keys?.dashscope || '',
          openai_api_key: settingsData.api?.api_keys?.openai || '',
          gemini_api_key: settingsData.api?.api_keys?.gemini || '',
          siliconflow_api_key: settingsData.api?.api_keys?.siliconflow || '',
          jimeng_access_key: settingsData.api?.api_keys?.jimeng_access || '',
          jimeng_secret_key: settingsData.api?.api_keys?.jimeng_secret || '',
          model_name: settingsData.api?.api_model || 'qwen-plus',
          chunk_size: settingsData.processing?.processing_chunk_size || 5000,
          min_score_threshold: settingsData.processing?.processing_min_score || 0.7,
          max_clips_per_collection: settingsData.processing?.processing_max_clips || 5
        }
        
        setSelectedProvider(providerName)
        
        // Начальные значения формы настроек
        form.setFieldsValue(flatSettings)
        console.log('Desktop-режим - Значения формы настроек:', flatSettings)
        console.log('可用模型:', modelsData)
        console.log('当前提供商:', providerData)
      } else {
        // Web-режим: используется конфигурация по умолчанию, Desktop API не вызывается
        console.log('Web-режим - используется конфигурация по умолчанию')
        
        const flatSettings = {
          llm_provider: 'dashscope',
          dashscope_api_key: '',
          openai_api_key: '',
          gemini_api_key: '',
          siliconflow_api_key: '',
          jimeng_access_key: '',
          jimeng_secret_key: '',
          model_name: 'qwen-plus',
          chunk_size: 5000,
          min_score_threshold: 0.7,
          max_clips_per_collection: 5
        }
        
        setSelectedProvider('dashscope')
        form.setFieldsValue(flatSettings)
        
        // Данные модели по умолчанию
        setCurrentProvider({
          available: false,
          provider: 'dashscope',
          display_name: 'Alibaba Tongyi Qianwen',
          model: 'qwen-plus'
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    }
  }

  // Сохранить настройки
  const handleSave = async (values: any) => {
    try {
      setLoading(true)
      
      // Проверка запуска в Desktop-режиме
      const isDesktop = await isDesktopMode()
      
      if (!isDesktop) {
        // Web-режим：только показывает подсказку, без сохранения
        message.info('В Web-режиме настройки нельзя сохранить. Используйте настольное приложение.')
        setLoading(false)
        return
      }
      
      // 先获取现有配置，避免清空已有的API key
      let existingSettings = null
      try {
        existingSettings = await settingsApi.getSettings()
      } catch (error) {
        console.warn('获取现有配置失败，将使用默认配置:', error)
      }
      
      // 获取现有的API keys，只更新有值的字段
      const existingApiKeys = existingSettings?.api?.api_keys || {}
      
      // 转换扁平数据为后端期望的嵌套结构
      const backendSettings = {
        basic: {
          app_name: "AutoClip Desktop",
          app_version: "1.0.0",
          debug_mode: false,
          auto_start: true
        },
        service: {
          host: "127.0.0.1",
          port: 8000,
          max_memory_usage: 2048
        },
        api: {
          api_keys: {
            // 只更新有值的API key，保持现有的值
            dashscope: values.dashscope_api_key || existingApiKeys.dashscope || "",
            openai: values.openai_api_key || existingApiKeys.openai || "",
            gemini: values.gemini_api_key || existingApiKeys.gemini || "",
            siliconflow: values.siliconflow_api_key || existingApiKeys.siliconflow || "",
            jimeng_access: values.jimeng_access_key || existingApiKeys.jimeng_access || "",
            jimeng_secret: values.jimeng_secret_key || existingApiKeys.jimeng_secret || ""
          },
          api_model: values.model_name || "qwen-plus",
          api_max_tokens: 4096,
          api_timeout: 30
        },
        processing: {
          processing_chunk_size: values.chunk_size || 5000,
          processing_min_score: values.min_score_threshold || 0.7,
          processing_max_clips: values.max_clips_per_collection || 5,
          processing_max_retries: 3
        },
        logs: {
          log_level: "INFO",
          log_retention_days: 7
        },
        paths: {
          data_directory: "/Users/zhoukk/Library/Application Support/AutoClip",
          cache_directory: "/Users/zhoukk/Library/Application Support/AutoClip/cache",
          temp_directory: "/Users/zhoukk/Library/Application Support/AutoClip/temp"
        }
      }
      
      await settingsApi.updateSettings(backendSettings)
      message.success('Настройки успешно сохранены!')

      // Аналитика: запись настроенного provider key без передачи самого ключа
      const apiKeyField = providerConfig[selectedProvider as keyof typeof providerConfig]?.apiKeyField
      if (apiKeyField) {
        trackApiKeyConfigured({
          provider: selectedProvider,
          hasKey: !!values[apiKeyField],
        })
      }

      await loadData() // Повторная загрузка данных
    } catch (error: any) {
      message.error('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setLoading(false)
    }
  }

  // 测试API密钥
  const handleTestApiKey = async () => {
    const apiKey = form.getFieldValue(providerConfig[selectedProvider as keyof typeof providerConfig].apiKeyField)
    
    if (!apiKey || apiKey.trim() === '') {
      message.error('Сначала введите API ключ')
      return
    }

    try {
      setLoading(true)
      const result = await settingsApi.testApiKey(selectedProvider, apiKey)
      if (result.success) {
        message.success('Проверка API ключа успешна!')
      } else {
        message.error('Ошибка проверки API ключа: ' + (result.error || 'Неизвестная ошибка'))
      }
    } catch (error: any) {
      message.error('Ошибка тестирования: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setLoading(false)
    }
  }

  // 提供商切换
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    form.setFieldsValue({ llm_provider: provider })
  }

  return (
    <Content className="settings-page">
      <div className="settings-container">
        <Title level={2} className="settings-title">
          <SettingOutlined /> {locale.settings.title}
        </Title>
        
        <Tabs defaultActiveKey="api" className="settings-tabs">
          <TabPane tab="Настройки AI моделей" key="api">
            <Card title="Настройки AI моделей" className="settings-card">
              <Alert
                message="Поддержка нескольких AI-провайдеров"
                description="Система поддерживает несколько AI-провайдеров. Вы можете выбрать нужный сервис и модель."
                type="info"
                showIcon
                className="settings-alert"
              />
              
              <Form
                form={form}
                layout="vertical"
                className="settings-form"
                onFinish={handleSave}
                initialValues={{
                  llm_provider: 'dashscope',
                  model_name: 'qwen-plus',
                  chunk_size: 5000,
                  min_score_threshold: 0.7,
                  max_clips_per_collection: 5
                }}
              >
                {/* 当前提供商状态 */}
                {currentProvider.available && (
                  <Alert
                    message={`Используется сейчас: ${currentProvider.display_name} - ${currentProvider.model}`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                {/* 提供商选择 */}
                <Form.Item
                  label="Выберите AI-провайдера"
                  name="llm_provider"
                  className="form-item"
                  rules={[{ required: true, message: 'Выберите AI-провайдера' }]}
                >
                  <Select
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    className="settings-input"
                    placeholder="Выберите AI-провайдера"
                  >
                    {Object.entries(providerConfig).map(([key, config]) => (
                      <Select.Option key={key} value={key}>
                        <Space>
                          <span style={{ color: config.color }}>{config.icon}</span>
                          <span>{config.name}</span>
                          <Tag color={config.color}>{config.description}</Tag>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 动态API密钥输入 */}
                <Form.Item
                  label={`${providerConfig[selectedProvider as keyof typeof providerConfig].name} API Key`}
                  name={providerConfig[selectedProvider as keyof typeof providerConfig].apiKeyField}
                  className="form-item"
                  rules={[
                    { required: true, message: 'Введите API ключ' },
                    { min: 10, message: 'Длина API ключа должна быть не менее 10 символов' }
                  ]}
                >
                  <Input.Password
                    placeholder={providerConfig[selectedProvider as keyof typeof providerConfig].placeholder}
                    prefix={<KeyOutlined />}
                    className="settings-input"
                  />
                </Form.Item>

                {/* 模型选择 - 改进版本 */}
                <Form.Item
                  label="Выберите модель"
                  name="model_name"
                  className="form-item"
                  rules={[{ required: true, message: 'Введите или выберите название модели' }]}
                  extra="Можно ввести модель вручную или выбрать из списка"
                >
                  <Select
                    className="settings-input"
                    placeholder="Введите или выберите название модели"
                    showSearch
                    allowClear
                    mode="tags"
                    dropdownRender={(menu) => (
                      <div>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ padding: '0 8px 4px' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Список моделей (по провайдерам)
                          </Text>
                        </div>
                      </div>
                    )}
                  >
                    {/* Модели Tongyi Qianwen */}
                    <Select.OptGroup label="Tongyi Qianwen (Dashscope)">
                      <Select.Option value="qwen-plus">qwen-plus (Tongyi Qianwen Enhanced)</Select.Option>
                      <Select.Option value="qwen-turbo">qwen-turbo (Tongyi Qianwen Standard)</Select.Option>
                      <Select.Option value="qwen-max">qwen-max (Tongyi Qianwen Flagship)</Select.Option>
                      <Select.Option value="qwen-long">qwen-long (Tongyi Qianwen Long Context)</Select.Option>
                    </Select.OptGroup>
                    
                    {/* OpenAI模型 */}
                    <Select.OptGroup label="OpenAI">
                      <Select.Option value="gpt-4o">gpt-4o (GPT-4 Omni)</Select.Option>
                      <Select.Option value="gpt-4o-mini">gpt-4o-mini (GPT-4 Omni Mini)</Select.Option>
                      <Select.Option value="gpt-4-turbo">gpt-4-turbo (GPT-4 Turbo)</Select.Option>
                      <Select.Option value="gpt-4">gpt-4 (GPT-4)</Select.Option>
                      <Select.Option value="gpt-3.5-turbo">gpt-3.5-turbo (GPT-3.5 Turbo)</Select.Option>
                    </Select.OptGroup>
                    
                    {/* Google Gemini模型 */}
                    <Select.OptGroup label="Google Gemini">
                      <Select.Option value="gemini-1.5-pro">gemini-1.5-pro (Gemini 1.5 Pro)</Select.Option>
                      <Select.Option value="gemini-1.5-flash">gemini-1.5-flash (Gemini 1.5 Flash)</Select.Option>
                      <Select.Option value="gemini-pro">gemini-pro (Gemini Pro)</Select.Option>
                    </Select.OptGroup>
                    
                    {/* SiliconFlow模型 */}
                    <Select.OptGroup label="SiliconFlow (SiliconFlow)">
                      <Select.Option value="deepseek-chat">deepseek-chat (DeepSeek Chat)</Select.Option>
                      <Select.Option value="deepseek-coder">deepseek-coder (DeepSeek Coder)</Select.Option>
                      <Select.Option value="qwen-plus">qwen-plus (Tongyi Qianwen Enhanced)</Select.Option>
                      <Select.Option value="qwen-turbo">qwen-turbo (Tongyi Qianwen Standard)</Select.Option>
                    </Select.OptGroup>
                    
                  </Select>
                </Form.Item>

                <Form.Item className="form-item">
                  <Space>
                    <Button
                      type="default"
                      icon={<ApiOutlined />}
                      className="test-button"
                      onClick={handleTestApiKey}
                      loading={loading}
                    >
                      Проверить соединение
                    </Button>
                  </Space>
                </Form.Item>

                <Divider className="settings-divider" />

                <Title level={4} className="section-title">Настройки модели</Title>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Размер текстового блока"
                      name="chunk_size"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        placeholder="5000" 
                        addonAfter="символов" 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Минимальный порог оценки"
                      name="min_score_threshold"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="1" 
                        placeholder="0.7" 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Максимальное количество фрагментов"
                      name="max_clips_per_collection"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        placeholder="5" 
                        addonAfter="шт." 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item className="form-item">
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    size="large"
                    className="save-button"
                    loading={loading}
                  >
                    Сохранить настройки
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card title="Инструкция" className="settings-card">
              <Space direction="vertical" size="large" className="instructions-space">
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 1. Выберите AI-провайдера
                  </Title>
                  <Paragraph className="instruction-text">
                    Система поддерживает несколько AI-провайдеров:
                    <br />• <Text strong>Alibaba Tongyi Qianwen</Text>：открыть консоль Alibaba Cloudполучить API ключ
                    <br />• <Text strong>OpenAI</Text>：Откройте platform.openai.com получить API ключ
                    <br />• <Text strong>Google Gemini</Text>：Откройте ai.google.dev получить API ключ
                    <br />• <Text strong>SiliconFlow</Text>：Откройте docs.siliconflow.cn получить API ключ
                  </Paragraph>
                </div>
                
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 2. Описание параметров настройки
                  </Title>
                  <Paragraph className="instruction-text">
                    • <Text strong>Размер текстового блока</Text>：Влияет на скорость и точность обработки, рекомендуется 5000 символов<br />
                    • <Text strong>Порог оценки</Text>：Сохраняются только фрагменты выше этого порога<br />
                    • <Text strong>Количество фрагментов в коллекции</Text>：Определяет количество фрагментов в каждой коллекции
                  </Paragraph>
                </div>
                
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 3. Проверить соединение
                  </Title>
                  <Paragraph className="instruction-text">
                    Перед сохранением рекомендуется проверить API ключ.
                  </Paragraph>
                </div>
              </Space>
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <SoundOutlined />
                Настройки распознавания речи
              </span>
            } 
            key="speech"
          >
            <Card title="Настройки распознавания речи" className="settings-card">
              <Alert
                message="Настройки сервиса распознавания речи"
                description="Настройка распознавания речи для создания субтитров. Поддерживаются Whisper и облачные API."
                type="info"
                showIcon
                className="settings-alert"
              />
              
              <SpeechRecognitionConfig
                onConfigChange={(config) => {
                  console.log('Настройки распознавания речи обновлены:', config)
                  // Удаление повторного сообщения об успехе, обработка выполняется внутри SpeechRecognitionConfig
                }}
              />
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <SettingOutlined />
                Настройки приложения
              </span>
            } 
            key="app"
          >
            <Card title="Настройки приложения" className="settings-card">
              <Alert
                message="Настройки поведения приложения"
                description="Настройки запуска и интеграции системы."
                type="info"
                showIcon
                className="settings-alert"
              />
              
              <AppSettings />
            </Card>

            <Card title="Конфиденциальность и данные" className="settings-card" style={{ marginTop: 16 }}>
              <Alert
                message="Статистика использования"
                description="Для улучшения продукта мы собираем анонимную статистику использования. Она не содержит видео, субтитры или API ключи. Вы можете отключить её в любое время."
                type="info"
                showIcon
                className="settings-alert"
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                <div>
                  <Text strong>Разрешить анонимную статистику</Text>
                  <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                    После отключения данные использования больше не отправляются.
                  </Paragraph>
                </div>
                <Switch
                  checked={analyticsOn}
                  onChange={(checked) => {
                    setAnalyticsEnabled(checked)
                    setAnalyticsOn(checked)
                    message.success(checked ? 'Анонимная статистика включена' : 'Анонимная статистика отключена')
                  }}
                />
              </div>
            </Card>
          </TabPane>

          <TabPane tab="Управление Bilibili" key="bilibili">
            <Card title="Управление аккаунтами Bilibili" className="settings-card">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <UserOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                  <Title level={3} style={{ color: 'var(--ac-ink)', margin: '0 0 8px 0' }}>
                    Управление аккаунтами Bilibili
                  </Title>
                  <Text type="secondary" style={{ color: '#b0b0b0', fontSize: '16px' }}>
                    Управление аккаунтами Bilibili, переключение и публикация.
                  </Text>
                </div>
                
                <Space size="large">
                  <Button
                    type="primary"
                    size="large"
                    icon={<UserOutlined />}
                    onClick={() => message.info('В разработке', 3)}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(45deg, #1890ff, #36cfc9)',
                      border: 'none',
                      fontWeight: 500,
                      height: '48px',
                      padding: '0 32px',
                      fontSize: '16px'
                    }}
                  >
                    Управление аккаунтом Bilibili
                  </Button>
                </Space>
                
                <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '600px', margin: '32px auto 0' }}>
                  <Title level={4} style={{ color: 'var(--ac-ink)', marginBottom: '16px' }}>
                    Основные возможности
                  </Title>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#1890ff' }}>Поддержка нескольких аккаунтов</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        Поддержка нескольких аккаунтов Bilibili для удобного управления
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#52c41a' }}>Безопасный вход</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        Импорт Cookie для безопасной работы
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#faad14' }}>Быстрая публикация</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        Выбор аккаунта для публикации из страницы клипа
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#722ed1' }}>Массовое управление</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        Поддержка массовой загрузки нескольких клипов
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabPane>
        </Tabs>

        {/* Окно управления Bilibili */}
        <BilibiliManager
          visible={showBilibiliManager}
          onClose={() => setShowBilibiliManager(false)}
          onUploadSuccess={() => {
            message.success('Операция выполнена успешно')
          }}
        />
      </div>
    </Content>
  )
}

// Компонент настроек приложения
const AppSettings: React.FC = () => {
  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAutostartStatus()
  }, [])

  const checkAutostartStatus = async () => {
    try {
      const isDesktop = await isDesktopMode()
      if (isDesktop) {
        const { invoke } = await import('@tauri-apps/api/core')
        const enabled = await invoke('is_autostart_enabled')
        setAutostartEnabled(Boolean(enabled))
      }
    } catch (error) {
      console.error('Не удалось проверить состояние автозапуска:', error)
    }
  }

  const handleAutostartToggle = async (enabled: boolean) => {
    const isDesktop = await isDesktopMode()
    if (!isDesktop) {
      message.error('Эта функция доступна только в Desktop-приложении')
      return
    }

    setLoading(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      if (enabled) {
        await invoke('enable_autostart')
        message.success('Автозапуск включён')
      } else {
        await invoke('disable_autostart')
        message.success('Автозапуск отключён')
      }
      
      setAutostartEnabled(enabled)
    } catch (error) {
      console.error('Не удалось изменить состояние автозапуска:', error)
      message.error(`Ошибка выполнения: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            size="small" 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid #404040',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <PoweroffOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong style={{ color: 'var(--ac-ink)' }}>Автозапуск при включении компьютера</Text>
                </div>
                <Text type="secondary" style={{ color: '#b0b0b0' }}>
                  После включения приложение будет запускаться вместе с системой
                </Text>
              </div>
              <Switch
                checked={autostartEnabled}
                onChange={handleAutostartToggle}
                loading={loading}
                checkedChildren="Включить"
                unCheckedChildren="Выключить"
              />
            </div>
          </Card>
        </Col>
      </Row>
      
      <Alert
        message="Подсказка"
        description="Автозапуск доступен только в Desktop-приложении. После включения приложение запускается вместе с системой. Доступ к приложению осуществляется через значок в системном трее."
        type="info"
        showIcon
        style={{ marginTop: '16px' }}
      />
    </div>
  )
}

export default SettingsPage
