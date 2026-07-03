import type { LeadActionInput, LeadActionRecommendation, LeadActionType } from './types'

function startOfToday() {
  const date = new Date()
  date.setHours(9, 0, 0, 0)
  return date
}

function daysFromNow(days: number) {
  const date = startOfToday()
  date.setDate(date.getDate() + days)
  return date
}

function reasonsText(reasons: unknown) {
  if (!Array.isArray(reasons)) return ''
  return reasons.map(String).filter(Boolean).slice(0, 3).join('; ')
}

function actionLabel(actionType: LeadActionType) {
  return actionType.replace(/_/g, ' ').toLowerCase()
}

export function generateLeadAction(score: LeadActionInput): LeadActionRecommendation {
  const baseReason = reasonsText(score.reasons)
  const evidence = baseReason ? ` Evidence: ${baseReason}.` : ''

  if (score.scoreBucket === 'Elite Deals') {
    return {
      actionType: 'CALL_NOW',
      priority: 100,
      nextActionDate: startOfToday(),
      reason: `Elite score ${score.dealScore} with ${score.strategy} fit. Call immediately.${evidence}`,
    }
  }

  if (score.scoreBucket === 'Strong GO') {
    return {
      actionType: 'MAIL_NOW',
      priority: 80,
      nextActionDate: daysFromNow(1),
      reason: `Strong GO candidate with score ${score.dealScore}. Start direct-mail outreach.${evidence}`,
    }
  }

  if (score.scoreBucket === 'GO With Conditions') {
    return {
      actionType: 'RESEARCH',
      priority: 65,
      nextActionDate: daysFromNow(2),
      reason: `Conditional GO needs underwriting follow-up before offer. Risk score ${score.riskScore}.${evidence}`,
    }
  }

  if (score.decision === 'RENEGOTIATE' || score.scoreBucket === 'Renegotiate') {
    return {
      actionType: 'LOW_OFFER',
      priority: 50,
      nextActionDate: daysFromNow(3),
      reason: `Spread is thin at current assumptions. Prepare a lower offer or seller-finance angle.${evidence}`,
    }
  }

  if (score.decision === 'GO') {
    return {
      actionType: 'TEXT_NOW',
      priority: 70,
      nextActionDate: daysFromNow(1),
      reason: `GO candidate outside top buckets. Use lightweight text outreach before heavier follow-up.${evidence}`,
    }
  }

  return {
    actionType: 'SKIP',
    priority: 5,
    nextActionDate: null,
    reason: `Kill bucket. Skip active outreach unless new information changes the underwriting.${evidence}`,
  }
}

export function describeLeadAction(actionType: LeadActionType) {
  return actionLabel(actionType).replace(/\b\w/g, (letter) => letter.toUpperCase())
}
