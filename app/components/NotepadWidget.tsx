'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Widget from './Widget';
import { getFromLocalStorage, saveToLocalStorage } from '@/app/lib/utils';
import { useReactiveColors } from './ColorContext';

const STORAGE_KEY = 'hyperdash-notepad';

interface ImageResizeState {
  img: HTMLImageElement;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  handle: 'se' | 'sw' | 'ne' | 'nw';
}

interface ImageControl {
  img: HTMLImageElement;
  rect: DOMRect;
}

export default function NotepadWidget() {
  const [content, setContent] = useState('');
  const [isResizing, setIsResizing] = useState<ImageResizeState | null>(null);
  const [hoveredImage, setHoveredImage] = useState<ImageControl | null>(null);
  const [imageControls, setImageControls] = useState<ImageControl[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const { colors } = useReactiveColors();

  useEffect(() => {
    const saved = getFromLocalStorage(STORAGE_KEY);
    if (saved && editorRef.current) {
      editorRef.current.innerHTML = saved;
      setContent(saved);
    }
  }, []);

  // Update image controls positions
  const updateImageControls = useCallback(() => {
    if (!editorRef.current) return;
    
    const images = editorRef.current.querySelectorAll<HTMLImageElement>('img.notepad-image');
    const controls: ImageControl[] = [];
    
    images.forEach((img) => {
      const rect = img.getBoundingClientRect();
      const editorRect = editorRef.current!.getBoundingClientRect();
      controls.push({
        img,
        rect: {
          ...rect,
          left: rect.left - editorRect.left,
          top: rect.top - editorRect.top,
        } as DOMRect,
      });
    });
    
    setImageControls(controls);
  }, []);

  // Setup images when content changes
  useEffect(() => {
    if (!editorRef.current) return;
    
    const images = editorRef.current.querySelectorAll<HTMLImageElement>('img.notepad-image');
    const timeouts: NodeJS.Timeout[] = [];
    
    const handleMouseEnter = (img: HTMLImageElement) => {
      const updateHover = () => {
        if (!editorRef.current) return;
        const rect = img.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();
        setHoveredImage({
          img,
          rect: {
            ...rect,
            left: rect.left - editorRect.left,
            top: rect.top - editorRect.top,
          } as DOMRect,
        });
      };
      updateHover();
    };
    
    const handleMouseLeave = () => {
      // Small delay to allow moving to controls
      const timeout = setTimeout(() => {
        setHoveredImage((prev) => {
          // Only clear if mouse is not over controls
          if (prev && !controlsRef.current?.matches(':hover')) {
            return null;
          }
          return prev;
        });
      }, 100);
      timeouts.push(timeout);
    };
    
    images.forEach((img) => {
      // Ensure images have proper sizing if they don't already
      if (!img.style.width || img.style.width === 'auto') {
        if (!editorRef.current) return;
        const editorWidth = editorRef.current.clientWidth - 24;
        const currentWidth = img.offsetWidth || img.naturalWidth;
        const currentHeight = img.offsetHeight || img.naturalHeight;
        
        // If image is too large, scale it down
        if (currentWidth > 400 || currentWidth > editorWidth - 20) {
          const maxWidth = Math.min(400, editorWidth - 20);
          const aspectRatio = currentWidth / currentHeight;
          const newWidth = Math.min(currentWidth, maxWidth);
          const newHeight = newWidth / aspectRatio;
          
          if (newHeight > 300) {
            const constrainedHeight = 300;
            const constrainedWidth = constrainedHeight * aspectRatio;
            img.style.width = `${constrainedWidth}px`;
            img.style.height = `${constrainedHeight}px`;
          } else {
            img.style.width = `${newWidth}px`;
            img.style.height = `${newHeight}px`;
          }
          img.style.maxWidth = 'none';
        }
      }
      
      // Remove existing listeners by cloning
      const newImg = img.cloneNode(true) as HTMLImageElement;
      img.parentNode?.replaceChild(newImg, img);
      
      newImg.addEventListener('mouseenter', () => handleMouseEnter(newImg));
      newImg.addEventListener('mouseleave', handleMouseLeave);
    });
    
    updateImageControls();
    
    // Cleanup function
    return () => {
      // Clear any pending timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
      // Clear hover state on cleanup
      setHoveredImage(null);
    };
  }, [content, updateImageControls]);

  // Update controls on scroll
  useEffect(() => {
    if (!editorRef.current) return;
    
    const handleScroll = () => {
      if (hoveredImage) {
        const rect = hoveredImage.img.getBoundingClientRect();
        const editorRect = editorRef.current!.getBoundingClientRect();
        setHoveredImage({
          ...hoveredImage,
          rect: {
            ...rect,
            left: rect.left - editorRect.left,
            top: rect.top - editorRect.top,
          } as DOMRect,
        });
      }
    };
    
    const editor = editorRef.current;
    editor.addEventListener('scroll', handleScroll);
    return () => {
      editor.removeEventListener('scroll', handleScroll);
    };
  }, [hoveredImage]);

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      saveToLocalStorage(STORAGE_KEY, newContent);
      updateImageControls();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    
    // Check if image is pasted
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          insertImage(blob);
          return;
        }
      }
    }
    
    // Otherwise, paste text
    const text = clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const insertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!editorRef.current) return;
      
      // Focus the editor first
      editorRef.current.focus();
      
      const img = document.createElement('img');
      img.src = e.target?.result as string;
      img.className = 'notepad-image';
      
      // Set default max size based on editor width
      const editorWidth = editorRef.current.clientWidth - 24; // Account for padding
      const defaultMaxWidth = Math.min(400, editorWidth - 20); // Max 400px or editor width minus margin
      
      img.style.maxWidth = `${defaultMaxWidth}px`;
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '8px 0';
      img.style.borderRadius = '4px';
      img.style.cursor = 'move';
      
      // Wait for image to load to get natural dimensions
      img.onload = () => {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        const aspectRatio = naturalWidth / naturalHeight;
        
        // Set initial size - fit within default max width while maintaining aspect ratio
        let initialWidth = Math.min(naturalWidth, defaultMaxWidth);
        let initialHeight = initialWidth / aspectRatio;
        
        // If height is too tall, scale down based on height instead
        const maxHeight = 300; // Max initial height
        if (initialHeight > maxHeight) {
          initialHeight = maxHeight;
          initialWidth = initialHeight * aspectRatio;
        }
        
        img.style.width = `${initialWidth}px`;
        img.style.height = `${initialHeight}px`;
        img.style.maxWidth = 'none'; // Remove maxWidth constraint after setting explicit size
      };
      
      // Insert at cursor position, but only if selection is within the editor
      const selection = window.getSelection();
      let insertRange: Range | null = null;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Check if the range is within the editor
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          insertRange = range;
        }
      }
      
      if (insertRange && selection) {
        // Insert at cursor position within editor
        insertRange.deleteContents();
        insertRange.insertNode(img);
        insertRange.setStartAfter(img);
        insertRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(insertRange);
      } else {
        // Insert at the end of editor content
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false); // Collapse to end
        range.insertNode(img);
        
        // Set cursor after the image
        range.setStartAfter(img);
        range.collapse(true);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      handleInput();
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      insertImage(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteImage = (img: HTMLImageElement) => {
    img.remove();
    setHoveredImage(null);
    handleInput();
  };

  const handleResizeMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    img: HTMLImageElement,
    handle: ImageResizeState['handle']
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = img.getBoundingClientRect();
    setIsResizing({
      img,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      handle,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const { img, startX, startY, startWidth, startHeight, handle } = isResizing;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    // Calculate new dimensions based on handle
    if (handle.includes('e')) newWidth = startWidth + deltaX;
    if (handle.includes('w')) newWidth = startWidth - deltaX;
    if (handle.includes('s')) newHeight = startHeight + deltaY;
    if (handle.includes('n')) newHeight = startHeight - deltaY;
    
    // Maintain aspect ratio
    const aspectRatio = startWidth / startHeight;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      newHeight = newWidth / aspectRatio;
    } else {
      newWidth = newHeight * aspectRatio;
    }
    
    // Apply constraints - max size based on editor width
    const editorWidth = editorRef.current?.clientWidth || 600;
    const maxWidth = Math.min(600, editorWidth - 40); // Max 600px or editor width minus padding
    const maxHeight = 800; // Max height constraint
    
    newWidth = Math.max(50, Math.min(newWidth, maxWidth));
    newHeight = Math.max(50, Math.min(newHeight, maxHeight));
    
    requestAnimationFrame(() => {
      img.style.width = `${newWidth}px`;
      img.style.height = `${newHeight}px`;
      img.style.maxWidth = 'none';
      
      // Update hover state position
      if (hoveredImage?.img === img) {
        const rect = img.getBoundingClientRect();
        const editorRect = editorRef.current!.getBoundingClientRect();
        setHoveredImage({
          ...hoveredImage,
          rect: {
            ...rect,
            left: rect.left - editorRect.left,
            top: rect.top - editorRect.top,
          } as DOMRect,
        });
      }
    });
  }, [isResizing, hoveredImage]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(null);
      handleInput();
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Widget title="Notepad">
      <div className="flex flex-col h-full min-h-0 gap-2 relative">
        {/* Toolbar */}
        <div className="flex-shrink-0 flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="notepad-image-input"
          />
          <label
            htmlFor="notepad-image-input"
            className="bg-white/10 border border-white/30 rounded-sm px-3 py-1.5 text-sm font-mono cursor-pointer hover:bg-white/15 hover:border-white/50 transition-all duration-200"
            style={{ color: colors.button }}
            onMouseDown={(e) => {
              // Prevent label from taking focus, but still allow file dialog to open
              e.preventDefault();
              fileInputRef.current?.click();
            }}
          >
            Add Image
          </label>
        </div>

        {/* Editor Container */}
        <div className="flex-1 relative min-h-0">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            className="h-full w-full bg-black/10 border border-white/20 rounded-sm p-3 font-mono text-sm focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-all duration-200 hover:border-white/40 overflow-y-auto overflow-x-hidden auto-hide-scrollbar"
            style={{
              color: colors.primary,
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
            data-placeholder="Start typing or paste an image..."
          />

          {/* Image Controls Overlay */}
          {hoveredImage && (
            <div
              ref={controlsRef}
              className="absolute pointer-events-none z-20"
              style={{
                left: `${hoveredImage.rect.left}px`,
                top: `${hoveredImage.rect.top}px`,
                width: `${hoveredImage.rect.width}px`,
                height: `${hoveredImage.rect.height}px`,
              }}
              onMouseEnter={() => {
                // Keep controls visible when hovering over them
                const rect = hoveredImage.img.getBoundingClientRect();
                const editorRect = editorRef.current!.getBoundingClientRect();
                setHoveredImage({
                  ...hoveredImage,
                  rect: {
                    ...rect,
                    left: rect.left - editorRect.left,
                    top: rect.top - editorRect.top,
                  } as DOMRect,
                });
              }}
              onMouseLeave={() => {
                setTimeout(() => setHoveredImage(null), 100);
              }}
            >
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteImage(hoveredImage.img);
                }}
                className="absolute -top-2 -left-2 pointer-events-auto bg-black/80 border border-white/30 rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/95 hover:border-white/50 hover:scale-110 transition-all duration-200 font-mono"
                style={{ color: colors.button }}
                title="Delete image"
              >
                ×
              </button>

              {/* Resize Handle (top-right corner) */}
              <div
                className="absolute -top-1 -right-1 pointer-events-auto w-4 h-4 bg-white/60 border border-white/80 rounded cursor-nesw-resize hover:bg-white/80 hover:scale-110 transition-all z-10"
                onMouseDown={(e) => handleResizeMouseDown(e, hoveredImage.img, 'ne')}
                title="Drag to resize"
              />
            </div>
          )}
        </div>

        {/* Global styles */}
        <style jsx global>{`
          [contenteditable] {
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }

          [contenteditable] img.notepad-image {
            position: relative;
            display: block;
            margin: 8px 0;
            border-radius: 4px;
            object-fit: contain;
          }

          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: var(--text-placeholder);
            pointer-events: none;
          }

          [contenteditable] img.notepad-image:hover {
            outline: 2px solid rgba(255, 255, 255, 0.5);
            outline-offset: 2px;
          }

          /* Scrollbar styling */
          [contenteditable]::-webkit-scrollbar {
            width: 8px;
          }

          [contenteditable]::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }

          [contenteditable]::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
          }

          [contenteditable]::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.4);
          }
        `}</style>
      </div>
    </Widget>
  );
}
