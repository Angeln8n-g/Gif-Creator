import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal, Minimize2, Maximize2, Pin, PinOff, RotateCcw } from 'lucide-react';

interface FloatingWrapperProps {
  title: string;
  children: React.ReactNode;
  defaultFloating?: boolean;
  defaultPositionOffset?: { x: number; y: number }; // Offset from right and top
  width?: string;
  className?: string;
  themeColor?: 'cta' | 'purple' | 'blue' | 'amber';
}

export function FloatingWrapper({
  title,
  children,
  defaultFloating = true,
  defaultPositionOffset = { x: 50, y: 150 },
  width = '350px',
  className = '',
  themeColor = 'purple',
}: FloatingWrapperProps) {
  const [isFloating, setIsFloating] = useState(defaultFloating);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasPositioned, setHasPositioned] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set initial position on mount/float activation
  useEffect(() => {
    if (isFloating && !hasPositioned && !isMobile) {
      const wVal = parseInt(width) || 350;
      const initialX = Math.max(20, window.innerWidth - wVal - defaultPositionOffset.x);
      const initialY = defaultPositionOffset.y;
      setPosition({ x: initialX, y: initialY });
      setHasPositioned(true);
    }
  }, [isFloating, hasPositioned, isMobile, width, defaultPositionOffset]);

  // Handle window resizing to keep the window in viewport bounds
  useEffect(() => {
    if (!isFloating || isMobile) return;
    const handleResize = () => {
      setPosition(prev => {
        const wVal = parseInt(width) || 350;
        const newX = Math.max(10 - wVal / 2, Math.min(window.innerWidth - wVal / 2, prev.x));
        const newY = Math.max(10, Math.min(window.innerHeight - 80, prev.y));
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFloating, isMobile, width]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isFloating || isMobile) return;
    const target = e.target as HTMLElement;
    // Don't drag when interacting with controls
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('textarea')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Failed to set pointer capture:", err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    let newX = positionStartRef.current.x + dx;
    let newY = positionStartRef.current.y + dy;
    
    const wVal = parseInt(width) || 350;
    newX = Math.max(10 - wVal / 2, Math.min(window.innerWidth - wVal / 2, newX));
    newY = Math.max(10, Math.min(window.innerHeight - 80, newY));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  const resetPosition = () => {
    const wVal = parseInt(width) || 350;
    const initialX = Math.max(20, window.innerWidth - wVal - defaultPositionOffset.x);
    const initialY = defaultPositionOffset.y;
    setPosition({ x: initialX, y: initialY });
  };

  const floatingStyle: React.CSSProperties = isFloating
    ? isMobile
      ? {
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92vw',
          zIndex: 61, // Layered on top of modal overlay (z-50)
          margin: 0,
        }
      : {
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: width,
          zIndex: 60, // Layered on top of modal overlay (z-50)
          margin: 0,
        }
    : {};

  const themeColors = {
    cta: {
      text: 'text-cta',
      bgHover: 'hover:bg-cta/10',
      border: 'border-cta/30 ring-cta/10',
    },
    purple: {
      text: 'text-purple-400',
      bgHover: 'hover:bg-purple-500/10',
      border: 'border-purple-500/30 ring-purple-500/10',
    },
    blue: {
      text: 'text-blue-400',
      bgHover: 'hover:bg-blue-500/10',
      border: 'border-blue-500/30 ring-blue-500/10',
    },
    amber: {
      text: 'text-amber-400',
      bgHover: 'hover:bg-amber-500/10',
      border: 'border-amber-500/30 ring-amber-500/10',
    },
  }[themeColor];

  const element = (
    <div
      style={floatingStyle}
      className={`bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl shadow-black/40 ${
        isFloating
          ? `shadow-2xl shadow-black/70 ring-1 backdrop-blur-md bg-dark-card/95 ${themeColors.border}`
          : ''
      } ${className}`}
    >
      {/* Header (Drag handle if floating) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`p-3 border-b border-dark-border flex items-center justify-between select-none ${
          isFloating && !isMobile ? 'cursor-grab active:cursor-grabbing hover:bg-dark-border/10' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isFloating && !isMobile && <GripHorizontal size={14} className="text-gray-500 shrink-0" />}
          <span className="text-xs font-semibold text-white truncate">
            {title}
            {isFloating && <span className="text-[10px] text-gray-500 font-normal ml-1">({isMobile ? 'Flotante' : 'Arrastrable'})</span>}
          </span>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
          {/* Reset Position (Floating only) */}
          {isFloating && !isMobile && (
            <button
              onClick={resetPosition}
              title="Restablecer posición"
              className="p-1 rounded text-gray-400 hover:text-light hover:bg-dark-bg transition-all cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          )}

          {/* Toggle Dock/Float */}
          <button
            onClick={() => setIsFloating(!isFloating)}
            title={isFloating ? "Acoplar" : "Hacer ventana flotante"}
            className={`p-1 rounded transition-all cursor-pointer ${
              isFloating ? `${themeColors.text} ${themeColors.bgHover}` : 'text-gray-400 hover:text-light hover:bg-dark-bg'
            }`}
          >
            {isFloating ? <PinOff size={13} /> : <Pin size={13} />}
          </button>

          {/* Minimize/Maximize */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Maximizar" : "Minimizar"}
            className="p-1 rounded text-gray-400 hover:text-light hover:bg-dark-bg transition-all cursor-pointer"
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {!isMinimized && (
        <div className="p-3.5">
          {children}
        </div>
      )}
    </div>
  );

  if (isFloating) {
    return createPortal(element, document.body);
  }

  return element;
}
