import {
  DealMetrics,
  PropertyDTO,
  formatCurrency,
  formatNumber,
  formatPercent,
  getPropertyDisplayName,
  getStatusLabel,
  getTypeLabel,
} from '@/lib/property-utils'
import { RehabItemDTO, RehabSummary, getRehabStatusLabel } from '@/lib/rehab-utils'

export type DealReportOptions = {
  title?: string | null
  preparedBy?: string | null
  contactEmail?: string | null
  message?: string | null
  showFinancials?: boolean
  showRehab?: boolean
}

function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatReportDate(): string {
  // Generated server-side at request time; deterministic UTC formatting.
  const now = new Date()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${months[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`
}

function toneColor(tone: string): string {
  if (tone === 'good') return '#1f9d63'
  if (tone === 'bad') return '#c0392b'
  return '#C59D3D'
}

export function buildDealReportHtml(params: {
  property: PropertyDTO
  metrics: DealMetrics
  rehabItems: RehabItemDTO[]
  rehabSummary: RehabSummary
  options?: DealReportOptions
}): string {
  const { property, metrics, rehabItems, rehabSummary } = params
  const options = params?.options ?? {}
  const showFinancials = options?.showFinancials !== false
  const showRehab = options?.showRehab !== false

  const displayName = getPropertyDisplayName(property)
  const reportTitle = (options?.title && options.title.trim()) || `Investment Deal Package`
  const preparedBy = options?.preparedBy && options.preparedBy.trim() ? options.preparedBy.trim() : ''
  const contactEmail = options?.contactEmail && options.contactEmail.trim() ? options.contactEmail.trim() : ''
  const message = options?.message && options.message.trim() ? options.message.trim() : ''

  const photoBlock = property?.photoUrl
    ? `<div class="photo"><img src="${escapeHtml(property.photoUrl)}" alt="Property photo" /></div>`
    : ''

  const factsRows = [
    ['Property type', getTypeLabel(property?.propertyType)],
    ['Status', getStatusLabel(property?.status)],
    ['Bedrooms', property?.bedrooms === null ? '—' : formatNumber(property?.bedrooms)],
    ['Bathrooms', property?.bathrooms === null ? '—' : String(property?.bathrooms)],
    ['Square footage', property?.sqft === null ? '—' : `${formatNumber(property?.sqft)} sqft`],
    ['Year built', property?.yearBuilt === null ? '—' : String(property?.yearBuilt)],
  ]
    .map(
      ([label, value]) =>
        `<tr><td class="fact-label">${escapeHtml(label)}</td><td class="fact-value">${escapeHtml(value)}</td></tr>`,
    )
    .join('')

  const financialsSection = showFinancials
    ? `
    <section class="section">
      <h2 class="section-title">Financial Snapshot</h2>
      <div class="stat-grid">
        <div class="stat"><span class="stat-label">Purchase price</span><span class="stat-value">${formatCurrency(property?.purchasePrice ?? 0)}</span></div>
        <div class="stat"><span class="stat-label">After repair value</span><span class="stat-value">${formatCurrency(property?.arv ?? property?.currentValue ?? 0)}</span></div>
        <div class="stat"><span class="stat-label">Repair costs</span><span class="stat-value">${formatCurrency(property?.repairCosts ?? 0)}</span></div>
        <div class="stat"><span class="stat-label">Holding costs</span><span class="stat-value">${formatCurrency(property?.holdingCosts ?? 0)}</span></div>
        <div class="stat"><span class="stat-label">Closing costs</span><span class="stat-value">${formatCurrency(property?.closingCosts ?? 0)}</span></div>
        <div class="stat"><span class="stat-label">Total investment</span><span class="stat-value">${formatCurrency(metrics?.totalInvestment ?? 0)}</span></div>
      </div>
      <div class="highlight-grid">
        <div class="highlight"><span class="highlight-label">Max Allowable Offer (70% rule)</span><span class="highlight-value">${formatCurrency(metrics?.mao ?? 0)}</span></div>
        <div class="highlight"><span class="highlight-label">Projected profit</span><span class="highlight-value" style="color:${toneColor(metrics?.tone)}">${formatCurrency(metrics?.profit ?? 0)}</span></div>
        <div class="highlight"><span class="highlight-label">Return on investment</span><span class="highlight-value" style="color:${toneColor(metrics?.tone)}">${formatPercent(metrics?.roi ?? 0)}</span></div>
      </div>
      <div class="decision" style="border-color:${toneColor(metrics?.tone)}">
        <span class="decision-dot" style="background:${toneColor(metrics?.tone)}"></span>
        <span>Deal verdict: <strong>${escapeHtml(metrics?.decision)}</strong></span>
      </div>
    </section>`
    : ''

  const rehabRows = (rehabItems ?? [])
    .map(
      (item: RehabItemDTO) =>
        `<tr>
          <td>${escapeHtml(item?.room)}</td>
          <td>${escapeHtml(item?.category)}</td>
          <td>${escapeHtml(item?.description || '—')}</td>
          <td class="num">${formatNumber(item?.quantity)}</td>
          <td class="num">${formatCurrency(item?.unitCost)}</td>
          <td class="num">${escapeHtml(getRehabStatusLabel(item?.status))}</td>
          <td class="num strong">${formatCurrency(item?.lineTotal)}</td>
        </tr>`,
    )
    .join('')

  const roomRows = (rehabSummary?.byRoom ?? [])
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row?.room)}</td><td class="num strong">${formatCurrency(row?.total)}</td></tr>`,
    )
    .join('')

  const rehabSection = showRehab && (rehabItems?.length ?? 0) > 0
    ? `
    <section class="section">
      <h2 class="section-title">Rehab Scope &amp; Budget</h2>
      <table class="data-table">
        <thead>
          <tr><th>Room</th><th>Category</th><th>Description</th><th class="num">Qty</th><th class="num">Unit cost</th><th class="num">Status</th><th class="num">Line total</th></tr>
        </thead>
        <tbody>${rehabRows}</tbody>
        <tfoot>
          <tr><td colspan="6" class="num strong">Total rehab budget</td><td class="num strong">${formatCurrency(rehabSummary?.total ?? 0)}</td></tr>
        </tfoot>
      </table>
      <h3 class="sub-title">Budget by room</h3>
      <table class="data-table compact">
        <tbody>${roomRows}</tbody>
      </table>
    </section>`
    : ''

  const messageBlock = message
    ? `<section class="section"><h2 class="section-title">A note from the sponsor</h2><p class="message">${escapeHtml(message)}</p></section>`
    : ''

  const contactBlock = preparedBy || contactEmail
    ? `<div class="contact-card">
        <div class="contact-title">Prepared by</div>
        ${preparedBy ? `<div class="contact-name">${escapeHtml(preparedBy)}</div>` : ''}
        ${contactEmail ? `<div class="contact-email">${escapeHtml(contactEmail)}</div>` : ''}
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(reportTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #121212; background: #ffffff; font-size: 12px; line-height: 1.5; }
  .page { padding: 0; }
  .hero { background: #0B1F3A; color: #F8F7F2; padding: 32px 36px; }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #C59D3D; }
  .brand .badge { width: 26px; height: 26px; border-radius: 6px; background: #C59D3D; color: #0B1F3A; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; }
  .hero h1 { margin: 18px 0 6px; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
  .hero .subline { font-size: 13px; color: rgba(248,247,242,0.78); }
  .hero .meta { margin-top: 14px; font-size: 11px; color: rgba(248,247,242,0.62); letter-spacing: 0.5px; }
  .body { padding: 28px 36px 12px; }
  .property-head { display: flex; gap: 20px; margin-bottom: 18px; }
  .photo { width: 220px; flex: none; }
  .photo img { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; }
  .facts { flex: 1; }
  .facts table { width: 100%; border-collapse: collapse; }
  .fact-label { color: rgba(18,18,18,0.5); padding: 5px 0; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; width: 45%; }
  .fact-value { padding: 5px 0; font-weight: 700; color: #0B1F3A; }
  .section { margin: 22px 0; }
  .section-title { font-size: 15px; font-weight: 900; color: #0B1F3A; border-bottom: 2px solid #C59D3D; padding-bottom: 6px; margin-bottom: 14px; letter-spacing: -0.2px; }
  .sub-title { font-size: 12px; font-weight: 800; color: #0B1F3A; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 1px; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .stat { background: #F8F7F2; border-radius: 8px; padding: 12px 14px; }
  .stat-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(18,18,18,0.5); font-weight: 700; }
  .stat-value { display: block; font-size: 16px; font-weight: 900; color: #0B1F3A; margin-top: 4px; }
  .highlight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
  .highlight { background: #0B1F3A; border-radius: 8px; padding: 14px; color: #F8F7F2; }
  .highlight-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #C59D3D; font-weight: 700; }
  .highlight-value { display: block; font-size: 19px; font-weight: 900; margin-top: 4px; }
  .decision { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 12px 16px; border: 1.5px solid #C59D3D; border-radius: 8px; font-size: 13px; }
  .decision-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  .data-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .data-table th { background: #0B1F3A; color: #F8F7F2; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .data-table td { padding: 7px 10px; border-bottom: 1px solid #ece9e0; font-size: 11px; }
  .data-table tfoot td { background: #F8F7F2; font-weight: 900; color: #0B1F3A; border-bottom: none; }
  .data-table .num { text-align: right; }
  .data-table .strong { font-weight: 800; color: #0B1F3A; }
  .data-table.compact td { padding: 6px 10px; }
  .message { background: #F8F7F2; border-left: 4px solid #C59D3D; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: rgba(18,18,18,0.82); }
  .footer { margin-top: 26px; padding: 20px 36px; background: #F8F7F2; border-top: 2px solid #C59D3D; display: flex; justify-content: space-between; align-items: flex-end; }
  .contact-card { font-size: 12px; }
  .contact-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(18,18,18,0.5); font-weight: 700; }
  .contact-name { font-weight: 900; color: #0B1F3A; font-size: 14px; margin-top: 3px; }
  .contact-email { color: #0B1F3A; margin-top: 2px; }
  .disclaimer { font-size: 9px; color: rgba(18,18,18,0.45); max-width: 280px; text-align: right; }
</style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <div class="brand"><span class="badge">D</span> Dynasty PropertyOS</div>
      <h1>${escapeHtml(reportTitle)}</h1>
      <div class="subline">${escapeHtml(displayName)}</div>
      <div class="meta">Confidential deal package &middot; Prepared ${formatReportDate()}</div>
    </div>
    <div class="body">
      <div class="property-head">
        ${photoBlock}
        <div class="facts">
          <table><tbody>${factsRows}</tbody></table>
        </div>
      </div>
      ${financialsSection}
      ${rehabSection}
      ${messageBlock}
    </div>
    <div class="footer">
      ${contactBlock || '<div></div>'}
      <div class="disclaimer">This deal package is provided for informational purposes only and does not constitute an offer to sell or a solicitation of an investment. Figures are estimates and subject to change.</div>
    </div>
  </div>
</body>
</html>`
}
