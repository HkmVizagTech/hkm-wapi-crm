"use client";
/* App-wide toasts, confirm dialogs, and modal/drawer shells. Mount <FeedbackProvider> once (dashboard layout). */
import { createPortal } from "react-dom";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";
import { Btn } from "./ui";

const Ctx = createContext(null);
export const useFeedback = () => useContext(Ctx) || { toast:()=>{}, confirm:async()=>window.confirm("Are you sure?") };
export const useToast = () => useFeedback().toast;
export const useConfirm = () => useFeedback().confirm;

const ICON = { success:CheckCircle2, error:XCircle, warn:AlertTriangle, info:Info };

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dlg, setDlg] = useState(null);
  const id = useRef(0);

  const toast = useCallback((message, type = "success", ms = 3800) => {
    const t = ++id.current;
    setToasts(p => [...p.slice(-3), { id:t, message, type }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== t)), ms);
  }, []);

  const confirm = useCallback(opts => new Promise(res => {
    const o = typeof opts === "string" ? { message:opts } : opts;
    setDlg({ title:"Are you sure?", confirmLabel:"Confirm", cancelLabel:"Cancel", danger:false, ...o, res });
  }), []);
  const close = v => { dlg?.res(v); setDlg(null); };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map(t => { const I = ICON[t.type] || Info; return (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}>
            <I size={17}/><span>{t.message}</span>
          </div>); })}
      </div>
      {dlg && (
        <Modal open onClose={() => close(false)} title={dlg.title} width={420}
          footer={<>
            <Btn variant="ghost" onClick={() => close(false)}>{dlg.cancelLabel}</Btn>
            <Btn variant={dlg.danger ? "danger" : "primary"} onClick={() => close(true)}>{dlg.confirmLabel}</Btn>
          </>}>
          <p style={{ color:"var(--tx2)", fontSize:14, lineHeight:1.55 }}>{dlg.message}</p>
        </Modal>)}
    </Ctx.Provider>
  );
}

function useEsc(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const k = e => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open, onClose]);
}

/** Centered dialog on desktop, bottom sheet on phones. */
function Portal({ children }) {
  // Render at <body> so position:fixed is always relative to the viewport, never to an animated/transformed page wrapper
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? createPortal(children, document.body) : null;
}

export function Modal({ open, onClose, title, icon: Icon, width = 520, footer, children }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (<Portal>
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth:width }} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-title">{Icon && <Icon size={17} color="var(--brand)"/>}{title}</div>
          <button className="modal-x" onClick={onClose} aria-label="Close"><X size={17}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div></Portal>
  );
}

/** Slide-over panel from the right (full width on phones). */
export function Drawer({ open, onClose, title, icon: Icon, width = 440, children, footer }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (<Portal>
    <div className="overlay drawer-wrap" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <aside className="drawer" style={{ maxWidth:width }} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-title">{Icon && <Icon size={17} color="var(--brand)"/>}{title}</div>
          <button className="modal-x" onClick={onClose} aria-label="Close"><X size={17}/></button>
        </div>
        <div className="modal-body" style={{ flex:1, overflowY:"auto" }}>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </aside>
    </div></Portal>
  );
}
