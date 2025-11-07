import { vi } from 'vitest'
import { createPinia } from 'pinia'

// Mock des modules externes
vi.mock('postgres', () => {
  return {
    default: vi.fn(() => {
      const mockSql = vi.fn();
      // Simuler la syntaxe de template literals
      return new Proxy(mockSql, {
        get: () => mockSql
      });
    })
  };
})

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn()
}))

// Mock des APIs du navigateur
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn(),
    ready: Promise.resolve(),
    controller: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
})

// Mock des notifications
Object.defineProperty(Notification, 'permission', {
  writable: true,
  value: 'granted',
})

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Configuration globale des tests
global.pinia = createPinia()

// Supprimer les warnings de console en mode test
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  console.warn = vi.fn()
  console.error = vi.fn()
})

afterEach(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
  vi.clearAllMocks()
})
