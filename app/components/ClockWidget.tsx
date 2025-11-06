'use client';

import { useState, useEffect, useRef } from 'react';
import Widget from './Widget';
import { useReactiveColors } from './ColorContext';
import { getFromLocalStorage, saveToLocalStorage } from '@/app/lib/utils';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());
  const { colors } = useReactiveColors();
  const [clockFormat, setClockFormat] = useState<'12h' | '24h'>(() => {
    const saved = getFromLocalStorage('clockFormat');
    return (saved === '24h' ? '24h' : '12h') as '12h' | '24h';
  });
  
  // Pomodoro timer state
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved pomodoro state from localStorage
  useEffect(() => {
    const savedTimeLeft = getFromLocalStorage('pomodoroTimeLeft');
    const savedIsRunning = getFromLocalStorage('pomodoroIsRunning');
    const savedMode = getFromLocalStorage('pomodoroMode');
    const savedCount = getFromLocalStorage('pomodoroCount');
    
    if (savedTimeLeft) {
      const parsed = parseInt(savedTimeLeft, 10);
      if (parsed > 0) {
        setTimeLeft(parsed);
      }
    }
    if (savedMode) {
      setMode(savedMode as TimerMode);
    }
    if (savedCount) {
      const parsed = parseInt(savedCount, 10);
      setPomodoroCount(parsed);
    }
    // Don't restore running state - start paused on page load
  }, []);

  // Listen for clock format changes
  useEffect(() => {
    const handleClockFormatChange = (e: CustomEvent) => {
      setClockFormat(e.detail);
    };

    window.addEventListener('clockFormatChanged', handleClockFormatChange as EventListener);
    return () => {
      window.removeEventListener('clockFormatChanged', handleClockFormatChange as EventListener);
    };
  }, []);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Pomodoro timer
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer completed
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Save state to localStorage
  useEffect(() => {
    saveToLocalStorage('pomodoroTimeLeft', timeLeft.toString());
    saveToLocalStorage('pomodoroMode', mode);
    saveToLocalStorage('pomodoroCount', pomodoroCount.toString());
  }, [timeLeft, mode, pomodoroCount]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    // Play notification sound (using Web Audio API or a simple beep)
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.error('Error playing notification:', error);
      }
    }

    // Cycle to next mode
    if (mode === 'work') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      
      // Every 4 pomodoros, take a long break
      if (newCount % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(LONG_BREAK_DURATION);
      } else {
        setMode('shortBreak');
        setTimeLeft(SHORT_BREAK_DURATION);
      }
    } else {
      // Break is over, back to work
      setMode('work');
      setTimeLeft(WORK_DURATION);
    }
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === 'work') {
      setTimeLeft(WORK_DURATION);
    } else if (mode === 'shortBreak') {
      setTimeLeft(SHORT_BREAK_DURATION);
    } else {
      setTimeLeft(LONG_BREAK_DURATION);
    }
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (mode === 'work') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      if (newCount % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(LONG_BREAK_DURATION);
      } else {
        setMode('shortBreak');
        setTimeLeft(SHORT_BREAK_DURATION);
      }
    } else {
      setMode('work');
      setTimeLeft(WORK_DURATION);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: clockFormat === '12h',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'work':
        return 'Work';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  };

  return (
    <Widget title="Clock">
      <div className="space-y-4 flex flex-col h-full">
        {/* Clock Section */}
        <div className="space-y-3 flex-shrink-0">
          <div 
            className="text-4xl font-bold font-mono" 
            style={{ color: colors.primary }}
            suppressHydrationWarning
          >
            {formatTime(time)}
          </div>
          <div 
            className="text-sm border-t border-white/10 pt-2" 
            style={{ color: colors.secondary }}
            suppressHydrationWarning
          >
            {formatDate(time)}
          </div>
        </div>

        {/* Pomodoro Timer Section */}
        <div className="space-y-3 flex-1 flex flex-col min-h-0 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between">
            <div 
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: colors.secondary }}
            >
              Pomodoro Timer
            </div>
            <div 
              className="text-xs"
              style={{ color: colors.muted }}
            >
              {pomodoroCount} completed
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div 
                className="text-sm font-medium"
                style={{ color: colors.secondary }}
              >
                {getModeLabel()}
              </div>
              <div 
                className="text-3xl font-bold font-mono"
                style={{ color: colors.primary }}
              >
                {formatTimer(timeLeft)}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex gap-2">
              <button
                onClick={handleStartPause}
                className="
                  flex-1
                  bg-white/10
                  border border-white/30
                  hover:bg-white/15
                  hover:border-white/50
                  px-3 py-2
                  rounded-sm
                  text-xs font-medium
                  transition-all duration-200
                  shadow-sm
                  hover:shadow-white/20
                "
                style={{ color: colors.button }}
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={handleReset}
                className="
                  bg-white/10
                  border border-white/30
                  hover:bg-white/15
                  hover:border-white/50
                  px-3 py-2
                  rounded-sm
                  text-xs font-medium
                  transition-all duration-200
                  shadow-sm
                  hover:shadow-white/20
                "
                style={{ color: colors.button }}
              >
                Reset
              </button>
              <button
                onClick={handleSkip}
                className="
                  bg-white/10
                  border border-white/30
                  hover:bg-white/15
                  hover:border-white/50
                  px-3 py-2
                  rounded-sm
                  text-xs font-medium
                  transition-all duration-200
                  shadow-sm
                  hover:shadow-white/20
                "
                style={{ color: colors.button }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}
