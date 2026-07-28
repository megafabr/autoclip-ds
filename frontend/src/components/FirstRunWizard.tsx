import React, { useState, useEffect } from 'react'
import { Card, Button, Typography, Space, Alert, message, Form, Input, Select } from 'antd'
import { 
  SoundOutlined, 
  ApiOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  LinkOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { ExternalLink } from '../utils/externalLinks'
import { settingsApi } from '../services/api'
import { isDesktopMode } from '../utils/desktopMode'

const { Title, Text } = Typography
const { Option } = Select

interface FirstRunWizardProps {
  onComplete: () => void
}

interface ConfigForm {
  // Настройка распознавания речи
  speechMethod: string
  whisperModel: string
  openaiApiKey: string
  
  // Настройка LLM
  llmProvider: string
  llmApiKey: string
  azureApiKey?: string
  azureRegion?: string
  googleApiKey?: string
  aliyunApiKey?: string
  customApiKey?: string
  customEndpoint?: string
}

const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<ConfigForm>()
  
  const [config, setConfig] = useState<ConfigForm>({
    speechMethod: 'whisper_local',
    whisperModel: 'base',
    openaiApiKey: '',
    llmProvider: 'dashscope',
    llmApiKey: ''
  })

  // Проверяем корректную инициализацию формы при загрузке компонента
  useEffect(() => {
    form.setFieldsValue(config)
    console.log('Форма инициализирована, начальные значения:', config)
  }, [form])

  const handleNext = () => {
    if (currentStep === 0) {
      // Проверка первой настройки
      const values = form.getFieldsValue()
      console.log('Кнопка Далее нажата - значения формы:', values)
      console.log('llmProvider:', values.llmProvider)
      console.log('llmApiKey:', values.llmApiKey)
      
      if (!values.llmProvider || !values.llmApiKey || values.llmApiKey.trim() === '') {
        message.error('Пожалуйста, выберите LLM провайдера и введите API Key')
        return
      }
      setConfig({ ...config, ...values })
      setCurrentStep(1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const finalConfig = { ...config, ...values }
      
      // Проверка настройки распознавания речи
      if (!finalConfig.speechMethod) {
        message.error('Пожалуйста, выберите вариант распознавания речи')
        setLoading(false)
        return
      }
      
      // Сохранять настройку LLM только после ввода API key
      if (finalConfig.llmApiKey && finalConfig.llmApiKey.trim()) {
        try {
          await saveLLMConfig(finalConfig)
          console.log('Настройка LLM сохранена успешно')
        } catch (error) {
          console.error('Ошибка сохранения настройки LLM:', error)
          message.error('Ошибка сохранения настроек LLM, попробуйте снова')
          setLoading(false)
          return
        }
      }
      
      // Сохранение настройки распознавания речи - обработка ошибок
      try {
        await saveSpeechConfig(finalConfig)
      } catch (error) {
        console.warn('Ошибка сохранения настройки распознавания речи, используется настройка по умолчанию:', error)
        // Не прерывать процесс, позволить пользователю завершить мастер
      }
      
      // Если используется локальный Whisper, загрузить модель
      if (finalConfig.speechMethod === 'whisper_local') {
        await downloadWhisperModel(finalConfig.whisperModel)
      }
      
      // Настройки сохранены, переход на главный экран
      message.success('Настройка завершена! Добро пожаловать в DS OS')
      onComplete()
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сохранения настроек, попробуйте снова'
      message.error(`Ошибка сохранения настроек: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Пропустить текущий шаг, настроить позже
  const handleSkip = async () => {
    if (currentStep === 0) {
      // Пропустить настройку AI модели, перейти к настройке распознавания речи
      setCurrentStep(1)
      message.info('Настройка AI модели пропущена, вы можете выполнить её позже в разделе настроек', 3)
    } else {
      // Пропустить настройку распознавания речи, завершить мастер
      // Не сохранять пустые API настройки
      try {
        // Сохранить только настройку распознавания речи, не сохранять LLM
        const values = form.getFieldsValue()
        const finalConfig = { ...config, ...values }
        try {
          await saveSpeechConfig(finalConfig)
        } catch (error) {
          console.warn('Ошибка сохранения настройки распознавания речи, используется настройка по умолчанию:', error)
        }
        
        message.info('Настройка распознавания речи пропущена, вы можете выполнить её позже', 3)
        onComplete()
      } catch (error) {
        message.error('Ошибка сохранения настроек, попробуйте снова')
        console.error('Ошибка сохранения настроек:', error)
      }
    }
  }

  const saveLLMConfig = async (config: ConfigForm) => {
    try {
      // В Web режиме разрешить сохранение настроек для проверки и разработки
      const isDesktop = await isDesktopMode()
      console.log('Результат проверки Desktop режима:', isDesktop)

      console.log('Начало сохранения настройки LLM:', {
        provider: config.llmProvider,
        apiKeyLength: config.llmApiKey?.length || 0
      })

      // Сначала получить текущую конфигурацию, чтобы не удалить существующие API key
      let existingSettings = null
      try {
        existingSettings = await settingsApi.getSettings()
      } catch (error) {
        console.warn('Не удалось получить текущую конфигурацию, используется настройка по умолчанию:', error)
      }

      // Получить существующие API keys, обновить только текущий provider key
      const existingApiKeys = existingSettings?.api?.api_keys || {}
      
      const settings = {
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
            // Обновить только API key текущего provider, сохранить остальные значения
            dashscope: config.llmProvider === 'dashscope' ? config.llmApiKey : (existingApiKeys.dashscope || ''),
            openai: config.llmProvider === 'openai' ? config.llmApiKey : (existingApiKeys.openai || ''),
            gemini: config.llmProvider === 'gemini' ? config.llmApiKey : (existingApiKeys.gemini || ''),
            siliconflow: config.llmProvider === 'siliconflow' ? config.llmApiKey : (existingApiKeys.siliconflow || ''),
            jimeng_access: existingApiKeys.jimeng_access || '',
            jimeng_secret: existingApiKeys.jimeng_secret || ''
          },
          api_model: config.llmProvider === 'dashscope' ? 'qwen-plus' : 
                     config.llmProvider === 'openai' ? 'gpt-3.5-turbo' :
                     config.llmProvider === 'gemini' ? 'gemini-pro' : 'qwen-plus',
          api_max_tokens: 4000,
          api_timeout: 30
        },
        processing: {
          processing_chunk_size: 5000,
          processing_min_score: 0.7,
          processing_max_clips: 5,
          processing_max_retries: 3
        },
        logs: {
          log_level: "INFO",
          log_file_path: "",
          log_file_max_size: 10,
          log_file_backup_count: 5
        }
      }
      
      console.log('Отправка настроек на сервер:', settings)
      const result = await settingsApi.updateSettings(settings)
      console.log('Настройка LLM сохранена успешно，Ответ сервера:', result)
    } catch (error) {
      console.error('Ошибка сохранения настройки LLM:', error)
      const detail = error instanceof Error ? error.message : 'Неизвестная ошибка'
      throw new Error(`Ошибка сохранения настройки LLM: ${detail}`)
    }
  }

  const saveSpeechConfig = async (config: ConfigForm) => {
    try {
      // Проверить работу в Desktop режиме
      const isDesktop = await isDesktopMode()
      if (!isDesktop) {
        console.warn('Не Desktop режим, пропустить сохранение настроек речи')
        return
      }

      const values = form.getFieldsValue()
      const speechConfig = {
        method: config.speechMethod,
        whisper_config: {
          model_name: config.whisperModel || 'base',
          language: 'auto',
          enable_timestamps: true,
          enable_punctuation: true
        },
        openai_config: {
          api_key: values.openaiApiKey || '',
          language: 'auto',
          enable_timestamps: true
        },
        azure_config: {
          api_key: values.azureApiKey || '',
          region: values.azureRegion || '',
          language: 'auto',
          enable_timestamps: true,
          enable_punctuation: true
        },
        google_config: {
          api_key: values.googleApiKey || '',
          language: 'auto',
          enable_timestamps: true,
          enable_punctuation: true
        },
        aliyun_config: {
          api_key: values.aliyunApiKey || '',
          language: 'auto',
          enable_timestamps: true,
          enable_punctuation: true
        },
        custom_api_config: {
          api_key: values.customApiKey || '',
          endpoint: values.customEndpoint || '',
          language: 'auto',
          enable_timestamps: true,
          enable_punctuation: true
        },
        enable_fallback: true,
        fallback_method: 'whisper_local',
        output_format: 'srt'
      }
      
      const response = await fetch('/api/v1/speech-recognition/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(speechConfig)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ошибка сохранения настройки распознавания речи: ${response.status} ${errorText}`)
      }
      
      console.log('Настройка распознавания речи сохранена успешно')
    } catch (error) {
      console.error('Ошибка сохранения настройки распознавания речи:', error)
      if (error instanceof Error) {
        throw new Error(`Ошибка сохранения настройки распознавания речи: ${error.message}`)
      } else {
        throw new Error('Ошибка сохранения настройки распознавания речи')
      }
    }
  }

  const downloadWhisperModel = async (modelName: string) => {
    try {
      const response = await fetch('/api/v1/speech-recognition/whisper-models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      })
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки модели')
      }
    } catch (error) {
      console.error('Ошибка загрузки модели Whisper:', error)
      // Не блокировать завершение мастера
    }
  }


  const testApiConnection = async (provider: string, apiKey: string) => {
    // Получить актуальный API Key из формы
    const formValues = form.getFieldsValue()
    const currentApiKey = formValues.llmApiKey || apiKey
    
    console.log('testApiConnection параметры вызова:', { provider, apiKey })
    console.log('testApiConnection значения формы:', formValues)
    console.log('testApiConnection текущий API Key:', currentApiKey)
    
    if (!currentApiKey || currentApiKey.trim() === '') {
      message.warning('Сначала введите API Key')
      return
    }
    
    try {
      const response = await fetch('/api/v1/settings/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: currentApiKey })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (result.success) {
        message.success('Проверка API соединения успешна!')
      } else {
        message.error(`Ошибка проверки API: ${result.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Ошибка проверки API:', error)
      const detail = error instanceof Error ? error.message : 'Ошибка сети'
      message.error(`Ошибка проверки API: ${detail}`)
    }
  }

  // Получить умные подсказки как получить API Key
  const getApiKeyHelp = (provider: string) => {
    const helpMap: Record<string, { name: string; url: string; description: string }> = {
      dashscope: {
        name: 'Alibaba Qwen',
        url: 'https://dashscope.aliyun.com',
        description: 'Создайте аккаунт Alibaba Cloud, включите DashScope и создайте API Key'
      },
      openai: {
        name: 'OpenAI',
        url: 'https://platform.openai.com',
        description: 'Создайте аккаунт OpenAI и новый ключ в разделе API Keys'
      },
      gemini: {
        name: 'Google Gemini',
        url: 'https://makersuite.google.com',
        description: 'Войдите через Google и создайте ключ в разделе API Keys'
      },
      siliconflow: {
        name: 'SiliconFlow',
        url: 'https://cloud.siliconflow.cn',
        description: 'Создайте аккаунт SiliconFlow и API Key в панели управления'
      }
    }
    return helpMap[provider] || helpMap.dashscope
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '24px 16px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      {/* Область заголовка - компактный вариант */}
      <div style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/favicon.png" alt="AutoClip" style={{ width: 40, height: 40, marginBottom: '8px', display: 'block' }} />
        <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
          Добро пожаловать в DS OS
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          Давайте быстро настроим ваш AI инструмент обработки видео
        </Text>
      </div>

      {/* Основная карточка настройки - компактные отступы */}
      <Card style={{ marginBottom: '16px' }}>
        {/* Заголовок шага - компактный вариант */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            {currentStep === 0 ? <ApiOutlined style={{ color: '#1890ff' }} /> : <SoundOutlined style={{ color: '#1890ff' }} />}
            <Title level={4} style={{ margin: 0 }}>
              {currentStep === 0 ? 'Настройка AI модели' : 'Настройка распознавания речи'}
            </Title>
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {currentStep === 0 
              ? 'Выберите провайдера большой языковой модели и введите API Key' 
              : 'Выберите способ распознавания речи'
            }
          </Text>
        </div>

        <Form 
          form={form} 
          layout="vertical" 
          initialValues={config}
          onValuesChange={(changedValues, allValues) => {
            console.log('Изменение значений формы:', { changedValues, allValues })
          }}
        >
          {currentStep === 0 ? (
            // Шаг настройки LLM - компактная структура
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Form.Item
                name="llmProvider"
                label="Выберите AI провайдера"
                rules={[{ required: true, message: 'Выберите AI провайдера' }]}
                style={{ marginBottom: '12px' }}
              >
                <Select size="middle" placeholder="Выберите провайдера">
                  <Option value="dashscope">
                    <Space>
                      <Text strong>Alibaba Qwen</Text>
                      <Text type="secondary">(Рекомендуется для пользователей из Китая)</Text>
                    </Space>
                  </Option>
                  <Option value="openai">
                    <Space>
                      <Text strong>OpenAI GPT</Text>
                      <Text type="secondary">(Требуется доступ к международной сети)</Text>
                    </Space>
                  </Option>
                  <Option value="gemini">
                    <Space>
                      <Text strong>Google Gemini</Text>
                      <Text type="secondary">(Требуется доступ к международной сети)</Text>
                    </Space>
                  </Option>
                  <Option value="siliconflow">
                    <Space>
                      <Text strong>SiliconFlow</Text>
                      <Text type="secondary">(Альтернативное решение для Китая)</Text>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              {/* Поле ввода API Key и кнопка проверки - горизонтальное расположение */}
              <Form.Item
                name="llmApiKey"
                label="API Key"
                rules={[{ required: true, message: 'Введите API Key' }]}
                style={{ marginBottom: '12px' }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input.Password 
                    size="middle" 
                    placeholder="Введите ваш API Key"
                    style={{ 
                      flex: 1,
                      backgroundColor: '#fafafa',
                      borderColor: '#d9d9d9'
                    }}
                  />
                  <Button 
                    type="default"
                    size="middle"
                    onClick={() => {
                      const values = form.getFieldsValue()
                      console.log('Кнопка проверки нажата - значения формы:', values)
                      testApiConnection(values.llmProvider || 'dashscope', values.llmApiKey || '')
                    }}
                    style={{ width: '80px' }}
                    icon={<LinkOutlined />}
                  >
                    Проверить
                  </Button>
                </div>
              </Form.Item>

              {/* Умная подсказка получения API Key */}
              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.llmProvider !== currentValues.llmProvider}>
                {({ getFieldValue }) => {
                  const provider = getFieldValue('llmProvider') || 'dashscope'
                  const help = getApiKeyHelp(provider)
                  return (
                    <Alert
                      message={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <InfoCircleOutlined />
                          <span>{help.name} Как получить API Key</span>
                        </div>
                      }
                      description={
                        <div>
                          <p style={{ margin: '4px 0', fontSize: '12px' }}>{help.description}</p>
                          <p style={{ margin: '4px 0', fontSize: '12px' }}>
                            Открыть: <ExternalLink url={help.url} text={help.url} />
                          </p>
                        </div>
                      }
                      type="info"
                      showIcon={false}
                      style={{ fontSize: '12px' }}
                    />
                  )
                }}
              </Form.Item>
            </Space>
          ) : (
            // Шаг настройки распознавания речи - компактная структура
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Form.Item
                name="speechMethod"
                label="Выберите способ распознавания речи"
                rules={[{ required: true, message: 'Пожалуйста, выберите вариант распознавания речи' }]}
                style={{ marginBottom: '12px' }}
              >
                <Select size="middle" placeholder="Выберите вариант">
                  <Option value="whisper_local">
                    <Space>
                      <span>🆓</span>
                      <Text strong>Локальная модель Whisper</Text>
                      <Text type="secondary">(Бесплатно офлайн, рекомендуется новичкам)</Text>
                    </Space>
                  </Option>
                  <Option value="openai_api">
                    <Space>
                      <span>🤖</span>
                      <Text strong>OpenAI Whisper API</Text>
                      <Text type="secondary">(Облачная обработка, высокая точность)</Text>
                    </Space>
                  </Option>
                  <Option value="azure_speech">
                    <Space>
                      <span>☁️</span>
                      <Text strong>Azure Speech Services</Text>
                      <Text type="secondary">(Корпоративный сервис)</Text>
                    </Space>
                  </Option>
                  <Option value="google_speech">
                    <Space>
                      <span>🌐</span>
                      <Text strong>Google Speech-to-Text</Text>
                      <Text type="secondary">(Поддержка многих языков)</Text>
                    </Space>
                  </Option>
                  <Option value="aliyun_speech">
                    <Space>
                      <span>☁️</span>
                      <Text strong>Alibaba Speech</Text>
                      <Text type="secondary">(Оптимизировано для китайского языка)</Text>
                    </Space>
                  </Option>
                  <Option value="custom_api">
                    <Space>
                      <span>⚙️</span>
                      <Text strong>Пользовательский API</Text>
                      <Text type="secondary">(Свой API endpoint)</Text>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.speechMethod !== currentValues.speechMethod} noStyle>
                {({ getFieldValue }) => {
                  const speechMethod = getFieldValue('speechMethod')
                  
                  if (speechMethod === 'whisper_local') {
                    return (
                      <Form.Item
                        name="whisperModel"
                        label="Выберите размер модели"
                        style={{ marginBottom: '12px' }}
                      >
                        <Select size="middle" placeholder="Выберите модель">
                          <Option value="tiny">Tiny (39MB) - Максимальная скорость</Option>
                          <Option value="base">Base (74MB) - Баланс скорости и качества (рекомендуется)</Option>
                          <Option value="small">Small (244MB) - Хорошая точность</Option>
                          <Option value="medium">Medium (769MB) - Высокая точность</Option>
                          <Option value="large">Large (1550MB) - максимальная точность</Option>
                        </Select>
                      </Form.Item>
                    )
                  }
                  
                  if (speechMethod === 'openai_api') {
                    return (
                      <Form.Item
                        name="openaiApiKey"
                        label="OpenAI API Key"
                        rules={[{ required: true, message: 'Введите OpenAI API Key' }]}
                        style={{ marginBottom: '12px' }}
                      >
                        <Input.Password 
                          size="middle" 
                          placeholder="Введите OpenAI API Key"
                        />
                      </Form.Item>
                    )
                  }
                  
                  if (speechMethod === 'azure_speech') {
                    return (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Form.Item
                          name="azureApiKey"
                          label="Azure API Key"
                          rules={[{ required: true, message: 'Введите Azure API Key' }]}
                          style={{ marginBottom: '8px' }}
                        >
                          <Input.Password 
                            size="middle" 
                            placeholder="Введите Azure Speech API Key"
                          />
                        </Form.Item>
                        <Form.Item
                          name="azureRegion"
                          label="Регион Azure"
                          style={{ marginBottom: '12px' }}
                        >
                          <Input 
                            size="middle" 
                            placeholder="Например: eastus, westus2"
                          />
                        </Form.Item>
                      </Space>
                    )
                  }
                  
                  if (speechMethod === 'google_speech') {
                    return (
                      <Form.Item
                        name="googleApiKey"
                        label="Google API Key"
                        rules={[{ required: true, message: 'Введите Google API Key' }]}
                        style={{ marginBottom: '12px' }}
                      >
                        <Input.Password 
                          size="middle" 
                          placeholder="Введите Google Speech-to-Text API Key"
                        />
                      </Form.Item>
                    )
                  }
                  
                  if (speechMethod === 'aliyun_speech') {
                    return (
                      <Form.Item
                        name="aliyunApiKey"
                        label="Alibaba API Key"
                        rules={[{ required: true, message: 'Введите Alibaba API Key' }]}
                        style={{ marginBottom: '12px' }}
                      >
                        <Input.Password 
                          size="middle" 
                          placeholder="Введите Alibaba Speech API Key"
                        />
                      </Form.Item>
                    )
                  }
                  
                  if (speechMethod === 'custom_api') {
                    return (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Form.Item
                          name="customApiKey"
                          label="Пользовательский API Key"
                          rules={[{ required: true, message: 'Введите пользовательский API Key' }]}
                          style={{ marginBottom: '8px' }}
                        >
                          <Input.Password 
                            size="middle" 
                            placeholder="Введите пользовательский API Key"
                          />
                        </Form.Item>
                        <Form.Item
                          name="customEndpoint"
                          label="API Endpoint"
                          rules={[{ required: true, message: 'Введите API Endpoint' }]}
                          style={{ marginBottom: '12px' }}
                        >
                          <Input 
                            size="middle" 
                            placeholder="Например: https://api.example.com/speech"
                          />
                        </Form.Item>
                      </Space>
                    )
                  }
                  
                  return null
                }}
              </Form.Item>

              {/* Описание настройки - зависит от выбранного варианта */}
              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.speechMethod !== currentValues.speechMethod} style={{ marginBottom: '8px' }}>
                {({ getFieldValue }) => {
                  const speechMethod = getFieldValue('speechMethod')
                  
                  const getMethodDescription = (method: string) => {
                    const descriptions: Record<string, { icon: string; name: string; description: string }> = {
                      whisper_local: {
                        icon: '🆓',
                        name: 'Локальная модель Whisper',
                        description: 'Бесплатное офлайн использование. При первом запуске модель будет загружена автоматически. Далее интернет не требуется. Рекомендуется новичкам.'
                      },
                      openai_api: {
                        icon: '🤖',
                        name: 'OpenAI Whisper API',
                        description: 'Облачная обработка с высокой точностью. Оплата зависит от использования. Требуется стабильное интернет-соединение.'
                      },
                      azure_speech: {
                        icon: '☁️',
                        name: 'Azure Speech Services',
                        description: 'Корпоративный сервис распознавания речи, поддержка многих языков и диалектов.'
                      },
                      google_speech: {
                        icon: '🌐',
                        name: 'Google Speech-to-Text',
                        description: 'Поддержка многих языков, высокая точность распознавания, поддержка распознавания речи в реальном времени.'
                      },
                      aliyun_speech: {
                        icon: '☁️',
                        name: 'Alibaba Speech',
                        description: 'Оптимизировано для китайского языка, высокая скорость доступа внутри Китая, поддержка китайских диалектов.'
                      },
                      custom_api: {
                        icon: '⚙️',
                        name: 'Пользовательский API',
                        description: 'Поддержка собственного API endpoint, можно подключить свой сервис распознавания речи.'
                      }
                    }
                    return descriptions[method] || descriptions.whisper_local
                  }
                  
                  const methodInfo = getMethodDescription(speechMethod)
                  
                  return (
                    <Alert
                      message={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{methodInfo.icon}</span>
                          <span>{methodInfo.name} Описание настройки</span>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '12px' }}>
                          <p style={{ margin: '4px 0' }}>{methodInfo.description}</p>
                        </div>
                      }
                      type="info"
                      showIcon={false}
                      style={{ fontSize: '12px', marginTop: '8px' }}
                    />
                  )
                }}
              </Form.Item>
            </Space>
          )}
        </Form>
      </Card>

      {/* Нижняя область кнопок - единый стиль */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div>
          {currentStep > 0 && (
            <Button 
              size="middle"
              onClick={() => setCurrentStep(0)}
              disabled={loading}
            >
              Назад
            </Button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            type="default"
            size="middle"
            onClick={handleSkip}
            disabled={loading}
          >
            Настроить позже
          </Button>
          <Button 
            type="primary" 
            size="middle"
            onClick={handleNext}
            loading={loading}
            icon={loading ? <LoadingOutlined /> : <CheckCircleOutlined />}
          >
            {currentStep === 0 ? 'Далее' : 'Начать использование'}
          </Button>
        </div>
      </div>

      {loading && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '20px',
          padding: '20px',
          background: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <LoadingOutlined style={{ fontSize: '24px', marginRight: '8px' }} />
          <Text>Сохранение настроек и создание тестового проекта...</Text>
        </div>
      )}
    </div>
  )
}

export default FirstRunWizard