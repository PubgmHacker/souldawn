"use client";

interface CollectionFilterProps {
  filters: string[];
  active: string;
  onChange: (filter: string) => void;
}

export default function CollectionFilter({
  filters,
  active,
  onChange,
}: CollectionFilterProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`text-xs font-bold tracking-widest uppercase px-5 py-2 border transition-all duration-300 ${
            active === filter
              ? "border-accent text-accent bg-accent/10"
              : "border-white/10 text-muted hover:border-white/20 hover:text-text"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
