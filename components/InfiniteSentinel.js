"use client";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

/* Drop at the end of a list: calls onVisible() whenever it scrolls into view (works inside
   any scrolling container). Shows a spinner while loading and a quiet end-of-list note. */
export default function InfiniteSentinel({ onVisible, hasMore, loading, endLabel }) {
  const ref = useRef(null);
  const cb  = useRef(onVisible);
  useEffect(() => { cb.current = onVisible; });
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) cb.current?.(); },
      { rootMargin:"300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading]);
  return (
    <div ref={ref} style={{ textAlign:"center", padding:"14px 0", color:"var(--tx3)", fontSize:12, minHeight:24 }}>
      {loading ? <Loader2 size={16} style={{ animation:"spin .8s linear infinite", color:"var(--brand)" }}/>
        : !hasMore && endLabel ? endLabel : null}
    </div>
  );
}
