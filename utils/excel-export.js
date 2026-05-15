/**
 * Excel 导出工具
 * 使用 xlsx (SheetJS) 生成 Excel 文件并保存到本地
 */

import * as XLSX from 'xlsx'

/**
 * 将语音记录导出为 Excel 文件
 * @param {Array} records - 语音记录数组
 * @param {string} filename - 文件名（不含扩展名）
 * @returns {Promise<string>} 保存的文件路径
 */
export function exportToExcel(records, filename) {
  return new Promise((resolve, reject) => {
    try {
      if (!records || records.length === 0) {
        reject(new Error('没有可导出的记录'))
        return
      }

      // 准备数据行
      const header = ['序号', '识别文字', '时长(秒)', '语言', '识别时间']
      const rows = records.map((record, index) => [
        index + 1,
        record.text || '',
        record.duration || 0,
        record.language === 'zh-CN' ? '中文' : '英文',
        record.date || new Date(record.timestamp).toLocaleString()
      ])

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      const wsData = [header, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // 设置列宽
      ws['!cols'] = [
        { wch: 6 },   // 序号
        { wch: 60 },  // 识别文字
        { wch: 10 },  // 时长
        { wch: 8 },   // 语言
        { wch: 22 }   // 时间
      ]

      // 添加工作表
      XLSX.utils.book_append_sheet(wb, ws, '语音识别记录')

      // 生成文件
      const defaultFilename = filename || `语音记录_${formatDateForFile(new Date())}`

      // #ifdef APP-PLUS
      saveExcelOnApp(wb, defaultFilename, resolve, reject)
      // #endif

      // #ifdef H5
      saveExcelOnH5(wb, defaultFilename, resolve, reject)
      // #endif

      // #ifdef MP-WEIXIN
      reject(new Error('小程序环境暂不支持导出 Excel'))
      // #endif
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * APP 端保存 Excel
 */
function saveExcelOnApp(wb, filename, resolve, reject) {
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })

    // 保存到本地文件系统
    const filePath = `${plus.io.convertLocalFileSystemURL('_doc')}/${filename}.xlsx`

    // 使用 plus.io 写入文件
    plus.io.resolveLocalFileSystemURL('_doc', (entry) => {
      entry.getFile(
        `${filename}.xlsx`,
        { create: true },
        (fileEntry) => {
          fileEntry.createWriter((writer) => {
            writer.onwrite = () => {
              resolve(fileEntry.fullPath)
              // 提示用户
              uni.showToast({
                title: '导出成功',
                icon: 'success'
              })
              // 尝试用系统应用打开
              setTimeout(() => {
                uni.showModal({
                  title: '导出成功',
                  content: `文件已保存至: ${fileEntry.fullPath}`,
                  confirmText: '打开文件',
                  cancelText: '确定',
                  success: (res) => {
                    if (res.confirm) {
                      plus.runtime.openFile(fileEntry.toLocalURL())
                    }
                  }
                })
              }, 500)
            }
            writer.onerror = (e) => {
              reject(new Error('写入文件失败'))
            }

            // Base64 转 ArrayBuffer
            const binary = atob(wbout)
            const buffer = new ArrayBuffer(binary.length)
            const view = new Uint8Array(buffer)
            for (let i = 0; i < binary.length; i++) {
              view[i] = binary.charCodeAt(i)
            }
            writer.write(buffer)
          }, reject)
        },
        reject
      )
    }, reject)
  } catch (e) {
    reject(e)
  }
}

/**
 * H5 端保存 Excel（浏览器下载）
 */
function saveExcelOnH5(wb, filename, resolve, reject) {
  try {
    XLSX.writeFile(wb, `${filename}.xlsx`)
    resolve(`${filename}.xlsx`)
  } catch (e) {
    reject(e)
  }
}

/**
 * 导出单条记录
 */
export function exportSingleRecord(record, filename) {
  return exportToExcel([record], filename)
}

function formatDateForFile(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}${m}${d}_${h}${min}`
}

export default {
  exportToExcel,
  exportSingleRecord
}
