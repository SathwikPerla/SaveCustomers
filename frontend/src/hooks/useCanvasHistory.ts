import { useState, useCallback } from 'react';
import { LogoPlacement } from '../types';

export function useCanvasHistory(initialState: LogoPlacement) {
  const [history, setHistory] = useState<LogoPlacement[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pushState = useCallback((newState: LogoPlacement) => {
    setHistory((prev) => {
      // Discard any redos beyond current index
      const updated = prev.slice(0, currentIndex + 1);
      // Avoid duplicate states
      if (JSON.stringify(updated[updated.length - 1]) === JSON.stringify(newState)) {
        return prev;
      }
      return [...updated, newState];
    });
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex]);

  const undo = useCallback((): LogoPlacement | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback((): LogoPlacement | null => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const resetHistory = useCallback((state: LogoPlacement) => {
    setHistory([state]);
    setCurrentIndex(0);
  }, []);

  return {
    currentState: history[currentIndex] || initialState,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  };
}

