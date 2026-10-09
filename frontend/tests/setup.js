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
if (typeof globalThis.Notification === 'undefined') {
  globalThis.Notification = function Notification() {}
}

Object.defineProperty(globalThis.Notification, 'permission', {
  writable: true,
  value: 'granted',
})

// Stockage en mémoire espionnable (les services d'authentification relisent ce qu'ils écrivent)
function createStorageMock () {
  let store = new Map()
  return {
    getItem: vi.fn((key) => (store.has(String(key)) ? store.get(String(key)) : null)),
    setItem: vi.fn((key, value) => { store.set(String(key), String(value)) }),
    removeItem: vi.fn((key) => { store.delete(String(key)) }),
    clear: vi.fn(() => { store = new Map() }),
    key: vi.fn((index) => Array.from(store.keys())[index] ?? null),
    get length () {
      return store.size
    }
  }
}

// Mock de localStorage
const localStorageMock = createStorageMock()
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock de sessionStorage
const sessionStorageMock = createStorageMock()
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
  // Repartir d'un stockage vide à chaque test
  localStorageMock.clear()
  sessionStorageMock.clear()
})
