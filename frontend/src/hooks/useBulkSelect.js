import { useState, useCallback } from 'react';

export default function useBulkSelect(items = []) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleOne = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map(item => item.id));
    });
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;
  const selectedCount = selectedIds.size;

  return { selectedIds, toggleOne, toggleAll, clearSelection, isSelected, isAllSelected, isIndeterminate, selectedCount };
}
