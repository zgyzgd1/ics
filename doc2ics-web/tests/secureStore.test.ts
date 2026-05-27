import { describe, expect, it, beforeEach } from 'vitest'
import { getApiKey, setApiKey, getRemoteOcrEndpoint, setRemoteOcrEndpoint } from '../src/utils/secureStore'

describe('secureStore', () => {
  beforeEach(() => {
    setApiKey('')
    setRemoteOcrEndpoint('')
  })

  it('stores and retrieves API key', () => {
    setApiKey('test-key-123')
    expect(getApiKey()).toBe('test-key-123')
  })

  it('stores and retrieves remote OCR endpoint', () => {
    setRemoteOcrEndpoint('https://ocr.example.com/api')
    expect(getRemoteOcrEndpoint()).toBe('https://ocr.example.com/api')
  })

  it('returns empty string by default', () => {
    expect(getApiKey()).toBe('')
    expect(getRemoteOcrEndpoint()).toBe('')
  })

  it('clears API key when set to empty string', () => {
    setApiKey('temp-key')
    expect(getApiKey()).toBe('temp-key')
    setApiKey('')
    expect(getApiKey()).toBe('')
  })

  it('clears endpoint when set to empty string', () => {
    setRemoteOcrEndpoint('https://example.com')
    expect(getRemoteOcrEndpoint()).toBe('https://example.com')
    setRemoteOcrEndpoint('')
    expect(getRemoteOcrEndpoint()).toBe('')
  })

  it('overwrites previous value on repeated set', () => {
    setApiKey('first-key')
    setApiKey('second-key')
    expect(getApiKey()).toBe('second-key')
  })
})
