'use client';

import { useState, useEffect } from 'react';
import Widget from './Widget';
import { getFromLocalStorage, saveToLocalStorage } from '@/app/lib/utils';
import { useReactiveColors } from './ColorContext';

const STORAGE_KEY = 'hyperdash-todos';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

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
              <p className="text-sm" style={{ color: colors.secondary }}>
                No todos yet. Add one above!
              </p>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="
                    flex items-center gap-2
                    p-2
                    bg-black/10
                    border border-white/10
                    rounded-sm
                    hover:border-white/30
                    transition-all duration-200
                  "
                  style={{
                    boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="
                      w-4 h-4
                      cursor-pointer
                    "
                    style={{ accentColor: colors.secondary }}
                  />
                  <span
                    className={`
                      flex-1
                      text-sm
                      ${todo.completed ? 'line-through' : ''}
                    `}
                    style={{ color: todo.completed ? colors.muted : colors.primary }}
                  >
                    {todo.text}
                  </span>
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Widget>
  );
}

