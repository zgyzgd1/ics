/**
 * 模块级隐藏存储，避免 React DevTools 侦测敏感数据。
 * 用于存储 API Key 和 OCR 端点，在解析前注入到 recognition 设置中。
 * 重新加载页面后数据会丢失（安全性 > 便利性）。
 */

let apiKey = ''
let remoteOcrEndpoint = ''

/** 获取当前存储的 API Key */
export function getApiKey(): string {
  return apiKey
}

/** 设置 API Key（模块级变量，不存入 React state） */
export function setApiKey(value: string): void {
  apiKey = value
}

/** 获取当前存储的远程 OCR 端点 */
export function getRemoteOcrEndpoint(): string {
  return remoteOcrEndpoint
}

/** 设置远程 OCR 端点（模块级变量，不存入 React state） */
export function setRemoteOcrEndpoint(value: string): void {
  remoteOcrEndpoint = value
}
