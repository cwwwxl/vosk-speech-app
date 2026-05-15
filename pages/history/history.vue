<template>
  <view class="page-container history-page">
    <view class="header">
      <text class="page-title">历史记录</text>
      <view class="header-actions" v-if="records.length > 0">
        <view class="action-btn" @tap="exportAll">
          <text class="action-icon">&#x1F4E5;</text>
          <text class="action-text">导出Excel</text>
        </view>
      </view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-bar" v-if="records.length > 0">
      <view class="stat-item">
        <text class="stat-num">{{ records.length }}</text>
        <text class="stat-label">总记录</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item">
        <text class="stat-num">{{ totalWords }}</text>
        <text class="stat-label">总字数</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item">
        <text class="stat-num">{{ totalDuration }}</text>
        <text class="stat-label">总时长</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="record-list" v-if="records.length > 0">
      <view
        class="record-card"
        v-for="(record, index) in records"
        :key="record.id"
      >
        <view class="card-header">
          <view class="card-meta">
            <text class="card-date">{{ record.date }}</text>
            <view class="card-lang-tag">
              <text class="lang-tag-text">{{ record.language === 'zh-CN' ? '中文' : 'EN' }}</text>
            </view>
          </view>
          <view class="card-duration">
            <text class="duration-val">{{ formatDur(record.duration) }}</text>
          </view>
        </view>

        <text class="card-text">{{ truncateText(record.text, 200) }}</text>

        <view class="card-actions">
          <view class="card-action" @tap="copyText(record.text)">
            <text class="card-action-icon">&#x1F4CB;</text>
            <text class="card-action-label">复制</text>
          </view>
          <view class="card-action" @tap="exportSingle(record)">
            <text class="card-action-icon">&#x1F4E4;</text>
            <text class="card-action-label">导出</text>
          </view>
          <view class="card-action danger" @tap="deleteItem(record.id, index)">
            <text class="card-action-icon">&#x1F5D1;</text>
            <text class="card-action-label">删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <text class="empty-icon">&#x1F4C4;</text>
      <text class="empty-title">暂无记录</text>
      <text class="empty-desc">语音识别后的文字将保存在这里</text>
    </view>

    <!-- 底部操作 -->
    <view class="bottom-actions" v-if="records.length > 0">
      <view class="danger-btn" @tap="clearAll">
        <text class="danger-btn-text">清空所有记录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getAllRecords, deleteRecord, clearAllRecords, formatDuration } from '../../utils/storage.js'
import { exportToExcel, exportSingleRecord } from '../../utils/excel-export.js'

export default {
  data() {
    return {
      records: []
    }
  },

  computed: {
    totalWords() {
      return this.records.reduce((sum, r) => sum + (r.text || '').length, 0)
    },
    totalDuration() {
      const total = this.records.reduce((sum, r) => sum + (r.duration || 0), 0)
      return formatDuration(total)
    }
  },

  onShow() {
    this.loadRecords()
  },

  methods: {
    loadRecords() {
      this.records = getAllRecords()
    },

    formatDur(seconds) {
      return formatDuration(seconds || 0)
    },

    truncateText(text, maxLen) {
      if (!text) return ''
      return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
    },

    copyText(text) {
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({ title: '已复制', icon: 'success' })
        }
      })
    },

    async exportAll() {
      try {
        uni.showLoading({ title: '正在导出...' })
        await exportToExcel(this.records)
        uni.hideLoading()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '导出失败', icon: 'none' })
      }
    },

    async exportSingle(record) {
      try {
        uni.showLoading({ title: '正在导出...' })
        await exportSingleRecord(record)
        uni.hideLoading()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '导出失败', icon: 'none' })
      }
    },

    deleteItem(id, index) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: (res) => {
          if (res.confirm) {
            deleteRecord(id)
            this.records.splice(index, 1)
            uni.showToast({ title: '已删除', icon: 'success' })
          }
        }
      })
    },

    clearAll() {
      uni.showModal({
        title: '确认清空',
        content: '确定要删除所有记录吗？此操作不可恢复。',
        confirmColor: '#ff6b6b',
        success: (res) => {
          if (res.confirm) {
            clearAllRecords()
            this.records = []
            uni.showToast({ title: '已清空', icon: 'success' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.history-page {
  background: linear-gradient(180deg, #0a0a0f 0%, #0d0d16 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: rgba(108, 92, 231, 0.15);
  border: 1rpx solid rgba(108, 92, 231, 0.3);
  border-radius: 40rpx;
}

.action-icon {
  font-size: 28rpx;
}

.action-text {
  font-size: 24rpx;
  color: #a29bfe;
}

/* 统计信息 */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(22, 22, 31, 0.6);
  border: 1rpx solid rgba(255, 255, 255, 0.06);
  border-radius: 20rpx;
  padding: 28rpx 20rpx;
  margin-bottom: 32rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #a29bfe;
}

.stat-label {
  font-size: 22rpx;
  color: #636e82;
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.08);
}

/* 记录卡片 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-card {
  background: rgba(22, 22, 31, 0.7);
  border: 1rpx solid rgba(255, 255, 255, 0.06);
  border-radius: 20rpx;
  padding: 28rpx;
  transition: all 0.2s;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-date {
  font-size: 24rpx;
  color: #636e82;
}

.card-lang-tag {
  padding: 4rpx 14rpx;
  background: rgba(108, 92, 231, 0.15);
  border-radius: 20rpx;
}

.lang-tag-text {
  font-size: 20rpx;
  color: #a29bfe;
}

.duration-val {
  font-size: 24rpx;
  color: #636e82;
  font-variant-numeric: tabular-nums;
}

.card-text {
  font-size: 28rpx;
  color: #c8c6c3;
  line-height: 1.7;
  word-break: break-all;
  margin-bottom: 20rpx;
}

.card-actions {
  display: flex;
  gap: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.05);
  padding-top: 20rpx;
}

.card-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.03);
}

.card-action.danger {
  margin-left: auto;
}

.card-action-icon {
  font-size: 24rpx;
}

.card-action-label {
  font-size: 22rpx;
  color: #8b8d93;
}

.card-action.danger .card-action-label {
  color: #ff6b6b;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 32rpx;
  opacity: 0.2;
}

.empty-title {
  font-size: 34rpx;
  color: #4a4b52;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #3a3b42;
}

/* 底部操作 */
.bottom-actions {
  padding: 40rpx 0;
  display: flex;
  justify-content: center;
}

.danger-btn {
  padding: 16rpx 40rpx;
  border-radius: 40rpx;
  border: 1rpx solid rgba(255, 107, 107, 0.3);
  background: rgba(255, 107, 107, 0.08);
}

.danger-btn-text {
  font-size: 26rpx;
  color: #ff6b6b;
}
</style>
