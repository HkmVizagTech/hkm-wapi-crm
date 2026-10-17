"use client";
import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown, Search, X } from "lucide-react";
import InfiniteSentinel from "./InfiniteSentinel";
import { EmptyState } from "./ui";

/**
 * Reusable data table with infinite scroll, sticky header, sortable columns, skeleton loading,
 * and a stacked "card" layout on phones (no sideways scrolling, nothing hidden).
 *
 * columns: [{ key, label, render?(row,i), align?, width?, sortable?, sortValue?(row), mono?, primary?, hideLabelOnCard? }]
 *   primary  – the column shown as the card title on phones
 * Server-driven paging:  hasMore / loadingMore / onLoadMore   (rows are whatever you've loaded)
 * Client-side paging:    pass `clientPage` (e.g. 50) — rows are revealed as you scroll
 * Sorting: client-side on loaded rows by default; pass `sort` + `onSort(key,dir)` for server sorting.
 */
export default function DataTable({
  columns, rows = [], rowKey = r => r._id, loading, loadingMore, hasMore, onLoadMore,
  clientPage, onRowClick, empty, toolbar, search, onSearch, searchPlaceholder = "Search…",
  sort, onSort, maxHeight = "calc(var(--vh100) - 225px)", footer, dense, className = "",
}) {
  const [shown, setShown] = useState(clientPage || 0);
  const [localSort, setLocalSort] = useState({ key:null, dir:"asc" });
  const cur = sort || localSort;

  const sorted = useMemo(() => {
    if (sort || !localSort.key) return rows;
    const col = columns.find(c => c.key === localSort.key);
    const val = col?.sortValue || (r => r[localSort.key]);
    const m = localSort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null) return 1; if (y == null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * m;
    });
  }, [rows, localSort, sort, columns]);

  const visible = clientPage ? sorted.slice(0, shown) : sorted;
  const more    = clientPage ? shown < sorted.length : hasMore;
  const loadMore = clientPage ? () => setShown(n => n + clientPage) : onLoadMore;

  const toggleSort = c => {
    if (!c.sortable) return;
    const dir = cur.key === c.key && cur.dir === "asc" ? "desc" : "asc";
    if (onSort) onSort(c.key, dir); else setLocalSort({ key:c.key, dir });
    if (clientPage) setShown(clientPage);
  };

  const cell = (c, r, i) => c.render ? c.render(r, i) : (r[c.key] ?? "—");
  const primary = columns.find(c => c.primary) || columns[0];
  const rest = columns.filter(c => c !== primary);

  return (
    <div className={`dt ${dense ? "dt-dense" : ""} ${className}`}>
      {(toolbar || onSearch) && (
        <div className="dt-toolbar">
          {onSearch && (
            <div className="dt-search">
              <Search size={15}/>
              <input value={search || ""} onChange={e => onSearch(e.target.value)} type="search" name="table-search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder={searchPlaceholder}/>
              {search && <button onClick={() => onSearch("")} aria-label="Clear"><X size={14}/></button>}
            </div>
          )}
          {toolbar}
        </div>
      )}

      {/* ── desktop / tablet table ── */}
      <div className="dt-scroll dt-desktop" style={{ maxHeight }}>
        <table className="dt-table">
          <thead>
            <tr>
              {columns.map(c => {
                const active = cur.key === c.key;
                return (
                  <th key={c.key} style={{ textAlign:c.align || "left", width:c.width }}
                    className={`${c.sortable ? "sortable" : ""} ${active ? "active" : ""} ${c.hideBelow ? "hb-" + c.hideBelow : ""}`}
                    onClick={() => toggleSort(c)}>
                    <span>{c.label}
                      {c.sortable && (active
                        ? (cur.dir === "asc" ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)
                        : <ChevronsUpDown size={12} style={{ opacity:.35 }}/>)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length
              ? Array.from({ length:7 }).map((_, i) => (
                  <tr key={i} className="dt-skel">{columns.map(c => <td key={c.key}><div className="skeleton" style={{ height:14, width:c.align === "right" ? 40 : `${55 + (i * 13) % 35}%` }}/></td>)}</tr>))
              : visible.map((r, i) => (
                  <tr key={rowKey(r, i)} className={onRowClick ? "clickable" : ""} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                    {columns.map(c => (
                      <td key={c.key} style={{ textAlign:c.align || "left" }}
                        className={`${c.mono ? "mono" : ""} ${c.hideBelow ? "hb-" + c.hideBelow : ""}`}>{cell(c, r, i)}</td>
                    ))}
                  </tr>))}
          </tbody>
        </table>
        {!loading && !rows.length && (empty || <EmptyState title="Nothing here yet"/>)}
        {(rows.length > 0) && <InfiniteSentinel onVisible={loadMore} hasMore={more} loading={loadingMore} endLabel={footer}/>}
      </div>

      {/* ── phone: stacked cards ── */}
      <div className="dt-mobile" style={{ maxHeight }}>
        {loading && !rows.length
          ? Array.from({ length:5 }).map((_, i) => <div key={i} className="skeleton" style={{ height:78, marginBottom:10, borderRadius:12 }}/>)
          : visible.map((r, i) => (
              <div key={rowKey(r, i)} className={`dt-card ${onRowClick ? "clickable" : ""}`} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                <div className="dt-card-title">{cell(primary, r, i)}</div>
                <div className="dt-card-grid">
                  {rest.filter(c => !c.hideOnCard).map(c => (
                    <div key={c.key} className="dt-card-field">
                      {!c.hideLabelOnCard && <span>{c.label}</span>}
                      <b className={c.mono ? "mono" : ""}>{cell(c, r, i)}</b>
                    </div>
                  ))}
                </div>
              </div>))}
        {!loading && !rows.length && (empty || <EmptyState title="Nothing here yet"/>)}
        {(rows.length > 0) && <InfiniteSentinel onVisible={loadMore} hasMore={more} loading={loadingMore} endLabel={footer}/>}
      </div>
    </div>
  );
}
