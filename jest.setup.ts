import '@testing-library/jest-dom'

// Set default language to German for tests
Object.defineProperty(window.navigator, 'language', {
  writable: true,
  configurable: true,
  value: 'de',
})
