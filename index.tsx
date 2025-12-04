import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress benign ResizeObserver loop errors commonly caused by Monaco Editor.
// This is a known issue with the library and doesn't affect functionality.
// We patch both window.onerror and console.error to catch it.
const SUPPRESSED_ERROR_MESSAGE = 'ResizeObserver loop completed with undelivered notifications';

// 1. Handle global error events (for uncaught exceptions)
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes(SUPPRESSED_ERROR_MESSAGE)) {
    // Prevent the error from reaching the console
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

// 2. Patch console.error (for errors logged by libraries/browsers directly)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const shouldSuppress = args.some(arg => 
    arg && typeof arg.toString === 'function' && arg.toString().includes(SUPPRESSED_ERROR_MESSAGE)
  );

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