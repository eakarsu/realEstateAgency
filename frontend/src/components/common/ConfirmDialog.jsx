import { ExclamationTriangleIcon, TrashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const variantConfig = {
  danger: { icon: TrashIcon, iconBg: 'bg-red-100', iconColor: 'text-red-600', btnClass: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: ExclamationTriangleIcon, iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', btnClass: 'bg-yellow-600 hover:bg-yellow-700' },
  info: { icon: InformationCircleIcon, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', btnClass: 'bg-blue-600 hover:bg-blue-700' },
};

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', loading = false }) {
  if (!isOpen) return null;

  const config = variantConfig[variant] || variantConfig.danger;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
                <Icon className={`h-6 w-6 ${config.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
            <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              {cancelText}
            </button>
            <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${config.btnClass}`}>
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
