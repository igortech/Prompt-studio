import React from 'react';
import { useStore, Notification } from '../store';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ToastContainer() {
  const { notifications, removeNotification } = useStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <Toast key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50',
    error: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-md ${bgColors[notification.type]}`}
    >
      {icons[notification.type]}
      <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
        {notification.message}
      </p>
      <button
        onClick={onClose}
        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </motion.div>
  );
}
