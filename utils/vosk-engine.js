/**
 * Vosk 离线语音识别引擎封装
 * 通过 UniApp 原生插件调用 Vosk Android/iOS SDK
 */

let voskPlugin = null
let isModelLoaded = false
let recognitionCallback = null
let statusCallback = null

/**
 * 初始化 Vosk 引擎
 */
export function initVosk() {
  return new Promise((resolve, reject) => {
    try {
      // #ifdef APP-PLUS
      voskPlugin = uni.requireNativePlugin('Vosk-SpeechRecognition')
      if (!voskPlugin) {
        reject(new Error('Vosk 原生插件未安装，请在 manifest.json 中配置 nativePlugins'))
        return
      }
      resolve(true)
      // #endif

      // #ifdef H5
      // H5 环境使用 Web Speech API 作为降级方案
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        resolve(true)
      } else {
        reject(new Error('当前浏览器不支持语音识别'))
      }
      // #endif

      // #ifdef MP-WEIXIN
      reject(new Error('小程序环境暂不支持 Vosk，请使用 APP 端'))
      // #endif
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 加载 Vosk 语音模型
 * @param {string} modelName - 模型名称，如 'vosk-model-small-cn-0.22'
 */
export function loadModel(modelName) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    if (!voskPlugin) {
      reject(new Error('Vosk 引擎未初始化'))
      return
    }
    if (statusCallback) {
      statusCallback({ status: 'loading', message: '正在加载语音模型...' })
    }

    voskPlugin.loadModel(
      {
        modelPath: modelName,
        sampleRate: 16000
      },
      (res) => {
        if (res.code === 0) {
          isModelLoaded = true
          if (statusCallback) {
            statusCallback({ status: 'ready', message: '模型加载完成' })
          }
          resolve(true)
        } else {
          reject(new Error(res.message || '模型加载失败'))
        }
      }
    )
    // #endif

    // #ifdef H5
    isModelLoaded = true
    if (statusCallback) {
      statusCallback({ status: 'ready', message: '语音引擎就绪 (Web Speech API)' })
    }
    resolve(true)
    // #endif
  })
}

/**
 * 开始语音识别
 * @param {object} options - 识别选项
 * @param {string} options.language - 语言代码
 * @param {function} options.onResult - 识别结果回调 (text, isFinal)
 * @param {function} options.onStatus - 状态变化回调
 */
export function startRecognition(options = {}) {
  const { language = 'zh-CN', onResult, onStatus } = options
  recognitionCallback = onResult
  statusCallback = onStatus

  // #ifdef APP-PLUS
  if (!voskPlugin || !isModelLoaded) {
    if (onStatus) onStatus({ status: 'error', message: '引擎未就绪' })
    return false
  }

  voskPlugin.startRecognition(
    {
      language: language,
      sampleRate: 16000,
      continuous: true
    },
    (res) => {
      if (res.type === 'partial') {
        if (recognitionCallback) recognitionCallback(res.text, false)
      } else if (res.type === 'result') {
        if (recognitionCallback) recognitionCallback(res.text, true)
      } else if (res.type === 'error') {
        if (statusCallback) statusCallback({ status: 'error', message: res.message })
      }
    }
  )

  if (onStatus) onStatus({ status: 'recording', message: '正在录音...' })
  return true
  // #endif

  // #ifdef H5
  return startWebSpeechRecognition(language, onResult, onStatus)
  // #endif
}

/**
 * 停止语音识别
 */
export function stopRecognition() {
  // #ifdef APP-PLUS
  if (voskPlugin) {
    voskPlugin.stopRecognition({}, (res) => {
      if (statusCallback) {
        statusCallback({ status: 'stopped', message: '识别已停止' })
      }
    })
  }
  // #endif

  // #ifdef H5
  stopWebSpeechRecognition()
  // #endif
}

/**
 * 释放 Vosk 引擎资源
 */
export function releaseVosk() {
  // #ifdef APP-PLUS
  if (voskPlugin) {
    voskPlugin.release({}, () => {})
    isModelLoaded = false
  }
  // #endif

  // #ifdef H5
  stopWebSpeechRecognition()
  // #endif
}

/**
 * 获取引擎状态
 */
export function getEngineStatus() {
  return {
    initialized: !!voskPlugin || typeof window !== 'undefined',
    modelLoaded: isModelLoaded,
    platform: getPlatform()
  }
}

function getPlatform() {
  // #ifdef APP-PLUS
  return 'app'
  // #endif
  // #ifdef H5
  return 'h5'
  // #endif
  // #ifdef MP-WEIXIN
  return 'mp-weixin'
  // #endif
  return 'unknown'
}

// ========== H5 降级方案: Web Speech API ==========

let webRecognition = null

function startWebSpeechRecognition(language, onResult, onStatus) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    if (onStatus) onStatus({ status: 'error', message: '浏览器不支持语音识别' })
    return false
  }

  webRecognition = new SpeechRecognition()
  webRecognition.continuous = true
  webRecognition.interimResults = true
  webRecognition.lang = language
  webRecognition.maxAlternatives = 1

  webRecognition.onresult = (event) => {
    let interimText = ''
    let finalText = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalText += transcript
      } else {
        interimText += transcript
      }
    }

    if (finalText && onResult) {
      onResult(finalText, true)
    } else if (interimText && onResult) {
      onResult(interimText, false)
    }
  }

  webRecognition.onerror = (event) => {
    if (onStatus) onStatus({ status: 'error', message: `识别错误: ${event.error}` })
  }

  webRecognition.onend = () => {
    if (onStatus) onStatus({ status: 'stopped', message: '识别结束' })
  }

  webRecognition.start()
  if (onStatus) onStatus({ status: 'recording', message: '正在录音...' })
  return true
}

function stopWebSpeechRecognition() {
  if (webRecognition) {
    webRecognition.stop()
    webRecognition = null
  }
}

export default {
  initVosk,
  loadModel,
  startRecognition,
  stopRecognition,
  releaseVosk,
  getEngineStatus
}
