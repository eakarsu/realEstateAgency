import { useState } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ConfirmDialog from './ConfirmDialog';

export default function BulkActionBar({ selectedCount, onDelete, onClear, children }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (selectedCount === 0) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 bg-white border-t shadow-lg">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <button onClick={onClear} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <XMarkIcon className="h-4 w-4" /> Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            {children}
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
              >
                <TrashIcon className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Selected Items"
        message={`Are you sure you want to delete ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
        loading={deleting}
      />
    </>
  );
}
