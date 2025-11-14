export default function Tabs({ value, onChange, options = [], className = "" }) {
  const idx = Math.max(0, options.findIndex(o => o.value === value));
  const count = Math.max(1, options.length);
  const seg = 100 / count;
  const indicatorStyle = {
    left: `${idx * seg + 1}%`,
    width: `calc(${seg}% - 8px)`, // padding de contenedor (p-1 => ~8px)
  };

  return (
    <div className={`relative bg-[#8F5400] dark:bg-gray-800 rounded-full p-1 shadow-inner ${className}`}>
      <div
        className="absolute top-1 bottom-1 rounded-full transition-all duration-300 dark:bg-gray-700"
        style={indicatorStyle}
        aria-hidden="true"
      />
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }} role="tablist">
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value ?? i}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange?.(opt.value)}
              className={[
                "z-10 h-10 rounded-full font-semibold tracking-wide transition-colors duration-150",
                active
                  ? "text-[#8F5400] dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 dark:hover:text-blue-400",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
