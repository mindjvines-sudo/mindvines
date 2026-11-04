"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/admin/icons";
import type { SearchResult } from "@/app/api/admin/search/route";

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { results: SearchResult[] }) => setResults(data.results ?? []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function goTo(href: string) {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div className="relative w-full max-w-md">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder="Search enquiries, posts, doctors…"
        aria-label="Search the admin"
        role="combobox"
        aria-expanded={isOpen && query.trim().length >= 2}
        aria-controls="admin-search-results"
        className="h-10 w-full rounded-xl border border-transparent bg-slate-100/80 pl-10 pr-14 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:bg-slate-100 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus-visible:outline-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
        ⌘K
      </kbd>

      {isOpen && query.trim().length >= 2 && (
        <div
          id="admin-search-results"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-pop"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">No results for “{query.trim()}”.</p>
          ) : (
            <ul role="listbox">
              {results.map((result) => (
                <li key={`${result.type}-${result.href}`} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={() => goTo(result.href)}
                    onKeyDown={(event) => event.key === "Enter" && goTo(result.href)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 focus:bg-slate-50"
                  >
                    <span className="truncate font-medium text-slate-800">{result.label}</span>
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                      {result.type}
                      {result.sublabel ? ` · ${result.sublabel}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
