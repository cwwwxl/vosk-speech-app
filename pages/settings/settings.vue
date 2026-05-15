<template>
  <view class="page-container settings-page">
    <text class="page-title">设置</text>

    <!-- 语音识别设置 -->
    <view class="section">
      <text class="section-title">语音识别</text>

      <view class="setting-card">
        <!-- 识别语言 -->
        <view class="setting-item">
          <view class="setting-info">
            <text class="setting-label">识别语言</text>
            <text class="setting-desc">选择语音识别的目标语言</text>
          </view>
          <view class="lang-options">
            <view
              class="option-chip"
              :class="{ active: settings.language === 'zh-CN' }"
              @tap="setLanguage('zh-CN')"
            >
              <text class="option-text">中文</text>
            </view>
            <view
              class="option-chip"
              :class="{ active: settings.language === 'en-US' }"
              @tap="setLanguage('en-US')"
            >
              <text class="option-text">English</text>
            </view>
          </view>
        </view>

        <view class="setting-divider" />

        <!-- 自动保存 -->
        <view class="setting-item">
          <view class="setting-info">
            <text class="setting-label">自动保存</text>
            <text class="setting-desc">停止录音后自动保存识别结果</text>
          </view>
          <switch
            :checked="settings.autoSave"
            @change="toggleAutoSave"
            color="#6c5ce7"
          />
        </view>

        <view class="setting-divider" />

        <!-- 模型选择 -->
        <view class="setting-item">
          <view class="setting-info">
            <text class="setting-label">Vosk 模型</text>
            <text class="setting-desc">{{ modelDescription }}</text>
          </view>
          <view class="model-indicator">
            <view class="model-dot" :class="{ loaded: engineReady }" />
            <text class="model-status">{{ engineReady ? '已加载' : '未加载' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="section">
      <text class="section-title">数据管理</text>

      <view class="setting-card">
        <view class="setting-item" @tap="exportAllRecords">
          <view class="setting-info">
            <text class="setting-label">导出所有记录</text>
            <text class="setting-desc">将所有语音记录导出为 Excel 文件</text>
          </view>
          <text class="setting-arrow">&#x276F;</text>
        </view>

        <view class="setting-divider" />

        <view class="setting-item" @tap="showStorageInfo">
          <view class="setting-info">
            <text class="setting-label">存储信息</text>
            <text class="setting-desc">已保存 {{ recordCount }} 条记录</text>
          </view>
          <text class="setting-arrow">&#x276F;</text>
        </view>

        <view class="setting-divider" />

        <view class="setting-item" @tap="clearData">
          <view class="setting-info">
            <text class="setting-label danger-text">清除所有数据</text>
            <text class="setting-desc">删除所有语音记录和设置</text>
          </view>
          <text class="setting-arrow danger-text">&#x276F;</text>
        </view>
      </view>
    </view>

    <!-- 关于 -->
    <view class="section">
      <text class="section-title">关于</text>

      <view class="setting-card">
        <view class="setting-item">
          <view class="setting-info">
            <text class="setting-label">版本</text>
          </view>
          <text class="setting-value">1.0.0</text>
        </view>

        <view class="setting-divider" />

        <view class="setting-item">
          <view class="setting-info">
            <text class="setting-label">语音引擎</text>
          </view>
          <text class="setting-value">Vosk {{ voskVersion }}</text>
        </view>

        <view class="setting-divider" />

        <view class="setting-item">
          <view class="setting-info">
            <text class="setting-label">运行环境</text>
          </view>
          <text class="setting-value">{{ platformName }}</text>
        </view>
      </view>
    </view>

    <!-- 使用说明 -->
    <view class="section">
      <text class="section-title">使用说明</text>
      <view class="help-card">
        <view class="help-item">
          <text class="help-num">1</text>
          <text class="help-text">首次使用需要下载离线语音模型（约50MB）</text>
        </view>
        <view class="help-item">
          <text class="help-num">2</text>
          <text class="help-text">点击录音按钮开始语音识别，再次点击停止</text>
        </view>
        <view class="help-item">
          <text class="help-num">3</text>
          <text class="help-text">识别结果自动保存到历史记录</text>
        </view>
        <view class="help-item">
          <text class="help-num">4</text>
          <text class="help-text">在历史页面可将记录导出为 Excel 文件</text>
        </view>
        <view class="help-item">
          <text class="help-num">5</text>
          <text class="help-text">所有数据存储在本地，无需联网</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getSettings, updateSettings, getAllRecords, clearAllRecords } from '../../utils/storage.js'
import { exportToExcel } from '../../utils/excel-export.js'

export default {
  data() {
    return {
      settings: {},
      recordCount: 0,
      engineReady: false
    }
  },

  computed: {
    modelDescription() {
      const modelMap = {
        'vosk-model-small-cn-0.22': '中文小模型 (50MB)',
        'vosk-model-cn-0.22': '中文大模型 (1.3GB)',
        'vosk-model-small-en-us-0.15': '英文小模型 (40MB)',
        'vosk-model-en-us-0.22': '英文大模型 (1.8GB)'
      }
      return modelMap[this.settings.modelPath] || this.settings.modelPath || '未设置'
    },
    voskVersion() {
      return '0.3.45'
    },
    platformName() {
      // #ifdef APP-PLUS
      return 'Android/iOS (原生)'
      // #endif
      // #ifdef H5
      return 'H5 (Web Speech API)'
      // #endif
      // #ifdef MP-WEIXIN
      return '微信小程序'
      // #endif
      return '未知'
    }
  },

  onShow() {
    this.settings = getSettings()
    this.recordCount = getAllRecords().length
  },

  methods: {
    setLanguage(lang) {
      this.settings = updateSettings({ language: lang })
      uni.showToast({ title: '已切换', icon: 'success' })
    },

    toggleAutoSave(e) {
      this.settings = updateSettings({ autoSave: e.detail.value })
    },

    async exportAllRecords() {
      const records = getAllRecords()
      if (records.length === 0) {
        uni.showToast({ title: '没有可导出的记录', icon: 'none' })
        return
      }
      try {
        uni.showLoading({ title: '正在导出...' })
        await exportToExcel(records)
        uni.hideLoading()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '导出失败', icon: 'none' })
      }
    },

    showStorageInfo() {
      const records = getAllRecords()
      const totalChars = records.reduce((s, r) => s + (r.text || '').length, 0)
      uni.showModal({
        title: '存储信息',
        content: `记录数量: ${records.length}\n总字数: ${totalChars}\n存储方式: 本地 (localStorage)`,
        showCancel: false
      })
    },

    clearData() {
      uni.showModal({
        title: '确认清除',
        content: '此操作将删除所有语音记录和设置，不可恢复！',
        confirmColor: '#ff6b6b',
        success: (res) => {
          if (res.confirm) {
            clearAllRecords()
            this.settings = updateSettings({
              language: 'zh-CN',
              autoSave: true,
              modelPath: 'vosk-model-small-cn-0.22'
            })
            this.recordCount = 0
            uni.showToast({ title: '已清除', icon: 'success' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.settings-page {
  background: linear-gradient(180deg, #0a0a0f 0%, #0d0d16 100%);
}

.section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 26rpx;
  color: #636e82;
  text-transform: uppercase;
  letter-spacing: 4rpx;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.setting-card {
  background: rgba(22, 22, 31, 0.7);
  border: 1rpx solid rgba(255, 255, 255, 0.06);
  border-radius: 20rpx;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 28rpx;
  min-height: 88rpx;
}

.setting-divider {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.04);
  margin: 0 28rpx;
}

.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.setting-label {
  font-size: 30rpx;
  color: #e8e6e3;
}

.setting-desc {
  font-size: 24rpx;
  color: #636e82;
}

.setting-value {
  font-size: 28rpx;
  color: #8b8d93;
}

.setting-arrow {
  font-size: 28rpx;
  color: #4a4b52;
}

.danger-text {
  color: #ff6b6b !important;
}

/* 语言选择 */
.lang-options {
  display: flex;
  gap: 12rpx;
}

.option-chip {
  padding: 10rpx 28rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.option-chip.active {
  background: rgba(108, 92, 231, 0.2);
  border-color: #6c5ce7;
}

.option-text {
  font-size: 24rpx;
  color: #8b8d93;
}

.option-chip.active .option-text {
  color: #a29bfe;
  font-weight: 500;
}

/* 模型状态 */
.model-indicator {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.model-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #4a4b52;
}

.model-dot.loaded {
  background: #2ed573;
  box-shadow: 0 0 8rpx #2ed573;
}

.model-status {
  font-size: 24rpx;
  color: #636e82;
}

/* 帮助卡片 */
.help-card {
  background: rgba(22, 22, 31, 0.7);
  border: 1rpx solid rgba(255, 255, 255, 0.06);
  border-radius: 20rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.help-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.help-num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(108, 92, 231, 0.15);
  color: #a29bfe;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  text-align: center;
  line-height: 40rpx;
}

.help-text {
  font-size: 26rpx;
  color: #8b8d93;
  line-height: 1.6;
  flex: 1;
}
</style>
