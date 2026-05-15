<template>
  <view class="page-container record-page">
    <!-- 顶部状态栏 -->
    <view class="header">
      <text class="page-title">语音识别</text>
      <view class="engine-badge" :class="engineStatus">
        <view class="badge-dot" />
        <text class="badge-text">{{ engineLabel }}</text>
      </view>
    </view>

    <!-- 识别结果展示区 -->
    <view class="result-area">
      <scroll-view scroll-y class="result-scroll" :scroll-into-view="scrollTarget">
        <view class="result-content">
          <!-- 已确认的文字 -->
          <text v-if="finalText" class="final-text">{{ finalText }}</text>
          <!-- 临时识别文字 -->
          <text v-if="interimText" class="interim-text">{{ interimText }}</text>
          <!-- 空状态 -->
          <view v-if="!finalText && !interimText" class="empty-state">
            <text class="empty-icon">&#x1F399;</text>
            <text class="empty-text">点击下方按钮开始语音识别</text>
            <text class="empty-sub">支持中文 / English</text>
          </view>
        </view>
        <view id="scroll-bottom" />
      </scroll-view>
    </view>

    <!-- 录音时长 -->
    <view v-if="isRecording" class="duration-display">
      <view class="duration-dot" />
      <text class="duration-text">{{ formattedDuration }}</text>
    </view>

    <!-- 波形动画 -->
    <wave-animation :isActive="isRecording" :barCount="50" />

    <!-- 语言切换 -->
    <view class="lang-switch">
      <view
        class="lang-btn"
        :class="{ active: currentLang === 'zh-CN' }"
        @tap="switchLang('zh-CN')"
      >
        <text class="lang-label">中文</text>
      </view>
      <view
        class="lang-btn"
        :class="{ active: currentLang === 'en-US' }"
        @tap="switchLang('en-US')"
      >
        <text class="lang-label">EN</text>
      </view>
    </view>

    <!-- 录音控制按钮 -->
    <view class="controls">
      <!-- 清除按钮 -->
      <view class="ctrl-btn secondary" @tap="clearCurrent" v-if="finalText">
        <text class="ctrl-icon">&#x1F5D1;</text>
      </view>
      <view class="ctrl-btn secondary placeholder" v-else />

      <!-- 主录音按钮 -->
      <view
        class="mic-btn"
        :class="{ recording: isRecording }"
        @tap="toggleRecording"
      >
        <view class="mic-btn-inner">
          <view class="mic-icon-wrap">
            <text v-if="!isRecording" class="mic-icon">&#x1F3A4;</text>
            <view v-else class="stop-icon" />
          </view>
        </view>
        <!-- 录音脉冲效果 -->
        <view v-if="isRecording" class="pulse-ring ring-1" />
        <view v-if="isRecording" class="pulse-ring ring-2" />
      </view>

      <!-- 保存按钮 -->
      <view class="ctrl-btn secondary" @tap="saveCurrentRecord" v-if="finalText && !isRecording">
        <text class="ctrl-icon">&#x1F4BE;</text>
      </view>
      <view class="ctrl-btn secondary placeholder" v-else />
    </view>
  </view>
</template>

<script>
import { initVosk, loadModel, startRecognition, stopRecognition } from '../../utils/vosk-engine.js'
import { saveRecord, getSettings, formatDuration } from '../../utils/storage.js'

export default {
  data() {
    return {
      isRecording: false,
      finalText: '',
      interimText: '',
      currentLang: 'zh-CN',
      duration: 0,
      durationTimer: null,
      engineReady: false,
      engineLoading: false,
      scrollTarget: ''
    }
  },

  computed: {
    formattedDuration() {
      return formatDuration(this.duration)
    },
    engineStatus() {
      if (this.engineLoading) return 'loading'
      if (this.engineReady) return 'ready'
      return 'idle'
    },
    engineLabel() {
      if (this.engineLoading) return '加载中...'
      if (this.engineReady) return 'Vosk 就绪'
      return '未初始化'
    }
  },

  onLoad() {
    const settings = getSettings()
    this.currentLang = settings.language || 'zh-CN'
    this.initEngine()
  },

  onUnload() {
    if (this.isRecording) {
      this.stopRec()
    }
  },

  methods: {
    async initEngine() {
      this.engineLoading = true
      try {
        await initVosk()
        const settings = getSettings()
        await loadModel(settings.modelPath)
        this.engineReady = true
      } catch (e) {
        console.warn('引擎初始化:', e.message)
        // 即使原生插件不可用，也标记为就绪（H5 降级方案可用）
        this.engineReady = true
      } finally {
        this.engineLoading = false
      }
    },

    toggleRecording() {
      if (this.isRecording) {
        this.stopRec()
      } else {
        this.startRec()
      }
    },

    startRec() {
      // 请求录音权限
      uni.authorize({
        scope: 'scope.record',
        success: () => this.doStartRec(),
        fail: () => {
          // APP 端权限处理
          // #ifdef APP-PLUS
          this.doStartRec()
          // #endif
          // #ifdef H5
          this.doStartRec()
          // #endif
        }
      })
    },

    doStartRec() {
      this.isRecording = true
      this.interimText = ''
      this.duration = 0

      // 开始计时
      this.durationTimer = setInterval(() => {
        this.duration++
      }, 1000)

      const success = startRecognition({
        language: this.currentLang,
        onResult: (text, isFinal) => {
          if (isFinal) {
            this.finalText += (this.finalText ? '\n' : '') + text
            this.interimText = ''
          } else {
            this.interimText = text
          }
          // 自动滚动到底部
          this.$nextTick(() => {
            this.scrollTarget = 'scroll-bottom'
          })
        },
        onStatus: (status) => {
          console.log('识别状态:', status)
          if (status.status === 'error') {
            uni.showToast({ title: status.message, icon: 'none' })
            this.stopRec()
          }
          if (status.status === 'stopped' && this.isRecording) {
            // 引擎自动停止了，重新启动（continuous 模式）
          }
        }
      })

      if (!success) {
        this.isRecording = false
        clearInterval(this.durationTimer)
        uni.showToast({ title: '启动录音失败', icon: 'none' })
      }
    },

    stopRec() {
      this.isRecording = false
      clearInterval(this.durationTimer)
      stopRecognition()

      // 如果有临时文字，合并到最终文字
      if (this.interimText) {
        this.finalText += (this.finalText ? '\n' : '') + this.interimText
        this.interimText = ''
      }

      // 自动保存
      const settings = getSettings()
      if (settings.autoSave && this.finalText) {
        this.saveCurrentRecord()
      }
    },

    saveCurrentRecord() {
      if (!this.finalText) {
        uni.showToast({ title: '没有可保存的内容', icon: 'none' })
        return
      }

      const record = saveRecord({
        text: this.finalText,
        duration: this.duration,
        language: this.currentLang,
        timestamp: Date.now()
      })

      if (record) {
        uni.showToast({ title: '已保存', icon: 'success' })
      }
    },

    clearCurrent() {
      uni.showModal({
        title: '确认清除',
        content: '确定要清除当前识别内容吗？',
        success: (res) => {
          if (res.confirm) {
            this.finalText = ''
            this.interimText = ''
            this.duration = 0
          }
        }
      })
    },

    switchLang(lang) {
      if (this.isRecording) {
        uni.showToast({ title: '请先停止录音', icon: 'none' })
        return
      }
      this.currentLang = lang
    }
  }
}
</script>

<style scoped>
.record-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.engine-badge {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 20rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.badge-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #4a4b52;
}

.engine-badge.ready .badge-dot {
  background: #2ed573;
  box-shadow: 0 0 8rpx #2ed573;
}

.engine-badge.loading .badge-dot {
  background: #ffa502;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.badge-text {
  font-size: 22rpx;
  color: #8b8d93;
}

/* 结果展示区 */
.result-area {
  flex: 1;
  background: rgba(22, 22, 31, 0.6);
  border: 1rpx solid rgba(108, 92, 231, 0.15);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  min-height: 360rpx;
  max-height: 520rpx;
}

.result-scroll {
  height: 100%;
}

.final-text {
  font-size: 32rpx;
  color: #e8e6e3;
  line-height: 1.8;
  word-break: break-all;
}

.interim-text {
  font-size: 30rpx;
  color: #a29bfe;
  line-height: 1.8;
  opacity: 0.7;
  word-break: break-all;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
  opacity: 0.3;
}

.empty-text {
  font-size: 28rpx;
  color: #4a4b52;
  margin-bottom: 12rpx;
}

.empty-sub {
  font-size: 24rpx;
  color: #3a3b42;
}

/* 录音时长 */
.duration-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.duration-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ff6b6b;
  animation: blink 1s infinite;
}

.duration-text {
  font-size: 36rpx;
  color: #ff6b6b;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 4rpx;
}

/* 语言切换 */
.lang-switch {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin: 24rpx 0;
}

.lang-btn {
  padding: 12rpx 40rpx;
  border-radius: 40rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}

.lang-btn.active {
  background: rgba(108, 92, 231, 0.2);
  border-color: #6c5ce7;
}

.lang-label {
  font-size: 26rpx;
  color: #8b8d93;
}

.lang-btn.active .lang-label {
  color: #a29bfe;
  font-weight: 500;
}

/* 控制按钮 */
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60rpx;
  padding: 30rpx 0 40rpx;
}

.mic-btn {
  position: relative;
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-btn-inner {
  width: 130rpx;
  height: 130rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6c5ce7, #4834d4);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 30rpx rgba(108, 92, 231, 0.4);
  transition: all 0.3s;
  z-index: 2;
}

.mic-btn.recording .mic-btn-inner {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  box-shadow: 0 8rpx 30rpx rgba(255, 107, 107, 0.4);
}

.mic-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-icon {
  font-size: 52rpx;
}

.stop-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 6rpx;
  background: #fff;
}

/* 脉冲效果 */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2rpx solid rgba(255, 107, 107, 0.4);
  z-index: 1;
}

.ring-1 {
  animation: pulse 2s ease-out infinite;
}

.ring-2 {
  animation: pulse 2s ease-out infinite 1s;
}

@keyframes pulse {
  0% {
    width: 130rpx;
    height: 130rpx;
    opacity: 0.6;
  }
  100% {
    width: 220rpx;
    height: 220rpx;
    opacity: 0;
  }
}

.ctrl-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}

.ctrl-btn.placeholder {
  opacity: 0;
}

.ctrl-icon {
  font-size: 36rpx;
}
</style>
