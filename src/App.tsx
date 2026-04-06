import React, { useEffect, useRef, useState } from "react";
import "./App.css";

import { BASE, FIELDS } from "constants/API";
import getCurrencies from "lib/helper/getCurrency";
import { APIResponse } from "types/response.type";
import ImageCard from "components/ImageCard";
import { RoadComponent } from "components/Road";
import useDebounce from "lib/hooks/useDebounce";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<APIResponse[]>([]);
  const [selected, setSelected] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(query);

  useEffect(() => {
    const q = debouncedQuery.trim();

    if (q.length < 2) {
      setResults([]);
      setDropdownOpen(false);
      setError(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetch(`${BASE}/name/${encodeURIComponent(q)}?fields=${FIELDS}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (r.status === 404) return [];
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const sorted = [...data].sort((a, b) =>
          a.name.common.localeCompare(b.name.common),
        );
        setResults(sorted);
        setDropdownOpen(sorted.length > 0);
        setActiveIndex(-1);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  function handleSelect(country: any) {
    setSelected(country);
    setQuery(country.name.common);
    setDropdownOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      listRef.current.children[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex]);

  const currencies = selected ? getCurrencies(selected.currencies) : [];
  const driveSide = selected?.car?.side || "unknown";

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      <header className="flex items-center gap-4 mb-6">
        <div className="text-3xl">🌍</div>
        <div>
          <h1 className="text-2xl font-bold">Country Atlas</h1>
          <p className="text-zinc-400 text-sm">
            Search any country to view key facts
          </p>
        </div>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-zinc-300">
          Type at least 2 characters of a country name to search. Select a
          result to see its official name, currency, flag, coat of arms, and
          driving side.
        </p>
      </div>

      <div className="relative max-w-xl">
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <span className="mr-2 text-zinc-400">{loading ? "⏳" : "🔍"}</span>

          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. France, New Zealand, Brazil…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) {
                setSelected(null);
                setResults([]);
                setDropdownOpen(false);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setDropdownOpen(true)}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-500"
          />

          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelected(null);
                setResults([]);
                setDropdownOpen(false);
                inputRef.current?.focus();
              }}
              className="text-zinc-400 hover:text-white ml-2"
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div className="mt-2 text-sm bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-md">
            Search failed: {error}. Please try again.
          </div>
        )}

        {dropdownOpen && (
          <ul className="absolute z-10 mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            {results.map((c, i) => (
              <li
                key={c.name.official}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={() => handleSelect(c)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                  i === activeIndex ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                }`}
              >
                <img
                  src={c.flags?.png || c.flags?.svg}
                  alt=""
                  className="w-6 h-4 object-cover rounded-sm"
                />
                <span className="font-medium">{c.name.common}</span>
                <span className="text-xs text-zinc-400 ml-auto">
                  {c.name.official}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!loading &&
          debouncedQuery.trim().length >= 2 &&
          results.length === 0 &&
          !error &&
          !dropdownOpen &&
          !selected && (
            <div className="mt-2 text-sm text-zinc-400">
              No countries match "{debouncedQuery}"
            </div>
          )}
      </div>

      {selected && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-3xl">
          <div>
            <div className="text-xs text-zinc-400">Official name</div>
            <h2 className="text-xl font-semibold">{selected.name.official}</h2>
            <div className="text-sm text-zinc-500">{selected.name.common}</div>
          </div>

          <div className="my-4 border-t border-zinc-800" />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-zinc-400 mb-2">Currency</div>
              {currencies.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  {c.symbol && <span className="text-lg">{c.symbol}</span>}
                  <span>{c.name}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs text-zinc-400 mb-2">Drives on the</div>
              <div className="flex items-center gap-3">
                <RoadComponent side={driveSide} />
                <span>
                  {driveSide === "left"
                    ? "Left"
                    : driveSide === "right"
                      ? "Right"
                      : "—"}{" "}
                  side
                </span>
              </div>
            </div>
          </div>

          <div className="my-4 border-t border-zinc-800" />

          <div className="grid grid-cols-2 gap-4">
            <ImageCard
              src={selected.flags?.svg || selected.flags?.png}
              alt={`Flag of ${selected.name.common}`}
              label="Flag"
            />
            <ImageCard
              src={selected.coatOfArms?.svg || selected.coatOfArms?.png}
              alt={`Coat of arms of ${selected.name.common}`}
              label="Coat of arms"
            />
          </div>
        </div>
      )}

      {!selected && !loading && (
        <div className="mt-12 text-center text-zinc-500">
          <div className="text-3xl mb-2">🌐</div>
          <p>Search for a country to get started</p>
        </div>
      )}
    </div>
  );
}

export default App;
