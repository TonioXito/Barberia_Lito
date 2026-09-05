export function TabsBar({ tabs, value, onChange, className = "" }) {
  return (
    <div className={`flex rounded-xl bg-gray-100 p-1 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            value === t.value
              ? "bg-white text-brand-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}