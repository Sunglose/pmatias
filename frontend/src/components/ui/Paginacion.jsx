import Button from "./Button";

export default function Pagination({
  page = 1,
  totalPages = 1,
  onChange,
  disabled = false,
  className = "",
}) {
  if (!totalPages || totalPages < 1) return null;

  // Páginas: primera, última y ±2 alrededor de la actual, con "…"
  const slots = [];
  for (let i = 1; i <= totalPages; i++) {
    const edge = i === 1 || i === totalPages;
    const near = Math.abs(i - page) <= 2;
    if (edge || near) slots.push(i);
    else if (slots[slots.length - 1] !== "...") slots.push("...");
  }

  return (
    <div className={`flex items-center justify-center gap-1 mt-4 mb-4 ${className}`}>
      {slots.map((s, idx) =>
        s === "..." ? (
          <span key={idx} className="px-2 text-gray-500">…</span>
        ) : (
          <Button
            key={s}
            type="button"
            onClick={() => onChange?.(s)}
            disabled={disabled}
            className={`min-w-[32px] h-8 px-2 rounded-lg text-sm
              ${s === page
                ? "bg-[#8F5400] text-white font-semibold"
                : "bg-transparent text-current border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          >
            {s}
          </Button>
        )
      )}
    </div>
  );
}