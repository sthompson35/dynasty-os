import type { RecommendedSkipTraceChannel, SkipTracePrepInput, SkipTracePrepResult } from './types'

function clamp(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function channelFor(input: SkipTracePrepInput): RecommendedSkipTraceChannel {
  if (input.actionType === 'SKIP' || input.decision === 'KILL') return 'NO_TOUCH'
  if (!input.ownerName || !input.mailingAddress) return 'OWNERSHIP_RESEARCH'
  if (input.actionType === 'MAIL_NOW' && input.mailingAddress) return 'MAILING_ADDRESS_EXPORT'
  if (input.actionType === 'TEXT_NOW' && input.phones.length === 0) return 'MOBILE_APPEND'
  if (input.actionType === 'CALL_NOW' && (input.phones.length === 0 || input.emails.length === 0)) return 'PHONE_EMAIL_SKIP_TRACE'
  if (input.phones.length === 0 && input.emails.length === 0) return 'PHONE_EMAIL_SKIP_TRACE'
  return 'MAILING_ADDRESS_EXPORT'
}

export function buildSkipTraceRow(input: SkipTracePrepInput): SkipTracePrepResult {
  let priority = 20
  if (input.scoreBucket === 'Elite Deals') priority += 28
  else if (input.scoreBucket === 'Strong GO') priority += 20
  else if (input.scoreBucket === 'GO With Conditions') priority += 12
  else if (input.scoreBucket === 'Renegotiate') priority += 6

  if (input.dealScore !== null) priority += Math.min(20, Math.max(0, input.dealScore - 60) * 0.5)
  if (input.absenteeOwner) priority += 12
  if (input.vacancySignal) priority += 10
  if ((input.equitySignal ?? 0) >= 75000) priority += 12
  else if ((input.equitySignal ?? 0) >= 35000) priority += 7
  if (!input.ownerName) priority += 8
  if (!input.mailingAddress) priority += 6
  if (input.phones.length === 0) priority += 7
  if (input.emails.length === 0) priority += 3
  if (input.actionType === 'CALL_NOW') priority += 8
  if (input.actionType === 'MAIL_NOW') priority += 4
  if (input.actionType === 'SKIP') priority = 5

  const recommendedChannel = channelFor(input)

  return {
    priority: clamp(priority),
    recommendedChannel,
    evidence: {
      ownerNamePresent: Boolean(input.ownerName),
      mailingAddressPresent: Boolean(input.mailingAddress),
      phoneCount: input.phones.length,
      emailCount: input.emails.length,
      contactConfidence: input.contactConfidence,
      dealScore: input.dealScore,
      scoreBucket: input.scoreBucket,
      decision: input.decision,
      actionType: input.actionType,
      absenteeOwner: input.absenteeOwner,
      vacancySignal: input.vacancySignal,
      equitySignal: input.equitySignal,
    },
  }
}
