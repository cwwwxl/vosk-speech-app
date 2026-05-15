<script>
export default {
  onLaunch() {
    console.log('App Launch')
    // 初始化存储
    const records = uni.getStorageSync('speech_records')
    if (!records) {
      uni.setStorageSync('speech_records', [])
    }
    const settings = uni.getStorageSync('app_settings')
    if (!settings) {
      uni.setStorageSync('app_settings', {
        language: 'zh-CN',
        autoSave: true,
        modelPath: 'vosk-model-small-cn-0.22'
      })
    }
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');

page {
  background-color: #0a0a0f;
  color: #e8e6e3;
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
  min-height: 100vh;
}

/* 全局变量 */
:root {
  --primary: #6c5ce7;
  --primary-light: #a29bfe;
  --primary-dark: #4834d4;
  --accent: #00cec9;
  --bg-deep: #0a0a0f;
  --bg-card: #16161f;
  --bg-elevated: #1e1e2a;
  --text-primary: #e8e6e3;
  --text-secondary: #8b8d93;
  --text-muted: #4a4b52;
  --danger: #ff6b6b;
  --success: #2ed573;
  --border: #2a2a3a;
  --radius: 16rpx;
  --radius-lg: 24rpx;
}

.page-container {
  padding: 0 32rpx;
  padding-top: calc(var(--status-bar-height, 44px) + 20rpx);
  padding-bottom: 180rpx;
  min-height: 100vh;
  box-sizing: border-box;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 40rpx;
  letter-spacing: 2rpx;
}
</style>
