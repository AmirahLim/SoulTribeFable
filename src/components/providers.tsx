"use client";

/**
 * Global client providers:
 *  - React Query (polling-friendly defaults, no aggressive refetching)
 *  - Toast context (warm, non-blocking feedback)
 *  - Viewer context (bootstraps /api/auth/me once, wires the CSRF token)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { api, setCsrfToken } from "@/lib/api/client";

/* ------------------------------------------------------------------ */
/* Viewer (session) context                                            */
/* ------------------------------------------------------------------ */

export interface ViewerUser {
  id: string;
  email: string;
  onboardingStep: number;
  onboardingComplete: boolean;
  isAdmin: boolean;
  status: string;
}

export interface ViewerProfile {
  userId: string;
  displayName: string;
  pronouns: string | null;
  avatarSeed: string;
  bio: string;
  friendshipFeelsLike: string;
  languages: string[];
  neighborhood: string;
  lifeSeason: string;
  visibility: string;
  intent: string;
}

interface MeResponse {
  user: ViewerUser;
  profile: ViewerProfile;
  csrfToken: string;
}

interface ViewerContextValue {
  viewer: MeResponse | null;
  /** True until the first /api/auth/me round-trip settles. */
  loading: boolean;
  refresh: () => Promise<void>;
  /** Called after signin/signup with the fresh payload. */
  setViewer: (me: MeResponse | null) => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function useViewer(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used inside <Providers>");
  return ctx;
}

function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewerState] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const bootstrap = useCallback(async () => {
    try {
      const me = await api.get<MeResponse>("/api/auth/me");
      setCsrfToken(me.csrfToken);
      setViewerState(me);
    } catch {
      setViewerState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const setViewer = useCallback(
    (me: MeResponse | null) => {
      if (me) setCsrfToken(me.csrfToken);
      setViewerState(me);
      setLoading(false);
      if (!me) queryClient.clear(); // sign-out: drop any cached personal data
    },
    [queryClient]
  );

  const value = useMemo(
    () => ({ viewer, loading, refresh: bootstrap, setViewer }),
    [viewer, loading, bootstrap, setViewer]
  );

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

type ToastTone = "success" | "info" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <Providers>");
  return ctx;
}

const TOAST_ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />,
  info: <Info className="h-4 w-4 text-forest-500" aria-hidden />,
  error: <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />,
};

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-pill bg-ink px-4 py-2.5 text-sm text-sand-50 shadow-lift"
              role="status"
            >
              {TOAST_ICONS[t.tone]}
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Root provider                                                       */
/* ------------------------------------------------------------------ */

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ViewerProvider>
        <ToastProvider>{children}</ToastProvider>
      </ViewerProvider>
    </QueryClientProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Notification badge (shared by shells)                               */
/* ------------------------------------------------------------------ */

export function useUnreadNotifications(enabled: boolean): number {
  const { data } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () =>
      api.get<{ notifications: unknown[]; unreadCount: number }>("/api/notifications"),
    refetchInterval: 30_000,
    enabled,
  });
  return data?.unreadCount ?? 0;
}
