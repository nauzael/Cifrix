import { vi } from 'vitest';

const mockIndexedDB = {
  open: vi.fn(() => Promise.resolve({
    result: {},
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null
  })),
  delete: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
  isOpen: vi.fn(() => true)
};

const createIndexedDBMock = () => mockIndexedDB;

(global as any).indexedDB = mockIndexedDB;
(global as any).IDBKeyRange = {
  bound: vi.fn(),
  only: vi.fn(),
  lowerBound: vi.fn(),
  upperBound: vi.fn()
};

(global as any).window = {
  indexedDB: mockIndexedDB,
  location: { href: '', origin: 'http://localhost' },
  confirm: vi.fn(() => true),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

(global as any).navigator = {
  serviceWorker: {
    getRegistrations: vi.fn(() => Promise.resolve([])),
    register: vi.fn(() => Promise.resolve({ unregister: vi.fn() }))
  },
  onLine: true
};

console.log = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();
