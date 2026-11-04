"use client";
import { CircleCheck, CircleX, Info, TriangleExclamationPoint, X } from "lucide-react";
import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn, uid } from "@/lib/utils";
import { Button } from "./ui";

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [open, onClose]);
}

function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEsc(open, onClose);
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
        <div className="absolute inset-0 bg-[#1a140c]/40 backdrop-blur-[3px] animate-fade-in" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          className={cn("relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-lg animate-pop sm:rounded-3xl", w)}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <h2 className="font-display text-xl text-ink">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X /></Button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4 rounded-b-3xl">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export function Sheet({ open, onClose, children, width = "max-w-xl", title }: {
  open: boolean; onClose: () => void; children: ReactNode; width?: string; title?: string;
}) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[55]">
        <div className="absolute inset-0 bg-[#1a140c]/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn("absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-lg animate-slide-in", width)}
        >
          {children}
        </aside>
      </div>
    </Portal>
  );
}

/* ───────── Confirm ───────── */
type ConfirmOpts = { title: string; message?: ReactNode; confirmLabel?: string; danger?: boolean };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

/* ───────── Toast ───────── */
type ToastT = { id: string; tone: "success" | "error" | "info" | "warn"; title: string; description?: string };
const ToastCtx = createContext<(t: Omit<ToastT, "id">) => void>(() => {});
export const useToast = () => {
  const push = useContext(ToastCtx);
  return {
    success: (title: string, description?: string) => push({ tone: "success", title, description }),
    error: (title: string, description?: string) => push({ tone: "error", title, description }),
    info: (title: string, description?: string) => push({ tone: "info", title, description }),
    warn: (title: string, description?: string) => push({ tone: "warn", title, description }),
  };
};

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const [confirm, setConfirm] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  const push = useCallback((t: Omit<ToastT, "id">) => {
    const id = uid();
    setToasts((s) => [...s.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4200);
  }, []);

  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirm({ ...o, resolve })), []);
  const close = (v: boolean) => { confirm?.resolve(v); setConfirm(null); };

  const icons = {
    success: <CircleCheck className="size-5 text-good" />,
    error: <CircleX className="size-5 text-bad" />,
    info: <Info className="size-5 text-info" />,
    warn: <TriangleExclamationPoint className="size-5 text-warn" />,
  };

  return (
    <ToastCtx.Provider value={push}>
      <ConfirmCtx.Provider value={ask}>
        {children}
        <Modal
          open={!!confirm}
          onClose={() => close(false)}
          title={confirm?.title ?? ""}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button variant={confirm?.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
                {confirm?.confirmLabel ?? "Confirm"}
              </Button>
            </>
          }
        >
          <div className="text-sm leading-relaxed text-ink-2">{confirm?.message}</div>
        </Modal>
        <Portal>
          <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg animate-rise">
                <span className="mt-0.5">{icons[t.tone]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{t.title}</div>
                  {t.description && <div className="mt-0.5 text-[13px] text-muted">{t.description}</div>}
                </div>
                <button className="text-faint hover:text-ink" onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))} aria-label="Dismiss">
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Portal>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
