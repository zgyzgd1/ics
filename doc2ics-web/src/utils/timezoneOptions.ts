export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: '中国标准时间' },
  { value: 'UTC', label: '协调世界时' },
  { value: 'America/Los_Angeles', label: '洛杉矶时间' },
  { value: 'Europe/London', label: '伦敦时间' },
  { value: 'Asia/Tokyo', label: '东京时间' },
  { value: 'Europe/Berlin', label: '柏林时间' },
  { value: 'Australia/Sydney', label: '悉尼时间' },
] as const

export const DEFAULT_TIMEZONE = 'Asia/Shanghai'
