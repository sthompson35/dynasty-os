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
