export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';
export const CORRELATION_HEADER = 'X-Correlation-ID';
const API_TIMEOUT_MS = 7000;

export type InvestorSnapshot = {
  market: string;
  median_purchase_price: number;
  median_arv: number;
  renovation_budget: number;
  avg_days_to_exit: number;
  target_margin: number;
  estimated_total_cost: number;
  estimated_profit: number;
  estimated_roi: number;
  decision: string;
};

export type InvestorSnapshotResult = {
  snapshot: InvestorSnapshot | null;
  requestCorrelationId: string;
  responseCorrelationId: string | null;
  status: number | null;
};

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `corr-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export type FlipInput = {
  purchase_price: number;
  repair_budget: number;
  arv: number;
  closing_costs?: number;
  holding_costs?: number;
  selling_costs?: number;
  target_profit_margin?: number;
};

export type FlipResult = {
  total_cost: number;
  profit: number;
  roi: number;
  decision: string;
};

export type ApiHealth = {
  ok: boolean;
};

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchApiHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function postFlipAnalysis(input: FlipInput): Promise<FlipResult | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/investor/flip-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    return (await res.json()) as FlipResult;
  } catch {
    return null;
  }
}

// ─── Charlie Deal Intelligence ───────────────────────────────────────────────

export type DealRecord = {
  deal_id: string;
  property_id: string | null;
  seller: string | null;
  asking_price: number | null;
  arv: number | null;
  repairs: number | null;
  status: string;
  [key: string]: unknown;
};

export type IntelligenceAnalysis = {
  acquisition: Record<string, unknown>;
  strategy?: Record<string, unknown>;
  financing: Record<string, unknown>;
  risk: Record<string, unknown>;
  stress_test: Record<string, unknown>;
  exit: Record<string, unknown>;
  kill_switch?: Record<string, unknown>;
  outcome: string;
};

export type IntelligenceResult = {
  deal_id: string;
  outcome: string;
  outcome_label: string;
  analysis: IntelligenceAnalysis;
  reasoning: string[];
  analyzed_at: string;
  persisted: boolean;
};

export type InvestorMatch = {
  investor_id: string;
  investor_name?: string;
  available_capital?: number;
  [key: string]: unknown;
};

export type InvestorMatchesResult = {
  deal_id: string;
  matched_investors: InvestorMatch[];
  all_investors: InvestorMatch[];
};

export type ApproveResult = {
  deal_id: string;
  decision: string;
  approved_by: string;
  notes: string | null;
  sync: { capital: unknown; operations: unknown; disposition: unknown };
  sync_errors: string[];
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function apiCall<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, status: res.status, error: body?.detail ?? `Request failed (${res.status})` };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : 'Network error' };
  }
}

export function fetchDeal(dealId: string): Promise<ApiResult<DealRecord>> {
  return apiCall<DealRecord>(`/api/deal/${dealId}`, { cache: 'no-store' });
}

export function fetchDealIntelligence(dealId: string): Promise<ApiResult<IntelligenceResult>> {
  return apiCall<IntelligenceResult>(`/api/deal/${dealId}/intelligence`, { cache: 'no-store' });
}

export function runDealAnalysis(dealId: string): Promise<ApiResult<IntelligenceResult>> {
  return apiCall<IntelligenceResult>(`/api/deal/${dealId}/analyze`, { method: 'POST', body: JSON.stringify({}) });
}

export function fetchInvestorMatches(dealId: string): Promise<ApiResult<InvestorMatchesResult>> {
  return apiCall<InvestorMatchesResult>(`/api/deal/${dealId}/investor-matches`, { cache: 'no-store' });
}

export function approveDeal(payload: {
  deal_id: string;
  decision: string;
  approved_by: string;
  notes?: string;
  investor_id?: string;
}): Promise<ApiResult<ApproveResult>> {
  return apiCall<ApproveResult>('/api/deal/approve', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchInvestorSnapshot(correlationId?: string): Promise<InvestorSnapshotResult> {
  const requestCorrelationId = correlationId ?? createCorrelationId();

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/investor/market-snapshot`, {
      cache: 'no-store',
      headers: {
        [CORRELATION_HEADER]: requestCorrelationId
      }
    });

    const responseCorrelationId = response.headers.get(CORRELATION_HEADER);
    console.info(
      `[API] /api/investor/market-snapshot status=${response.status} requestCorrelationId=${requestCorrelationId} responseCorrelationId=${responseCorrelationId ?? 'missing'}`
    );

    if (!response.ok) {
      return {
        snapshot: null,
        requestCorrelationId,
        responseCorrelationId,
        status: response.status
      };
    }

    return {
      snapshot: (await response.json()) as InvestorSnapshot,
      requestCorrelationId,
      responseCorrelationId,
      status: response.status
    };
  } catch (error) {
    console.error(
      `[API] /api/investor/market-snapshot failed requestCorrelationId=${requestCorrelationId}`,
      error
    );
    return {
      snapshot: null,
      requestCorrelationId,
      responseCorrelationId: null,
      status: null
    };
  }
}
