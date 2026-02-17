import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  className = "",
  disabled = false,
  size = 'md'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        if (portalRef.current && portalRef.current.contains(target)) {
          return;
        }
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className={`w-full bg-muted/50 dark:bg-muted/20 border border-border focus-within:ring-2 focus-within:ring-primary/20 cursor-pointer flex items-center justify-between transition-all ${size === 'sm' ? 'px-3 py-1.5 rounded-lg text-xs' :
            size === 'lg' ? 'px-6 py-4 rounded-2xl text-base' :
              'px-4 py-3 rounded-xl text-sm'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (disabled) return;
          if (!isOpen) {
            updateCoords();
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
      >
        <span className={`${size === 'sm' ? 'font-medium' : 'font-bold'} ${!selectedOption ? 'text-muted-foreground' : 'text-foreground'} truncate`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} text-muted-foreground shrink-0`} />
      </div>

      {isOpen && createPortal(
        <div
          ref={portalRef}
          className={`fixed z-[99999] bg-card shadow-2xl border border-border overflow-hidden backdrop-blur-md ${size === 'sm' ? 'rounded-lg' : 'rounded-2xl'
            }`}
          style={{
            top: `${coords.top + 4}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
        >
          <div className="p-2 border-b border-border bg-muted/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-background dark:bg-muted/20 rounded-lg text-sm border border-border focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-[min(400px,50vh)] overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                No se encontraron resultados
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`px-4 py-2.5 rounded-xl text-sm cursor-pointer flex items-center justify-between transition-all ${value === option.value
                      ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20'
                      : 'text-foreground hover:bg-accent'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && <Check className="w-4 h-4 shrink-0 transition-transform scale-110" />}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
