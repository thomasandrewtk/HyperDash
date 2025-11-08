'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Widget from './Widget';
import { getFromLocalStorage, saveToLocalStorage } from '@/app/lib/utils';
import { useReactiveColors } from './ColorContext';
import { useWidgetKeyboardShortcuts } from '@/app/lib/useWidgetKeyboardShortcuts';

const STORAGE_KEY = 'hyperdash-todos';
const SHOW_COMPLETED_KEY = 'hyperdash-show-completed';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface ConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  colors: {
    primary: string;
    secondary: string;
    button: string;
  };
}

// Delete confirmation dialog component
function DeleteConfirmDialog({ onConfirm, onCancel, colors }: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter and Escape
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (e.key === 'Enter') {
          onConfirm();
        } else {
          onCancel();
        }
      }
    };

    // Use capture phase with highest priority to catch events before other handlers
    // Attach immediately when component mounts
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true } as EventListenerOptions);
      window.removeEventListener('keydown', handleKeyDown, { capture: true } as EventListenerOptions);
    };
  }, [onConfirm, onCancel]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div 
        className="bg-black/90 border border-white/30 rounded-sm p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.secondary }}>
          Delete Todo?
        </h3>
        <p className="text-sm mb-6" style={{ color: colors.primary }}>
          Are you sure you want to delete this todo? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white/10 border border-white/30 rounded-sm hover:bg-white/15 transition-colors"
            style={{ color: colors.button }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-white/10 border border-white/30 rounded-sm hover:bg-white/15 transition-colors"
            style={{ color: colors.button }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Clear completed confirmation dialog component
function ClearConfirmDialog({ onConfirm, onCancel, colors }: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter and Escape
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (e.key === 'Enter') {
          onConfirm();
        } else {
          onCancel();
        }
      }
    };

    // Use capture phase with highest priority to catch events before other handlers
    // Attach immediately when component mounts
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true } as EventListenerOptions);
      window.removeEventListener('keydown', handleKeyDown, { capture: true } as EventListenerOptions);
    };
  }, [onConfirm, onCancel]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div 
        className="bg-black/90 border border-white/30 rounded-sm p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.secondary }}>
          Clear All Completed?
        </h3>
        <p className="text-sm mb-6" style={{ color: colors.primary }}>
          Are you sure you want to delete all completed todos? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white/10 border border-white/30 rounded-sm hover:bg-white/15 transition-colors"
            style={{ color: colors.button }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-white/10 border border-white/30 rounded-sm hover:bg-white/15 transition-colors"
            style={{ color: colors.button }}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TodoWidget({ isFocused }: { isFocused?: boolean }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { colors } = useReactiveColors();

  useEffect(() => {
    const saved = getFromLocalStorage(STORAGE_KEY);
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch (error) {
        console.error('Error parsing todos:', error);
      }
    }
    
    const savedShowCompleted = getFromLocalStorage(SHOW_COMPLETED_KEY);
    if (savedShowCompleted !== null) {
      setShowCompleted(savedShowCompleted === 'true');
    }
  }, []);

  const saveTodos = (newTodos: Todo[]) => {
    setTodos(newTodos);
    saveToLocalStorage(STORAGE_KEY, JSON.stringify(newTodos));
  };

  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        completed: false,
      };
      saveTodos([newTodo, ...todos]); // Add new todos to the top
      setInputValue('');
    }
  };

  const toggleTodo = (id: string) => {
    saveTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const removeTodo = (id: string) => {
    saveTodos(todos.filter(todo => todo.id !== id));
  };

  const clearAllCompleted = () => {
    saveTodos(todos.filter(todo => !todo.completed));
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTodo();
      // Clear selection when adding new todo
      setSelectedTodoId(null);
    } else if (e.key === 'ArrowDown') {
      // Move from input to first todo
      e.preventDefault();
      const displayTodos = getDisplayTodos();
      const activeTodos = displayTodos.filter(todo => !todo.completed);
      const completedTodos = showCompleted ? displayTodos.filter(todo => todo.completed) : [];
      const visibleTodos = [...activeTodos, ...completedTodos];
      if (visibleTodos.length > 0) {
        setSelectedTodoId(visibleTodos[0].id);
        inputRef.current?.blur();
      }
    }
  }, [addTodo, showCompleted, todos, draggedId, dragOverId]);

  const handleDoubleClick = (id: string, text: string) => {
    setEditingId(id);
    setEditValue(text);
    setSelectedTodoId(null); // Clear selection when editing
  };

  const handleEditSave = (id: string) => {
    if (editValue.trim()) {
      saveTodos(
        todos.map(todo =>
          todo.id === id ? { ...todo, text: editValue.trim() } : todo
        )
      );
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // Prevent dragging if this todo is being edited
    if (editingId === id) {
      e.preventDefault();
      return;
    }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    
    // Hide the default drag ghost image by using a transparent canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 1, 1);
      e.dataTransfer.setDragImage(canvas, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Don't clear immediately - let dragOver handle updates
    // This prevents flickering when moving between child elements
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Use dragOverId if available (current hover target), otherwise use targetId (drop target)
    const finalTargetId = dragOverId || targetId;
    
    if (draggedId === finalTargetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedIndex = todos.findIndex(todo => todo.id === draggedId);
    const targetIndex = todos.findIndex(todo => todo.id === finalTargetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newTodos = [...todos];
    const [removed] = newTodos.splice(draggedIndex, 1);
    newTodos.splice(targetIndex, 0, removed);

    saveTodos(newTodos);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    // If we ended drag without dropping, make sure to apply the visual order
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const draggedIndex = todos.findIndex(todo => todo.id === draggedId);
      const targetIndex = todos.findIndex(todo => todo.id === dragOverId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newTodos = [...todos];
        const [removed] = newTodos.splice(draggedIndex, 1);
        newTodos.splice(targetIndex, 0, removed);
        saveTodos(newTodos);
      }
    }
    
    setDraggedId(null);
    setDragOverId(null);
  };

  // Calculate visual order during drag
  const getDisplayTodos = () => {
    if (!draggedId || !dragOverId || draggedId === dragOverId) {
      return todos;
    }

    const draggedIndex = todos.findIndex(todo => todo.id === draggedId);
    const targetIndex = todos.findIndex(todo => todo.id === dragOverId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return todos;
    }

    const newTodos = [...todos];
    const [removed] = newTodos.splice(draggedIndex, 1);
    newTodos.splice(targetIndex, 0, removed);

    return newTodos;
  };

  // Separate todos into active and completed (for rendering)
  const displayTodos = getDisplayTodos();
  const activeTodos = displayTodos.filter(todo => !todo.completed);
  const completedTodos = displayTodos.filter(todo => todo.completed);

  const toggleShowCompleted = () => {
    const newValue = !showCompleted;
    setShowCompleted(newValue);
    saveToLocalStorage(SHOW_COMPLETED_KEY, newValue.toString());
    
    // If hiding completed todos and current selection is completed, focus input
    if (!newValue && selectedTodoId) {
      const todo = todos.find(t => t.id === selectedTodoId);
      if (todo && todo.completed) {
        focusNewTodoInput();
        setSelectedTodoId(null);
      }
    }
  };

  // Helper functions for keyboard shortcuts
  const focusNewTodoInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // When completed todos are hidden and selection is on a completed todo, focus input
  useEffect(() => {
    if (!showCompleted && selectedTodoId) {
      const todo = todos.find(t => t.id === selectedTodoId);
      if (todo && todo.completed) {
        focusNewTodoInput();
        setSelectedTodoId(null);
      }
    }
  }, [showCompleted, selectedTodoId, todos, focusNewTodoInput]);

  const getVisibleTodos = useCallback(() => {
    const displayTodos = getDisplayTodos();
    const activeTodos = displayTodos.filter(todo => !todo.completed);
    const completedTodos = showCompleted ? displayTodos.filter(todo => todo.completed) : [];
    return [...activeTodos, ...completedTodos];
  }, [todos, showCompleted, draggedId, dragOverId]);

  const selectNextTodo = useCallback(() => {
    const visibleTodos = getVisibleTodos();
    if (visibleTodos.length === 0) return;
    
    if (!selectedTodoId) {
      setSelectedTodoId(visibleTodos[0].id);
      return;
    }
    
    const currentIndex = visibleTodos.findIndex(todo => todo.id === selectedTodoId);
    const nextIndex = (currentIndex + 1) % visibleTodos.length;
    setSelectedTodoId(visibleTodos[nextIndex].id);
  }, [selectedTodoId, getVisibleTodos]);

  const selectPreviousTodo = useCallback(() => {
    const visibleTodos = getVisibleTodos();
    if (visibleTodos.length === 0) return;
    
    if (!selectedTodoId) {
      // If nothing is selected, go to last todo
      setSelectedTodoId(visibleTodos[visibleTodos.length - 1].id);
      return;
    }
    
    const currentIndex = visibleTodos.findIndex(todo => todo.id === selectedTodoId);
    
    // If on first todo, focus input instead of cycling
    if (currentIndex === 0) {
      focusNewTodoInput();
      setSelectedTodoId(null);
      return;
    }
    
    const prevIndex = currentIndex - 1;
    setSelectedTodoId(visibleTodos[prevIndex].id);
  }, [selectedTodoId, getVisibleTodos, focusNewTodoInput]);

  const editSelectedTodo = useCallback(() => {
    if (selectedTodoId) {
      const todo = todos.find(t => t.id === selectedTodoId);
      if (todo) {
        setEditingId(selectedTodoId);
        setEditValue(todo.text);
      }
    }
  }, [selectedTodoId, todos]);

  const toggleSelectedTodo = useCallback(() => {
    if (selectedTodoId) {
      const todo = todos.find(t => t.id === selectedTodoId);
      if (!todo) return;
      
      const wasCompleted = todo.completed;
      
      // If completing a todo (not uncompleting), find next incomplete todo before toggle
      if (!wasCompleted) {
        const displayTodos = getDisplayTodos();
        const activeTodos = displayTodos.filter(t => !t.completed);
        const currentIndex = activeTodos.findIndex(t => t.id === selectedTodoId);
        
        // Toggle the todo
        toggleTodo(selectedTodoId);
        
        // Move focus to next incomplete todo
        if (currentIndex !== -1 && currentIndex < activeTodos.length - 1) {
          // Move to next incomplete todo (index stays same since current one moves to completed)
          setSelectedTodoId(activeTodos[currentIndex + 1].id);
        } else {
          // No more incomplete todos, focus input
          focusNewTodoInput();
          setSelectedTodoId(null);
        }
      } else {
        // Uncompleting a todo - just toggle, keep focus on it
        toggleTodo(selectedTodoId);
      }
    }
  }, [selectedTodoId, todos, toggleTodo, focusNewTodoInput]);

  const deleteSelectedTodo = useCallback(() => {
    if (selectedTodoId) {
      setShowDeleteConfirm(selectedTodoId);
    }
  }, [selectedTodoId]);

  const confirmDeleteTodo = useCallback((id: string) => {
    removeTodo(id);
    setShowDeleteConfirm(null);
    setSelectedTodoId(null);
  }, []);

  const confirmClearCompleted = useCallback(() => {
    clearAllCompleted();
    setShowClearConfirm(false);
    setSelectedTodoId(null);
  }, []);

  // Widget keyboard shortcuts - only active when widget is focused
  // Disabled when dialogs are open
  const shortcuts = useMemo(() => {
    const hasDialogOpen = showDeleteConfirm !== null || showClearConfirm;
    
    return {
      'Escape': (_e: KeyboardEvent) => {
        // Close confirmation dialogs first (dialogs handle their own Escape)
        if (showDeleteConfirm) {
          setShowDeleteConfirm(null);
          return;
        }
        if (showClearConfirm) {
          setShowClearConfirm(false);
          return;
        }
        // Clear selection if no dialogs are open
        setSelectedTodoId(null);
      },
      'n': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        focusNewTodoInput();
        setSelectedTodoId(null);
      },
      'N': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        focusNewTodoInput();
        setSelectedTodoId(null);
      },
      'c': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        toggleShowCompleted();
      },
      'C': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        toggleShowCompleted();
      },
      'x': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        const hasCompleted = todos.some(todo => todo.completed);
        if (hasCompleted) {
          setShowClearConfirm(true);
        }
      },
      'X': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        const hasCompleted = todos.some(todo => todo.completed);
        if (hasCompleted) {
          setShowClearConfirm(true);
        }
      },
      'ArrowDown': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        selectNextTodo();
      },
      'ArrowUp': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        selectPreviousTodo();
      },
      'Enter': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        if (selectedTodoId && !editingId) {
          editSelectedTodo();
        } else if (!selectedTodoId) {
          // If no todo is selected, focus the input
          focusNewTodoInput();
        }
      },
      ' ': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        if (selectedTodoId && !editingId) {
          toggleSelectedTodo();
        }
      },
      'Backspace': (_e: KeyboardEvent) => {
        if (hasDialogOpen) return;
        if (selectedTodoId && !editingId) {
          deleteSelectedTodo();
        }
      },
    };
  }, [focusNewTodoInput, toggleShowCompleted, todos, selectNextTodo, selectPreviousTodo, selectedTodoId, editingId, editSelectedTodo, toggleSelectedTodo, deleteSelectedTodo, showDeleteConfirm, showClearConfirm]);

  useWidgetKeyboardShortcuts(isFocused ?? false, shortcuts);

  // Render a single todo item
  const renderTodoItem = (todo: Todo) => {
    const isSelected = selectedTodoId === todo.id && !editingId;
    return (
    <div
      key={todo.id}
      draggable={editingId !== todo.id}
      onDragStart={(e) => handleDragStart(e, todo.id)}
      onDragOver={(e) => handleDragOver(e, todo.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, todo.id)}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        // Only select if clicking on the todo item itself, not on interactive elements
        const target = e.target as HTMLElement;
        if (!editingId && 
            target.tagName !== 'INPUT' && 
            target.tagName !== 'BUTTON' &&
            !target.closest('button') &&
            !target.closest('input')) {
          setSelectedTodoId(todo.id);
        }
      }}
      className={`
        flex items-center gap-2
        p-2
        bg-black/10
        border rounded-sm
        transition-all duration-200
        ${editingId === todo.id ? 'cursor-default' : 'cursor-move'}
        ${isSelected ? 'border-white/50 bg-black/20' : ''}
        ${draggedId === todo.id 
          ? 'border-white/50 shadow-lg' 
          : dragOverId === todo.id && draggedId 
            ? 'border-white/40' 
            : isSelected
              ? 'border-white/50'
              : 'border-white/10 hover:border-white/30'
        }
      `}
      style={{
        boxShadow: draggedId === todo.id 
          ? '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(0, 0, 0, 0.2)' 
          : 'inset 0 1px 1px rgba(0, 0, 0, 0.2)',
      }}
    >
      {editingId !== todo.id && (
        <div
          data-drag-handle
          className="
            cursor-grab
            active:cursor-grabbing
            select-none
            flex items-center
            px-1
          "
          style={{ color: colors.secondary }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
            className="opacity-60"
          >
            <circle cx="2" cy="2" r="1" />
            <circle cx="6" cy="2" r="1" />
            <circle cx="10" cy="2" r="1" />
            <circle cx="2" cy="6" r="1" />
            <circle cx="6" cy="6" r="1" />
            <circle cx="10" cy="6" r="1" />
            <circle cx="2" cy="10" r="1" />
            <circle cx="6" cy="10" r="1" />
            <circle cx="10" cy="10" r="1" />
          </svg>
        </div>
      )}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo.id)}
        className="
          w-4 h-4
          cursor-pointer
        "
        style={{ accentColor: colors.secondary }}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={editingId === todo.id}
      />
      {editingId === todo.id ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => handleEditKeyDown(e, todo.id)}
          onBlur={() => handleEditSave(todo.id)}
          autoFocus
          className="
            flex-1
            bg-black/10
            border border-white/20
            rounded-sm
            px-2 py-1
            font-mono
            text-sm
            focus:outline-none
            focus:border-white/50
            focus:ring-1 focus:ring-white/30
            transition-all duration-200
          "
          style={{
            color: colors.primary,
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
          }}
          data-placeholder-color={colors.placeholder}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          onDoubleClick={() => handleDoubleClick(todo.id, todo.text)}
          className={`
            flex-1
            text-sm
            cursor-text
            select-text
            ${todo.completed ? 'line-through' : ''}
          `}
          style={{ color: todo.completed ? colors.muted : colors.primary }}
        >
          {todo.text}
        </span>
      )}
      {editingId !== todo.id && (
        <button
          onClick={() => removeTodo(todo.id)}
          className="
            text-xs
            px-2 py-1
            hover:bg-white/10
            rounded
            transition-colors
          "
          style={{ color: colors.secondary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.secondary;
          }}
        >
          ×
        </button>
      )}
    </div>
    );
  };

  return (
    <Widget title="Todo List" isFocused={isFocused}>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex gap-2 flex-shrink-0 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={() => setSelectedTodoId(null)}
            onFocus={() => setSelectedTodoId(null)}
            placeholder="Add a todo..."
            className="
              flex-1
              bg-black/10
              border border-white/20
              rounded-sm
              px-3 py-2
              font-mono
              text-sm
              focus:outline-none
              focus:border-white/50
              focus:ring-1 focus:ring-white/30
              transition-all duration-200
              hover:border-white/40
            "
            style={{
              color: colors.primary,
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
            data-placeholder-color={colors.placeholder}
          />
          <button
            onClick={addTodo}
            className="
              px-4 py-2
              bg-white/10
              border border-white/30
              rounded-sm
              hover:bg-white/15
              hover:border-white/50
              hover:shadow-md hover:shadow-white/20
              transition-all duration-200
              font-mono
              text-sm
              active:scale-95
            "
            style={{
              color: colors.button,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            Add
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 auto-hide-scrollbar">
          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="text-sm font-mono opacity-60" style={{ color: colors.secondary }}>
                Your tasks will appear here
              </p>
            ) : (
              <>
                {/* Active todos */}
                {activeTodos.length > 0 && (
                  <div className="space-y-2">
                    {activeTodos.map(renderTodoItem)}
                  </div>
                )}
                
                {/* Completed todos section */}
                {completedTodos.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-2 mt-2 border-t border-white/10">
                      <span 
                        className="text-xs font-mono uppercase tracking-wider"
                        style={{ color: colors.secondary }}
                      >
                        Completed
                      </span>
                      <button
                        onClick={toggleShowCompleted}
                        className="
                          text-xs
                          px-2 py-1
                          hover:bg-white/10
                          rounded
                          transition-colors
                          font-mono
                        "
                        style={{ color: colors.secondary }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = colors.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = colors.secondary;
                        }}
                      >
                        {showCompleted ? 'Hide' : 'Show'}
                      </button>
                      {showCompleted && (
                        <button
                          onClick={clearAllCompleted}
                          className="
                            text-xs
                            px-2 py-1
                            hover:bg-white/10
                            rounded
                            transition-colors
                            font-mono
                          "
                          style={{ color: colors.secondary }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.secondary;
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {showCompleted && (
                      <div className="space-y-2">
                        {completedTodos.map(renderTodoItem)}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Confirmation Dialogs */}
        {showDeleteConfirm && (
          <DeleteConfirmDialog
            onConfirm={() => confirmDeleteTodo(showDeleteConfirm)}
            onCancel={() => setShowDeleteConfirm(null)}
            colors={colors}
          />
        )}
        
        {showClearConfirm && (
          <ClearConfirmDialog
            onConfirm={confirmClearCompleted}
            onCancel={() => setShowClearConfirm(false)}
            colors={colors}
          />
        )}
      </div>
    </Widget>
  );
}

