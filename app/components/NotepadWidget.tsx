'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Widget from './Widget';
import { getFromLocalStorage, saveToLocalStorage } from '@/app/lib/utils';
import { useReactiveColors } from './ColorContext';

const STORAGE_KEY = 'hyperdash-notepad';
const MAX_TABS = 20;

interface NotepadTab {
  id: string;
  name: string;
  content: string;
}

interface NotepadData {
  tabs: NotepadTab[];
  activeTabId: string;
}

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

export default function NotepadWidget({ isFocused }: { isFocused?: boolean }) {
  const [tabs, setTabs] = useState<NotepadTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isResizing, setIsResizing] = useState<ImageResizeState | null>(null);
  const [hoveredImage, setHoveredImage] = useState<ImageControl | null>(null);
  const [imageControls, setImageControls] = useState<ImageControl[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const tabNameInputRef = useRef<HTMLInputElement>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const isSwitchingTabRef = useRef(false);
  const { colors } = useReactiveColors();

  // Initialize tabs from storage or create default tab
  useEffect(() => {
    const saved = getFromLocalStorage(STORAGE_KEY);
    if (saved) {
      try {
        const data: NotepadData = JSON.parse(saved);
        if (data.tabs && data.tabs.length > 0) {
          setTabs(data.tabs);
          setActiveTabId(data.activeTabId || data.tabs[0].id);
          isSwitchingTabRef.current = true;
        } else {
          // Migrate old single notepad format
          const oldContent = saved;
          const defaultTab: NotepadTab = {
            id: Date.now().toString(),
            name: 'Notepad 1',
            content: oldContent,
          };
          setTabs([defaultTab]);
          setActiveTabId(defaultTab.id);
          isSwitchingTabRef.current = true;
        }
      } catch (error) {
        // If parsing fails, treat as old format
        const defaultTab: NotepadTab = {
          id: Date.now().toString(),
          name: 'Notepad 1',
          content: saved,
        };
        setTabs([defaultTab]);
        setActiveTabId(defaultTab.id);
        isSwitchingTabRef.current = true;
      }
    } else {
      // No saved data, create default tab
      const defaultTab: NotepadTab = {
        id: Date.now().toString(),
        name: 'Notepad 1',
        content: '',
      };
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
      isSwitchingTabRef.current = true;
    }
  }, []);

  // Load active tab content into editor when switching tabs
  useEffect(() => {
    if (activeTabId && editorRef.current && tabs.length > 0 && isSwitchingTabRef.current) {
      const activeTab = tabs.find(tab => tab.id === activeTabId);
      if (activeTab) {
        editorRef.current.innerHTML = activeTab.content;
        setContent(activeTab.content);
        isSwitchingTabRef.current = false;
      }
    }
    
    // Scroll active tab into view if it's not visible
    if (activeTabRef.current && tabContainerRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId, tabs]);

  // Save tabs to storage whenever they change
  useEffect(() => {
    if (tabs.length > 0 && activeTabId) {
      const data: NotepadData = {
        tabs,
        activeTabId,
      };
      saveToLocalStorage(STORAGE_KEY, JSON.stringify(data));
    }
  }, [tabs, activeTabId]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const [content, setContent] = useState('');

  // Check for tab overflow
  useEffect(() => {
    const checkOverflow = () => {
      if (tabsListRef.current && tabContainerRef.current) {
        const listWidth = tabsListRef.current.scrollWidth;
        const containerWidth = tabContainerRef.current.clientWidth;
        setHasOverflow(listWidth > containerWidth);
      }
    };
    
    // Check after a short delay to ensure DOM is updated
    const timeoutId = setTimeout(checkOverflow, 0);
    window.addEventListener('resize', checkOverflow);
    
    // Also check on scroll to handle dynamic overflow
    const handleScroll = () => {
      if (tabContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tabContainerRef.current;
        setHasOverflow(scrollWidth > clientWidth);
      }
    };
    
    if (tabContainerRef.current) {
      tabContainerRef.current.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkOverflow);
      if (tabContainerRef.current) {
        tabContainerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [tabs]);

  // Tab management functions
  const createTab = () => {
    setTabs(prevTabs => {
      // Check tab limit
      if (prevTabs.length >= MAX_TABS) {
        return prevTabs;
      }
      
      // Save current tab content before creating new tab
      if (activeTabId && editorRef.current) {
        const currentContent = editorRef.current.innerHTML;
        const updatedTabs = prevTabs.map(tab =>
          tab.id === activeTabId ? { ...tab, content: currentContent } : tab
        );
        const newTab: NotepadTab = {
          id: Date.now().toString(),
          name: `Notepad ${prevTabs.length + 1}`,
          content: '',
        };
        isSwitchingTabRef.current = true;
        setActiveTabId(newTab.id);
        return [...updatedTabs, newTab];
      }
      
      const newTab: NotepadTab = {
        id: Date.now().toString(),
        name: `Notepad ${prevTabs.length + 1}`,
        content: '',
      };
      isSwitchingTabRef.current = true;
      setActiveTabId(newTab.id);
      return [...prevTabs, newTab];
    });
  };

  const switchTab = (tabId: string) => {
    if (tabId === activeTabId) return;
    
    // Save current tab content before switching
    if (activeTabId && editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, content: currentContent } : tab
      ));
    }
    isSwitchingTabRef.current = true;
    setActiveTabId(tabId);
    setEditingTabId(null);
  };

  const deleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Save current tab content before deleting if it's the active tab
    if (activeTabId === tabId && editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, content: currentContent } : tab
      ));
    }
    
    setTabs(prevTabs => {
      if (prevTabs.length === 1) {
        // Can't delete the last tab, just clear its content
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
          setContent('');
          return [{ ...prevTabs[0], content: '' }];
        }
        return prevTabs;
      }
      
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // Switch to another tab if deleting active tab
      if (activeTabId === tabId) {
        const index = prevTabs.findIndex(tab => tab.id === tabId);
        const newActiveIndex = index > 0 ? index - 1 : 0;
        isSwitchingTabRef.current = true;
        setActiveTabId(newTabs[newActiveIndex].id);
      }
      
      return newTabs;
    });
  };

  const startRenameTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prevTabs => {
      const tab = prevTabs.find(t => t.id === tabId);
      if (tab) {
        setEditingTabId(tabId);
        setEditingTabName(tab.name);
        // Use requestAnimationFrame for more reliable focus
        requestAnimationFrame(() => {
          tabNameInputRef.current?.focus();
          tabNameInputRef.current?.select();
        });
      }
      return prevTabs;
    });
  };

  const saveRenameTab = (tabId: string) => {
    if (editingTabName.trim()) {
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, name: editingTabName.trim() } : tab
      ));
    }
    setEditingTabId(null);
    setEditingTabName('');
  };

  const cancelRenameTab = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  // Drag and drop handlers for tab reordering
  const handleTabDragStart = (e: React.DragEvent, tabId: string) => {
    // Prevent dragging if this tab is being edited
    if (editingTabId === tabId) {
      e.preventDefault();
      return;
    }
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    
    // Hide the default drag ghost image
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 1, 1);
      e.dataTransfer.setDragImage(canvas, 0, 0);
    }
  };

  const handleTabDragOver = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTabId && draggedTabId !== targetTabId) {
      setDragOverTabId(targetTabId);
    }
  };

  const handleTabDragLeave = () => {
    // Don't clear immediately - let dragOver handle updates
  };

  const handleTabDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (!draggedTabId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      return;
    }

    const finalTargetId = dragOverTabId || targetTabId;
    
    if (draggedTabId === finalTargetId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      return;
    }

    setTabs(prevTabs => {
      const draggedIndex = prevTabs.findIndex(tab => tab.id === draggedTabId);
      const targetIndex = prevTabs.findIndex(tab => tab.id === finalTargetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        return prevTabs;
      }

      const newTabs = [...prevTabs];
      const [removed] = newTabs.splice(draggedIndex, 1);
      newTabs.splice(targetIndex, 0, removed);

      return newTabs;
    });
    
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleTabDragEnd = () => {
    // If we ended drag without dropping, make sure to apply the visual order
    if (draggedTabId && dragOverTabId && draggedTabId !== dragOverTabId) {
      setTabs(prevTabs => {
        const draggedIndex = prevTabs.findIndex(tab => tab.id === draggedTabId);
        const targetIndex = prevTabs.findIndex(tab => tab.id === dragOverTabId);

        if (draggedIndex === -1 || targetIndex === -1) {
          return prevTabs;
        }

        const newTabs = [...prevTabs];
        const [removed] = newTabs.splice(draggedIndex, 1);
        newTabs.splice(targetIndex, 0, removed);

        return newTabs;
      });
    }
    
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  // Calculate visual order during drag
  const getDisplayTabs = () => {
    if (!draggedTabId || !dragOverTabId || draggedTabId === dragOverTabId) {
      return tabs;
    }

    const draggedIndex = tabs.findIndex(tab => tab.id === draggedTabId);
    const targetIndex = tabs.findIndex(tab => tab.id === dragOverTabId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return tabs;
    }

    const newTabs = [...tabs];
    const [removed] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, removed);

    return newTabs;
  };

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
    if (editorRef.current && activeTabId) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      // Update the active tab's content using functional update
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, content: newContent } : tab
      ));
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when editor is focused or widget is active
      if (!editorRef.current?.contains(document.activeElement) && 
          !tabContainerRef.current?.contains(document.activeElement)) {
        return;
      }
      
      // Ctrl+T or Cmd+T: New tab
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        // Save current tab content before creating new tab
        if (activeTabId && editorRef.current) {
          setTabs(prevTabs => {
            // Check tab limit
            if (prevTabs.length >= MAX_TABS) {
              return prevTabs;
            }
            
            const currentContent = editorRef.current!.innerHTML;
            const updatedTabs = prevTabs.map(tab =>
              tab.id === activeTabId ? { ...tab, content: currentContent } : tab
            );
            const newTab: NotepadTab = {
              id: Date.now().toString(),
              name: `Notepad ${prevTabs.length + 1}`,
              content: '',
            };
            isSwitchingTabRef.current = true;
            setActiveTabId(newTab.id);
            return [...updatedTabs, newTab];
          });
        } else {
          setTabs(prevTabs => {
            // Check tab limit
            if (prevTabs.length >= MAX_TABS) {
              return prevTabs;
            }
            
            const newTab: NotepadTab = {
              id: Date.now().toString(),
              name: `Notepad ${prevTabs.length + 1}`,
              content: '',
            };
            isSwitchingTabRef.current = true;
            setActiveTabId(newTab.id);
            return [...prevTabs, newTab];
          });
        }
        return;
      }
      
      // Ctrl+W or Cmd+W: Close active tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          setTabs(prevTabs => {
            if (prevTabs.length === 1) {
              // Can't delete the last tab, just clear its content
              if (editorRef.current) {
                editorRef.current.innerHTML = '';
                setContent('');
                return [{ ...prevTabs[0], content: '' }];
              }
              return prevTabs;
            }
            
            // Save current tab content before deleting if it's the active tab
            if (editorRef.current) {
              const currentContent = editorRef.current.innerHTML;
              const updatedTabs = prevTabs.map(tab =>
                tab.id === activeTabId ? { ...tab, content: currentContent } : tab
              );
              const newTabs = updatedTabs.filter(tab => tab.id !== activeTabId);
              
              // Switch to another tab if deleting active tab
              const index = prevTabs.findIndex(tab => tab.id === activeTabId);
              const newActiveIndex = index > 0 ? index - 1 : 0;
              isSwitchingTabRef.current = true;
              setActiveTabId(newTabs[newActiveIndex].id);
              
              return newTabs;
            }
            return prevTabs;
          });
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId]);

  return (
    <Widget title="Notepad" isFocused={isFocused}>
      <div className="flex flex-col h-full min-h-0 gap-2 relative">
        {/* Chrome-style Tabs */}
        <div 
          ref={tabContainerRef}
          className="flex-shrink-0 flex items-end gap-0.5 overflow-x-auto overflow-y-hidden pb-0 relative"
        >
          {/* Overflow indicator - left */}
          {hasOverflow && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/60 to-transparent pointer-events-none z-20 flex items-center">
              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-white/30 ml-1" />
            </div>
          )}
          
          {/* Tabs Container */}
          <div 
            ref={tabsListRef}
            className="flex-1 flex items-end gap-0.5 min-w-0"
          >
            {getDisplayTabs().map((tab, index) => (
              <div
                key={tab.id}
                ref={activeTabId === tab.id ? activeTabRef : null}
                data-tab-id={tab.id}
                draggable={editingTabId !== tab.id}
                onDragStart={(e) => handleTabDragStart(e, tab.id)}
                onDragOver={(e) => handleTabDragOver(e, tab.id)}
                onDragLeave={handleTabDragLeave}
                onDrop={(e) => handleTabDrop(e, tab.id)}
                onDragEnd={handleTabDragEnd}
                onClick={() => switchTab(tab.id)}
                className={`
                  group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                  transition-all duration-200 min-w-[80px] max-w-[200px]
                  ${editingTabId === tab.id ? 'cursor-default' : 'cursor-move'}
                  ${activeTabId === tab.id
                    ? 'bg-black/60 border-t border-l border-r border-white/30 rounded-t-sm z-10'
                    : 'bg-black/30 border-t border-l border-r border-white/10 rounded-t-sm hover:bg-black/40 hover:border-white/20'
                  }
                  ${draggedTabId === tab.id 
                    ? 'opacity-50 border-white/50 shadow-lg' 
                    : ''
                  }
                  ${dragOverTabId === tab.id && draggedTabId !== tab.id
                    ? 'border-white/40 bg-black/50'
                    : ''
                  }
                `}
                style={{
                  color: activeTabId === tab.id ? colors.primary : colors.secondary,
                }}
              >
                {/* Tab Name */}
                {editingTabId === tab.id ? (
                  <input
                    ref={tabNameInputRef}
                    type="text"
                    value={editingTabName}
                    onChange={(e) => setEditingTabName(e.target.value)}
                    onBlur={() => saveRenameTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveRenameTab(tab.id);
                      } else if (e.key === 'Escape') {
                        cancelRenameTab();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-black/40 border border-white/30 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-white/50"
                    style={{ color: colors.primary }}
                  />
                ) : (
                  <>
                    <span
                      className="flex-1 truncate select-none"
                      onDoubleClick={(e) => startRenameTab(tab.id, e)}
                    >
                      {tab.name}
                    </span>
                    {/* Delete Button */}
                    <button
                      onClick={(e) => deleteTab(tab.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                      style={{ color: colors.button }}
                      title="Close tab"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Overflow indicator - right */}
          {hasOverflow && (
            <div className="absolute right-[60px] top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent pointer-events-none z-20 flex items-center justify-end">
              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white/30 mr-1" />
            </div>
          )}

          {/* New Tab Button */}
          <button
            onClick={createTab}
            disabled={tabs.length >= MAX_TABS}
            className={`
              flex-shrink-0 w-6 h-6 flex items-center justify-center bg-black/30 border border-white/10 rounded-sm 
              transition-all duration-200 text-xs font-mono
              ${tabs.length >= MAX_TABS 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-black/40 hover:border-white/20 cursor-pointer'
              }
            `}
            style={{ color: colors.button }}
            title={tabs.length >= MAX_TABS ? `Maximum ${MAX_TABS} tabs reached` : 'New tab'}
          >
            +
          </button>

          {/* Add Image Button (Symbol) */}
          <div className="flex-shrink-0">
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
              className="flex items-center justify-center w-6 h-6 bg-black/30 border border-white/10 rounded-sm cursor-pointer hover:bg-black/40 hover:border-white/20 transition-all duration-200"
              style={{ color: colors.button }}
              onMouseDown={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              title="Add image"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </label>
          </div>
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
