'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Widget from './Widget';
import { getFromLocalStorage, saveToLocalStorage } from '@/app/lib/utils';
import { useReactiveColors } from './ColorContext';
import { useWidgetKeyboardShortcuts } from '@/app/lib/useWidgetKeyboardShortcuts';

const STORAGE_KEY = 'hyperdash-notepad';
const MAX_TABS = 9;

interface NotepadTab {
  id: string;
  name: string;
  content: string;
}

interface NotepadData {
  tabs: NotepadTab[];
  activeTabId: string;
}


interface SerializedSelection {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
}

const isNodeWithin = (node: Node | null, root: Node): boolean => {
  let current: Node | null = node;
  while (current) {
    if (current === root) return true;
    current = current.parentNode;
  }
  return false;
};

const getNodePath = (node: Node, root: Node): number[] => {
  const path: number[] = [];
  let current: Node | null = node;

  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) {
      return [];
    }

    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    if (index === -1) {
      return [];
    }

    path.unshift(index);
    current = parent;
  }

  return path;
};

const getNodeFromPath = (root: Node, path: number[]): Node | null => {
  let current: Node | null = root;
  for (const index of path) {
    if (!current || !current.childNodes || index >= current.childNodes.length) {
      return null;
    }
    current = current.childNodes[index] ?? null;
  }
  return current;
};

const clampOffsetForNode = (node: Node, offset: number): number => {
  if (node.nodeType === Node.TEXT_NODE) {
    const length = node.textContent?.length ?? 0;
    return Math.min(offset, length);
  }
  const length = node.childNodes.length;
  return Math.min(offset, length);
};

const serializeRange = (range: Range, root: Node): SerializedSelection | null => {
  if (!isNodeWithin(range.startContainer, root) || !isNodeWithin(range.endContainer, root)) {
    return null;
  }

  return {
    startPath: getNodePath(range.startContainer, root),
    startOffset: range.startOffset,
    endPath: getNodePath(range.endContainer, root),
    endOffset: range.endOffset,
  };
};

const deserializeRange = (data: SerializedSelection, root: Node): Range | null => {
  const startNode = getNodeFromPath(root, data.startPath);
  const endNode = getNodeFromPath(root, data.endPath);

  if (!startNode || !endNode) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startNode, clampOffsetForNode(startNode, data.startOffset));
  range.setEnd(endNode, clampOffsetForNode(endNode, data.endOffset));
  return range;
};

export default function NotepadWidget({ isFocused }: { isFocused?: boolean }) {
  const [tabs, setTabs] = useState<NotepadTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [pendingActiveTabId, setPendingActiveTabId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabNameInputRef = useRef<HTMLInputElement>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const savedSelectionsRef = useRef<Record<string, SerializedSelection>>({});
  const activeTabRef = useRef<HTMLDivElement>(null);
  const isSwitchingTabRef = useRef(false);
  const { colors } = useReactiveColors();

  const saveCurrentSelection = useCallback(() => {
    if (!editorRef.current || !activeTabId) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!isNodeWithin(range.commonAncestorContainer, editorRef.current)) return;

    const serialized = serializeRange(range, editorRef.current);
    if (serialized) {
      savedSelectionsRef.current[activeTabId] = serialized;
    }
  }, [activeTabId]);

  const restoreSelection = useCallback(
    (tabId: string | null, fallbackToEnd = false) => {
      if (!tabId || !editorRef.current) return false;
      const selection = window.getSelection();
      if (!selection) return false;

      const saved = savedSelectionsRef.current[tabId];
      let range: Range | null = null;

      if (saved) {
        range = deserializeRange(saved, editorRef.current);
      }

      if (!range && fallbackToEnd) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }

      if (!range) {
        return false;
      }

      selection.removeAllRanges();
      selection.addRange(range);

      const updated = serializeRange(range, editorRef.current);
      if (updated) {
        savedSelectionsRef.current[tabId] = updated;
      }
      return true;
    },
    []
  );

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!editorRef.current || !activeTabId) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!isNodeWithin(range.commonAncestorContainer, editorRef.current)) return;

      const serialized = serializeRange(range, editorRef.current);
      if (serialized) {
        savedSelectionsRef.current[activeTabId] = serialized;
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [activeTabId]);

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
        // Reattach click handlers for image links
        attachImageLinkHandlers();
        // Reset link count and renumber image links when loading tab content
        const links = editorRef.current.querySelectorAll('a.notepad-image-link');
        previousLinkCountRef.current = links.length;
        setTimeout(() => renumberImageLinks(), 0);
        requestAnimationFrame(() => {
          if (editorRef.current && document.activeElement === editorRef.current) {
            restoreSelection(activeTabId, true);
          }
        });
      } else {
        // Tab not found yet - might be a race condition, reset the flag and try again
        isSwitchingTabRef.current = false;
      }
    }
    
    // Scroll active tab into view if it's not visible
    if (activeTabRef.current && tabContainerRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId, tabs, restoreSelection]);

  // Attach click handlers to image links so they open properly
  const attachImageLinkHandlers = () => {
    if (!editorRef.current) return;
    const links = editorRef.current.querySelectorAll<HTMLAnchorElement>('a.notepad-image-link');
    links.forEach(link => {
      // Remove existing handlers by cloning
      const newLink = link.cloneNode(true) as HTMLAnchorElement;
      link.parentNode?.replaceChild(newLink, link);
      
      // Add mousedown handler to allow selection
      newLink.addEventListener('mousedown', (e) => {
        // Allow normal text selection/deletion behavior
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          return; // Allow selection with modifier keys
        }
      });
      
      // Add click handler that opens the link (only if not selecting)
      newLink.addEventListener('click', (e) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length === 0) {
          e.preventDefault();
          e.stopPropagation();
          if (newLink.href) {
            window.open(newLink.href, '_blank', 'noopener,noreferrer');
          }
        }
      });
    });
  };

  // Get the next image number for the current tab
  const getNextImageNumber = (): number => {
    if (!editorRef.current) return 1;
    const links = editorRef.current.querySelectorAll('a.notepad-image-link');
    const numbers: number[] = [];
    links.forEach(link => {
      const text = link.textContent || '';
      const match = text.match(/\[Image #(\d+)\]/);
      if (match) {
        numbers.push(parseInt(match[1], 10));
      }
    });
    if (numbers.length === 0) return 1;
    return Math.max(...numbers) + 1;
  };

  // Renumber image links in the current tab
  const renumberImageLinks = (preserveSelection = false) => {
    if (!editorRef.current || !activeTabId || isRenumberingRef.current) return;
    
    const links = editorRef.current.querySelectorAll<HTMLAnchorElement>('a.notepad-image-link');
    const currentLinkCount = links.length;
    
    // Only renumber if the number of links changed
    if (currentLinkCount === previousLinkCountRef.current && currentLinkCount > 0) {
      // Still check if numbers are correct
      let needsRenumbering = false;
      let counter = 1;
      links.forEach(link => {
        const expectedText = `[Image #${counter}]`;
        if (link.textContent !== expectedText) {
          needsRenumbering = true;
        }
        counter++;
      });
      if (!needsRenumbering) return;
    }
    
    previousLinkCountRef.current = currentLinkCount;
    
    // Save selection if needed
    let savedSelection: { start: Node | null; startOffset: number; end: Node | null; endOffset: number } | null = null;
    if (preserveSelection) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        savedSelection = {
          start: range.startContainer,
          startOffset: range.startOffset,
          end: range.endContainer,
          endOffset: range.endOffset,
        };
      }
    }
    
    isRenumberingRef.current = true;
    let counter = 1;
    let changed = false;
    links.forEach(link => {
      const expectedText = `[Image #${counter}]`;
      if (link.textContent !== expectedText) {
        link.textContent = expectedText;
        changed = true;
      }
      counter++;
    });
    
    // Restore selection if we saved it
    if (preserveSelection && savedSelection && window.getSelection()) {
      try {
        const selection = window.getSelection()!;
        const range = document.createRange();
        if (savedSelection.start && savedSelection.end) {
          range.setStart(savedSelection.start, savedSelection.startOffset);
          range.setEnd(savedSelection.end, savedSelection.endOffset);
          selection.removeAllRanges();
          selection.addRange(range);
          saveCurrentSelection();
        }
      } catch (e) {
        // Selection might be invalid, ignore
      }
    }
    
    isRenumberingRef.current = false;
    
    // Only save if something changed
    if (changed) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, content: newContent } : tab
      ));
    }
  };

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
  const isRenumberingRef = useRef(false);
  const previousLinkCountRef = useRef(0);

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
    saveCurrentSelection();
    // Save current tab content before creating new tab
    if (activeTabId && editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      setTabs(prevTabs => {
        // Check tab limit
        if (prevTabs.length >= MAX_TABS) {
          return prevTabs;
        }
        return prevTabs.map(tab =>
          tab.id === activeTabId ? { ...tab, content: currentContent } : tab
        );
      });
    }
    
    // Create new tab
    const newTabId = Date.now().toString();
    setTabs(prevTabs => {
      // Check tab limit
      if (prevTabs.length >= MAX_TABS) {
        return prevTabs;
      }
      
      const newTab: NotepadTab = {
        id: newTabId,
        name: `Notepad ${prevTabs.length + 1}`,
        content: '',
      };
      
      // Set pending active tab ID - will be activated once tab exists in array
      setPendingActiveTabId(newTabId);
      
      return [...prevTabs, newTab];
    });
  };

  // Activate pending tab once it exists in the tabs array
  useEffect(() => {
    if (pendingActiveTabId && tabs.some(tab => tab.id === pendingActiveTabId)) {
      isSwitchingTabRef.current = true;
      setActiveTabId(pendingActiveTabId);
      setPendingActiveTabId(null);
    }
  }, [pendingActiveTabId, tabs]);

  const switchTab = (tabId: string) => {
    if (tabId === activeTabId) return;
    saveCurrentSelection();
    
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
    saveCurrentSelection();
    delete savedSelectionsRef.current[tabId];
    
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


  const handleInput = () => {
    if (editorRef.current && activeTabId && !isRenumberingRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      // Update the active tab's content using functional update
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, content: newContent } : tab
      ));
      
      // Check if link count changed
      const links = editorRef.current.querySelectorAll('a.notepad-image-link');
      const currentLinkCount = links.length;
      
      // Only renumber if link count changed or on debounce
      if (currentLinkCount !== previousLinkCountRef.current) {
        // Use requestAnimationFrame to preserve cursor position
        requestAnimationFrame(() => {
          renumberImageLinks(true);
        });
      }
    }
    saveCurrentSelection();
  };

  // Helper function to check if text is a URL
  const isURL = (text: string): boolean => {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      // Try with http:// prefix
      try {
        const url = new URL('http://' + text);
        return url.hostname.length > 0;
      } catch {
        return false;
      }
    }
  };

  // Helper function to extract domain from URL
  const getDomainFromURL = (urlString: string): string => {
    try {
      let url: URL;
      try {
        url = new URL(urlString);
      } catch {
        url = new URL('http://' + urlString);
      }
      return url.hostname.replace(/^www\./, ''); // Remove www. prefix
    } catch {
      return 'link';
    }
  };

  // Insert timestamp at cursor position
  const insertTimestamp = useCallback(() => {
    if (!editorRef.current) return;
    
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = String(hours).padStart(2, '0');
    
    const timestamp = ` ~ ${month}/${day} ${hoursStr}:${minutes} ${ampm} ~ `;
    
    // Insert at cursor position
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
      const textNode = document.createTextNode(timestamp);
      insertRange.insertNode(textNode);
      insertRange.setStartAfter(textNode);
      insertRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(insertRange);
    } else {
      // Insert at the end of editor content
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false); // Collapse to end
      const textNode = document.createTextNode(timestamp);
      range.insertNode(textNode);
      
      // Set cursor after the timestamp
      range.setStartAfter(textNode);
      range.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    handleInput();
    saveCurrentSelection();
    if (activeTabId) {
      requestAnimationFrame(() => {
        restoreSelection(activeTabId, false);
      });
    }
  }, [handleInput, saveCurrentSelection]);

  const insertURLLink = (urlString: string) => {
    if (!editorRef.current) return;
    
    // Normalize URL (add http:// if missing)
    let normalizedURL = urlString.trim();
    if (!normalizedURL.startsWith('http://') && !normalizedURL.startsWith('https://')) {
      normalizedURL = 'https://' + normalizedURL;
    }
    
    const domain = getDomainFromURL(normalizedURL);
    const displayText = `[${domain}]`;
    
    // Create link element
    const link = document.createElement('a');
    link.href = normalizedURL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = displayText;
    link.className = 'notepad-url-link';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    
    // Add click handler to open link (only on actual click, not on selection)
    link.addEventListener('mousedown', (e) => {
      // Allow normal text selection/deletion behavior
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        return; // Allow selection with modifier keys
      }
    });
    
    link.addEventListener('click', (e) => {
      // Only prevent default if it's a simple click (not part of selection)
      const selection = window.getSelection();
      if (selection && selection.toString().length === 0) {
        e.preventDefault();
        e.stopPropagation();
        window.open(normalizedURL, '_blank', 'noopener,noreferrer');
      }
    });
    
    // Insert at cursor position
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
      insertRange.insertNode(link);
      
      // Find or create a text node after the link for proper cursor positioning
      let nextNode = link.nextSibling;
      let cursorTextNode: Text | null = null;
      
      if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
        // Use existing text node
        cursorTextNode = nextNode as Text;
      } else {
        // Create a space text node for cursor positioning (will be replaced when user types)
        cursorTextNode = document.createTextNode(' ');
        if (link.parentNode) {
          link.parentNode.insertBefore(cursorTextNode, nextNode);
        }
      }
      
      // Set cursor at the start of the text node after the link
      const range = document.createRange();
      range.setStart(cursorTextNode, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Insert at the end of editor content
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false); // Collapse to end
      range.insertNode(link);
      
      // Ensure there's a text node after the link
      const textNode = document.createTextNode(' '); // Space for cursor positioning
      if (link.parentNode) {
        link.parentNode.insertBefore(textNode, link.nextSibling);
      }
      
      // Set cursor in the text node after the link
      const cursorRange = document.createRange();
      cursorRange.setStart(textNode, 0);
      cursorRange.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(cursorRange);
      }
    }
    
    handleInput();
    
    // Wait for DOM updates (like renumbering) to complete, then ensure cursor is visually correct
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!editorRef.current) return;
        editorRef.current.focus(); // Ensure editor is focused for visual caret
        
        const currentSelection = window.getSelection();
        if (currentSelection && currentSelection.rangeCount > 0) {
          const range = currentSelection.getRangeAt(0);
          if (editorRef.current.contains(range.commonAncestorContainer)) {
            // Find the link and ensure cursor is in the text node after it
            const linkNode = link;
            let nextNode = linkNode.nextSibling;
            let cursorTextNode: Text | null = null;
            
            if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
              // Use existing text node
              cursorTextNode = nextNode as Text;
            } else {
              // Create text node if it doesn't exist
              cursorTextNode = document.createTextNode(' ');
              if (linkNode.parentNode) {
                linkNode.parentNode.insertBefore(cursorTextNode, nextNode);
              }
            }
            
            if (cursorTextNode) {
              const newRange = document.createRange();
              newRange.setStart(cursorTextNode, 0);
              newRange.collapse(true);
              currentSelection.removeAllRanges();
              currentSelection.addRange(newRange);
              
              // Trigger a reflow to ensure browser updates visual caret
              void editorRef.current.offsetHeight;
              
              saveCurrentSelection();
            }
          }
        }
      });
    });
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
          insertImageLink(blob);
          return;
        }
      }
    }
    
    // Check if text is a URL
    const text = clipboardData.getData('text/plain').trim();
    if (text && isURL(text)) {
      insertURLLink(text);
      return;
    }
    
    // Otherwise, paste text as-is
    document.execCommand('insertText', false, text);
    saveCurrentSelection();
    if (activeTabId) {
      requestAnimationFrame(() => {
        restoreSelection(activeTabId, false);
      });
    }
  };

  const insertImageLink = (file: File) => {
    if (!editorRef.current) return;
    
    // Focus the editor first
    editorRef.current.focus();
    
    // Create blob URL
    const blobUrl = URL.createObjectURL(file);
    const imageNumber = getNextImageNumber();
    
    // Create link element
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `[Image #${imageNumber}]`;
    link.className = 'notepad-image-link';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    
    // Add click handler to open link (only on actual click, not on selection)
    link.addEventListener('mousedown', (e) => {
      // Allow normal text selection/deletion behavior
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        return; // Allow selection with modifier keys
      }
    });
    
    link.addEventListener('click', (e) => {
      // Only prevent default if it's a simple click (not part of selection)
      const selection = window.getSelection();
      if (selection && selection.toString().length === 0) {
        e.preventDefault();
        e.stopPropagation();
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }
    });
    
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
      insertRange.insertNode(link);
      
      // Find or create a text node after the link for proper cursor positioning
      let nextNode = link.nextSibling;
      let cursorTextNode: Text | null = null;
      
      if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
        // Use existing text node
        cursorTextNode = nextNode as Text;
      } else {
        // Create a space text node for cursor positioning (will be replaced when user types)
        cursorTextNode = document.createTextNode(' ');
        if (link.parentNode) {
          link.parentNode.insertBefore(cursorTextNode, nextNode);
        }
      }
      
      // Set cursor at the start of the text node after the link
      const range = document.createRange();
      range.setStart(cursorTextNode, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Insert at the end of editor content
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false); // Collapse to end
      range.insertNode(link);
      
      // Ensure there's a text node after the link
      const textNode = document.createTextNode(' '); // Space for cursor positioning
      if (link.parentNode) {
        link.parentNode.insertBefore(textNode, link.nextSibling);
      }
      
      // Set cursor in the text node after the link
      const cursorRange = document.createRange();
      cursorRange.setStart(textNode, 0);
      cursorRange.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(cursorRange);
      }
    }
    
    // Update link count and trigger renumbering
    const links = editorRef.current.querySelectorAll('a.notepad-image-link');
    previousLinkCountRef.current = links.length;
    handleInput();
    
    // Wait for DOM updates (like renumbering) to complete, then ensure cursor is visually correct
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!editorRef.current) return;
        editorRef.current.focus(); // Ensure editor is focused for visual caret
        
        const currentSelection = window.getSelection();
        if (currentSelection && currentSelection.rangeCount > 0) {
          const range = currentSelection.getRangeAt(0);
          if (editorRef.current.contains(range.commonAncestorContainer)) {
            // Find the link and ensure cursor is in the text node after it
            const linkNode = link;
            let nextNode = linkNode.nextSibling;
            let cursorTextNode: Text | null = null;
            
            if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
              // Use existing text node
              cursorTextNode = nextNode as Text;
            } else {
              // Create text node if it doesn't exist
              cursorTextNode = document.createTextNode(' ');
              if (linkNode.parentNode) {
                linkNode.parentNode.insertBefore(cursorTextNode, nextNode);
              }
            }
            
            if (cursorTextNode) {
              const newRange = document.createRange();
              newRange.setStart(cursorTextNode, 0);
              newRange.collapse(true);
              currentSelection.removeAllRanges();
              currentSelection.addRange(newRange);
              
              // Trigger a reflow to ensure browser updates visual caret
              void editorRef.current.offsetHeight;
              
              saveCurrentSelection();
            }
          }
        }
      });
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      insertImageLink(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper functions for keyboard shortcuts
  const focusEditor = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (activeTabId) {
      requestAnimationFrame(() => {
        restoreSelection(activeTabId, true);
      });
    }
  }, [activeTabId, restoreSelection]);

  const handleNewTab = useCallback(() => {
    createTab();
  }, []); // createTab uses state setters which are stable

  const handleCloseTab = useCallback(() => {
    if (activeTabId) {
      // Create a synthetic event for deleteTab
      const syntheticEvent = {
        stopPropagation: () => {},
      } as React.MouseEvent;
      deleteTab(activeTabId, syntheticEvent);
    }
  }, [activeTabId]); // deleteTab uses state setters which are stable

  const handleRenameTab = useCallback(() => {
    if (activeTabId) {
      const syntheticEvent = {
        stopPropagation: () => {},
      } as React.MouseEvent;
      startRenameTab(activeTabId, syntheticEvent);
    }
  }, [activeTabId]); // startRenameTab uses state setters which are stable

  const handleAddImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const cycleTabForward = useCallback(() => {
    if (tabs.length === 0) return;
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    switchTab(tabs[nextIndex].id);
  }, [tabs, activeTabId]); // switchTab uses state setters which are stable

  const cycleTabBackward = useCallback(() => {
    if (tabs.length === 0) return;
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    switchTab(tabs[prevIndex].id);
  }, [tabs, activeTabId]); // switchTab uses state setters which are stable

  const switchToTabByNumber = useCallback((tabNumber: number) => {
    if (tabNumber >= 1 && tabNumber <= tabs.length && tabNumber <= 9) {
      switchTab(tabs[tabNumber - 1].id);
    }
  }, [tabs]); // switchTab uses state setters which are stable

  // Widget keyboard shortcuts - only active when widget is focused
  const shortcuts = useMemo(() => ({
    'Enter': (_e: KeyboardEvent) => {
      // Only focus editor if not already editing text in an input/textarea
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input editing
      }
      focusEditor();
    },
  }), [focusEditor]);

  // Handle Ctrl+key combinations separately (useWidgetKeyboardShortcuts doesn't handle modifiers well)
  useEffect(() => {
    if (!isFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Alt+Arrow (macOS intercepts Ctrl+Arrow at system level)
      // On Mac, Control+Arrow is intercepted by macOS, but Control+Alt+Arrow works
      const isCtrlPressed = e.ctrlKey && !e.metaKey; // Ctrl must be pressed, Meta must NOT be pressed
      const isAltPressed = e.altKey; // Alt/Option must also be pressed
      
      if (isCtrlPressed && isAltPressed) {
        const isArrowRight = e.key === 'ArrowRight' || e.code === 'ArrowRight';
        const isArrowLeft = e.key === 'ArrowLeft' || e.code === 'ArrowLeft';
        
        if (isArrowRight || isArrowLeft) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          if (isArrowRight) {
            cycleTabForward();
          } else {
            cycleTabBackward();
          }
          return;
        }
      }

      // Only handle Ctrl combinations (not Cmd/Meta) - use Ctrl on both Mac and Windows
      // Check: Ctrl must be pressed AND Meta/Cmd must NOT be pressed
      if (!e.ctrlKey || e.metaKey) return;

      // Don't interfere if editing text in inputs/textareas (but allow in contentEditable editor)
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        // Don't interfere with normal input editing
        return;
      }

      const key = e.key.toLowerCase();
      switch (key) {
        case 't':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // Prevent other handlers from running
          handleNewTab();
          break;
        case 'w':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // Prevent other handlers from running
          handleCloseTab();
          break;
        case 'r':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleRenameTab();
          break;
        case 'i':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleAddImage();
          break;
        case 's':
          // Only handle Ctrl+S when editing in the contentEditable editor
          if (activeElement && activeElement === editorRef.current && editorRef.current?.isContentEditable) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            insertTimestamp();
          }
          break;
        default:
          // Check for Ctrl+1-9
          const numKey = parseInt(e.key);
          if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            switchToTabByNumber(numKey);
          }
          break;
      }
    };

    // Use capture phase with highest priority to catch events before browser handles them
    // Only attach to document to avoid duplicate events (window and document both fire)
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true } as EventListenerOptions);
    };
  }, [isFocused, handleNewTab, handleCloseTab, handleRenameTab, handleAddImage, cycleTabForward, cycleTabBackward, switchToTabByNumber, insertTimestamp]);

  useWidgetKeyboardShortcuts(isFocused ?? false, shortcuts);

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
            onKeyDown={(e) => {
              // Handle Ctrl+Alt+Arrow keys for tab cycling (macOS intercepts Ctrl+Arrow at system level)
              const isCtrlPressed = e.ctrlKey && !e.metaKey;
              const isAltPressed = e.altKey;
              
              if (isCtrlPressed && isAltPressed) {
                const isArrowRight = e.key === 'ArrowRight' || e.code === 'ArrowRight';
                const isArrowLeft = e.key === 'ArrowLeft' || e.code === 'ArrowLeft';
                
                if (isArrowRight) {
                  e.preventDefault();
                  e.stopPropagation();
                  cycleTabForward();
                } else if (isArrowLeft) {
                  e.preventDefault();
                  e.stopPropagation();
                  cycleTabBackward();
                }
              }
            }}
            onClick={(e) => {
              // Allow links to be clicked (only if not selecting text)
              const target = e.target as HTMLElement;
              if (target.tagName === 'A' && target.classList.contains('notepad-image-link')) {
                const selection = window.getSelection();
                if (selection && selection.toString().length === 0) {
                  e.preventDefault();
                  const link = target as HTMLAnchorElement;
                  if (link.href) {
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                  }
                }
              }
            }}
            className="h-full w-full bg-black/10 border border-white/20 rounded-sm p-3 font-mono text-sm focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-all duration-200 overflow-y-auto overflow-x-hidden auto-hide-scrollbar"
            style={{
              color: colors.primary,
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
            data-placeholder="Start typing or paste an image..."
          />
        </div>

        {/* Global styles */}
        <style jsx global>{`
          [contenteditable] {
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }

          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: var(--text-placeholder);
            pointer-events: none;
          }

          [contenteditable] a.notepad-image-link {
            color: inherit;
            text-decoration: underline;
            cursor: pointer;
          }

          [contenteditable] a.notepad-image-link:hover {
            opacity: 0.8;
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
