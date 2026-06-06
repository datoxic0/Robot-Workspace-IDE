import React, { useState, useEffect, useRef } from "react";
import { X, Maximize2, Minimize2, Move } from "lucide-react";

interface ResizableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  children: React.ReactNode;
}

export default function ResizableModal({
  isOpen,
  onClose,
  title,
  icon,
  defaultWidth = 650,
  defaultHeight = 480,
  minWidth = 320,
  minHeight = 220,
  children,
}: ResizableModalProps) {
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isCenteredOnMount, setIsCenteredOnMount] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Drag and resize tracking refs
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; objX: number; objY: number } | null>(null);
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; startWidth: number; startHeight: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check mobile scale
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Center the modal on the screen when first opened
  useEffect(() => {
    if (isOpen && !isMaximized && !isMobile) {
      const parentWidth = window.innerWidth;
      const parentHeight = window.innerHeight;
      
      const idealWidth = Math.min(defaultWidth, parentWidth - 40);
      const idealHeight = Math.min(defaultHeight, parentHeight - 40);

      setSize({ width: idealWidth, height: idealHeight });
      setPosition({
        x: Math.max(20, (parentWidth - idealWidth) / 2),
        y: Math.max(20, (parentHeight - idealHeight) / 2),
      });
      setIsCenteredOnMount(true);
    }
  }, [isOpen, isMobile, defaultWidth, defaultHeight]);

  // Adjust center position on screen resize
  useEffect(() => {
    if (isOpen && isCenteredOnMount && !isMaximized && !isMobile) {
      const handleResize = () => {
        const parentWidth = window.innerWidth;
        const parentHeight = window.innerHeight;

        setSize((prevSize) => {
          const newW = Math.min(prevSize.width, parentWidth - 40);
          const newH = Math.min(prevSize.height, parentHeight - 40);

          setPosition((prevPos) => {
            const clampedX = Math.max(10, Math.min(parentWidth - newW - 10, prevPos.x));
            const clampedY = Math.max(10, Math.min(parentHeight - newH - 10, prevPos.y));
            return { x: clampedX, y: clampedY };
          });

          return { width: newW, height: newH };
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isOpen, isCenteredOnMount, isMaximized, isMobile]);

  // Handle Dragging
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (isMaximized || isMobile) return;
    // Don't drag if clicking buttons
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    e.preventDefault();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      objX: position.x,
      objY: position.y,
    };

    document.addEventListener("mousemove", handleHeaderMouseMove);
    document.addEventListener("mouseup", handleHeaderMouseUp);
  };

  const handleHeaderMouseMove = (e: MouseEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Limit position coordinates so header remains grabbable
    const nextX = Math.max(10, Math.min(screenWidth - size.width - 10, dragStartRef.current.objX + dx));
    const nextY = Math.max(10, Math.min(screenHeight - 50, dragStartRef.current.objY + dy));

    setPosition({ x: nextX, y: nextY });
  };

  const handleHeaderMouseUp = () => {
    dragStartRef.current = null;
    document.removeEventListener("mousemove", handleHeaderMouseMove);
    document.removeEventListener("mouseup", handleHeaderMouseUp);
  };

  // Handle Resizing
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isMaximized || isMobile) return;
    e.preventDefault();
    e.stopPropagation();

    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };

    document.addEventListener("mousemove", handleResizeMouseMove);
    document.addEventListener("mouseup", handleResizeMouseUp);
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!resizeStartRef.current) return;
    const dx = e.clientX - resizeStartRef.current.mouseX;
    const dy = e.clientY - resizeStartRef.current.mouseY;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const nextWidth = Math.max(minWidth, Math.min(screenWidth - position.x - 20, resizeStartRef.current.startWidth + dx));
    const nextHeight = Math.max(minHeight, Math.min(screenHeight - position.y - 20, resizeStartRef.current.startHeight + dy));

    setSize({ width: nextWidth, height: nextHeight });
  };

  const handleResizeMouseUp = () => {
    resizeStartRef.current = null;
    document.removeEventListener("mousemove", handleResizeMouseMove);
    document.removeEventListener("mouseup", handleResizeMouseUp);
  };

  // Double click header to toggle maximize
  const handleHeaderDoubleSelect = (e: React.MouseEvent) => {
    if (isMobile) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    setIsMaximized(!isMaximized);
  };

  if (!isOpen) return null;

  // Render on Mobile
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[110] p-4">
        <div 
          className="bg-[#16161a] border border-white/10 rounded-t-xl sm:rounded-lg w-full max-h-[85vh] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-150"
          id="mobile-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 shrink-0 bg-[#0f0f12] rounded-t-xl sm:rounded-t-lg">
            <div className="flex items-center space-x-2">
              {icon && <span className="text-blue-500">{icon}</span>}
              <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wide">
                {title}
              </span>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-100 p-1 rounded-full hover:bg-white/5 cursor-pointer transition-colors"
              aria-label="Close modal"
              id="mobile-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 overflow-y-auto flex-1 select-text">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop styles
  const modalStyle: React.CSSProperties = isMaximized
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 110,
      }
    : {
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 110,
      };

  return (
    <>
      {/* Backdrop for click away if not dragged or custom preference, let's keep a subtle transparent dark drop for desktop */}
      <div 
        className="fixed inset-0 bg-black/45 z-[105]" 
        onClick={onClose}
      />

      <div
        ref={containerRef}
        style={modalStyle}
        className="bg-[#16161a] border border-white/10 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col select-none transition-shadow animate-in fade-in zoom-in duration-150"
        id={`resizable-modal-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
      >
        {/* Drag Handle Header */}
        <div
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={handleHeaderDoubleSelect}
          style={{ cursor: isMaximized ? "default" : "move" }}
          className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 bg-[#0f0f12] rounded-t-lg select-none"
        >
          <div className="flex items-center space-x-2">
            {icon && <span className="text-blue-500">{icon}</span>}
            <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-widest flex items-center space-x-1">
              <span>{title}</span>
              {!isMaximized && (
                <Move className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5" />
              )}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Maximize Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/5 rounded transition-colors cursor-pointer"
              title={isMaximized ? "Restore" : "Maximize"}
              id="maximize-modal-btn"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/5 rounded transition-colors cursor-pointer"
              title="Close"
              id="close-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto flex-1 select-text">
          {children}
        </div>

        {/* Resize Handle - only visible on Desktop and if not Maximize */}
        {!isMaximized && (
          <div
            onMouseDown={handleResizeMouseDown}
            style={{ cursor: "se-resize" }}
            className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end p-0.5 select-none z-20 group"
            title="Drag to resize modal"
            id="resize-handle"
          >
            <svg
              className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            >
              <line x1="14" y1="21" x2="21" y2="14" />
              <line x1="18" y1="21" x2="21" y2="18" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}
