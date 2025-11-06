'use client';

import { useState, useEffect } from 'react';
import Widget from './Widget';
import { getFromLocalStorage, saveToLocalStorage } from '@/app/lib/utils';
import { useReactiveColors } from './ColorContext';

const STORAGE_KEY = 'hyperdash-todos';
const SHOW_COMPLETED_KEY = 'hyperdash-show-completed';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
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
      saveTodos([...todos, newTodo]);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  const handleDoubleClick = (id: string, text: string) => {
    setEditingId(id);
    setEditValue(text);
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

  // Separate todos into active and completed
  const displayTodos = getDisplayTodos();
  const activeTodos = displayTodos.filter(todo => !todo.completed);
  const completedTodos = displayTodos.filter(todo => todo.completed);

  const toggleShowCompleted = () => {
    const newValue = !showCompleted;
    setShowCompleted(newValue);
    saveToLocalStorage(SHOW_COMPLETED_KEY, newValue.toString());
  };

  // Render a single todo item
  const renderTodoItem = (todo: Todo) => (
    <div
      key={todo.id}
      draggable={editingId !== todo.id}
      onDragStart={(e) => handleDragStart(e, todo.id)}
      onDragOver={(e) => handleDragOver(e, todo.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, todo.id)}
      onDragEnd={handleDragEnd}
      className={`
        flex items-center gap-2
        p-2
        bg-black/10
        border rounded-sm
        transition-all duration-200
        ${editingId === todo.id ? 'cursor-default' : 'cursor-move'}
        ${draggedId === todo.id 
          ? 'border-white/50 shadow-lg' 
          : dragOverId === todo.id && draggedId 
            ? 'border-white/40' 
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

  return (
    <Widget title="Todo List">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex gap-2 flex-shrink-0 mb-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
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
      </div>
    </Widget>
  );
}

