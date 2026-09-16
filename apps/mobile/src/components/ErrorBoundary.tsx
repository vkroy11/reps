import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Changing this remounts the child after a crash, which is how Retry works. */
  resetKey?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface InnerProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryInner extends Component<InnerProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * Catches a render error in its children and shows `fallback` instead of
 * unmounting the whole screen.
 *
 * Native crashes (a WebView abort, a YouTube embed the OS kills) still take
 * the process down — this only covers the JS ones, which is the class of
 * "opened a technique and the screen died" that React can actually stop.
 *
 * Reset is a remount (`key={resetKey}`), not a state flip: an error boundary
 * that has caught cannot safely render the same child tree without a new
 * instance.
 */
export function ErrorBoundary({ children, fallback, resetKey, onError }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryInner key={resetKey} fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundaryInner>
  );
}
