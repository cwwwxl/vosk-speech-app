/**
 * 本地存储管理工具
 */

const RECORDS_KEY = 'speech_records'
const SETTINGS_KEY = 'app_settings'

// ========== 记录管理 ==========

/**
 * 获取所有语音记录
 */
export function getAllRecords() {
  try {
    const records = uni.getStorageSync(RECORDS_KEY)
    return Array.isArray(records) ? records : []
  } catch (e) {
    console.error('读取记录失败:', e)
    return []
  }
}

/**
 * 保存一条语音记录
 * @param {object} record - { text, duration, language, timestamp }
 */
export function saveRecord(record) {
  try {
    const records = getAllRecords()
    const newRecord = {
      id: generateId(),
      text: record.text || '',
      duration: record.duration || 0,
      language: record.language || 'zh-CN',
      timestamp: record.timestamp || Date.now(),
      date: formatDate(record.timestamp || Date.now())
    }
    records.unshift(newRecord)
    uni.setStorageSync(RECORDS_KEY, records)
    return newRecord
  } catch (e) {
    console.error('保存记录失败:', e)
    return null
  }
}

/**
 * 删除一条记录
 */
export function deleteRecord(id) {
  try {
    let records = getAllRecords()
    records = records.filter(r => r.id !== id)
    uni.setStorageSync(RECORDS_KEY, records)
    return true
  } catch (e) {
    console.error('删除记录失败:', e)
    return false
  }
}

/**
 * 清空所有记录
 */
export function clearAllRecords() {
  try {
    uni.setStorageSync(RECORDS_KEY, [])
    return true
  } catch (e) {
    return false
  }
}

// ========== 设置管理 ==========

const DEFAULT_SETTINGS = {
  language: 'zh-CN',
  autoSave: true,
  modelPath: 'vosk-model-small-cn-0.22',
  sampleRate: 16000
}

/**
 * 获取应用设置
 */
export function getSettings() {
  try {
    const settings = uni.getStorageSync(SETTINGS_KEY)
    return { ...DEFAULT_SETTINGS, ...(settings || {}) }
  } catch (e) {
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * 更新设置
 */
export function updateSettings(newSettings) {
  try {
    const current = getSettings()
    const merged = { ...current, ...newSettings }
    uni.setStorageSync(SETTINGS_KEY, merged)
    return merged
  } catch (e) {
    console.error('保存设置失败:', e)
    return null
  }
}

// ========== 辅助函数 ==========

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function formatDate(timestamp) {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${min}:${sec}`
}

/**
 * 格式化时长（秒 -> mm:ss）
 */
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default {
  getAllRecords,
  saveRecord,
  deleteRecord,
  clearAllRecords,
  getSettings,
  updateSettings,
  formatDuration
}
