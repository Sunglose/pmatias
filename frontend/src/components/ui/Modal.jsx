import { useEffect } from 'react';
import { IoMdClose } from 'react-icons/io';

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '3xl': 'max-w-3xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60"
      onClick={onClose}
    >
      {/* Contenedor del Modal */}
      <div
        className={`flex flex-col w-full ${sizeClasses[size]} bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden`}
        style={{ maxHeight: "calc(100vh - 40px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* 3. Encabezado Fijo */}
        <header className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-none">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent rounded-lg hover:bg-gray-200 hover:text-gray-900 p-1.5 ms-auto dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <IoMdClose />
          </button>
        </header>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <footer className="flex items-center justify-end p-4 border-t dark:border-gray-700 flex-none gap-2">
            {footer}
          </footer>
        )}
        
      </div>
    </div>
  );
};
