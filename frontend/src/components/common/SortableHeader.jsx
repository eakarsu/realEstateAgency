import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function SortableHeader({ label, field, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === field;

  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="flex flex-col">
          <ChevronUpIcon className={`h-3 w-3 ${isActive && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
          <ChevronDownIcon className={`h-3 w-3 -mt-1 ${isActive && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
        </span>
      </div>
    </th>
  );
}
