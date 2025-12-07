import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress benign ResizeObserver loop errors commonly caused by Monaco Editor and xterm.js.
// These are known issues with layout thrashing in these libraries and don't affect functionality.
const SUPPRESSED_ERROR_MESSAGES = [
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded'
];

// 1. Handle global error events (for uncaught exceptions)
window.addEventListener('error', (e) => {
  if (e.message && SUPPRESSED_ERROR_MESSAGES.some(msg => e.message.includes(msg))) {
    // Prevent the error from reaching the console
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

// 2. Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  // The reason can be an Error object or a string. Check both.
  const message = reason instanceof Error ? reason.message : String(reason);
  
  if (SUPPRESSED_ERROR_MESSAGES.some(msg => message.includes(msg))) {
    // Prevent the error from reaching the console
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

// 3. Patch console.error (for errors logged by libraries/browsers directly)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const shouldSuppress = args.some(arg => {
    if (typeof arg === 'string') {
      return SUPPRESSED_ERROR_MESSAGES.some(msg => arg.includes(msg));
    }
    if (arg instanceof Error) {
      return SUPPRESSED_ERROR_MESSAGES.some(msg => arg.message.includes(msg));
    }
    return false;
  });

  if (shouldSuppress) {
    // Suppress the error by not calling the original console.error
    return;
  }

  // For all other errors, call the original console.error
  originalConsoleError(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);