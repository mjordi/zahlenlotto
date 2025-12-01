import '@testing-library/jest-dom'

// Mock navigator.language to German (default language)
Object.defineProperty(window.navigator, 'language', {
  writable: true,
  configurable: true,
  value: 'de-DE',
})

// Mock localStorage
const localStorageMock: Storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
global.localStorage = localStorageMock
