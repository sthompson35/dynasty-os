import { formatCurrency, getTypeLabel, toNumber } from '@/lib/property-utils'
import type { CampaignArtifact, CampaignQueueItemInput, CampaignType } from './types'

function firstContact(item: CampaignQueueItemInput) {
  const ownerIntel = item.property.ownerIntelligenceArtifacts?.[0]
  if (ownerIntel) {
    const phones = Array.isArray(ownerIntel.phones) ? ownerIntel.phones.map(String) : []
    const emails = Array.isArray(ownerIntel.emails) ? ownerIntel.emails.map(String) : []
    if (!ownerIntel.ownerName && !ownerIntel.mailingAddress && phones.length === 0 && emails.length === 0) {
      return fallbackContact(item)
    }
    return {
      contactName: ownerIntel.ownerName,
      contactPhone: phones[0] ?? null,
      contactEmail: emails[0] ?? null,
      company: ownerIntel.ownerType !== 'INDIVIDUAL' ? ownerIntel.ownerName : null,
      mailingAddress: ownerIntel.mailingAddress,
      contactConfidence: ownerIntel.contactConfidence,
    }
  }

  return fallbackContact(item)
}

function fallbackContact(item: CampaignQueueItemInput) {
  const contact = item.property.contactLinks?.find((link) => link.contact)?.contact
  return {
    contactName: contact?.name ?? null,
    contactPhone: contact?.phone ?? null,
    contactEmail: contact?.email ?? null,
    company: contact?.company ?? null,
    mailingAddress: null,
    contactConfidence: contact ? 50 : 0,
  }
}

function propertyLine(item: CampaignQueueItemInput) {
  return `${item.property.address}, ${item.property.city}, ${item.property.state} ${item.property.zip ?? ''}`.trim()
}

function mailMerge(item: CampaignQueueItemInput) {
  const contact = firstContact(item)
  return {
    property_address: item.property.address,
    city: item.property.city,
    state: item.property.state,
    zip: item.property.zip,
    owner_name: contact.contactName,
    owner_company: contact.company,
    mailing_address: contact.mailingAddress,
    property_type: getTypeLabel(item.property.propertyType),
    estimated_value: toNumber(item.property.arv) || toNumber(item.property.currentValue),
    deal_score: item.dealScore.dealScore,
    strategy: item.dealScore.strategy,
  }
}

function callArtifact(item: CampaignQueueItemInput): CampaignArtifact {
  const contact = firstContact(item)
  const address = propertyLine(item)
  return {
    workType: 'Call script + contact sheet',
    headline: `Call owner/contact for ${address}`,
    propertyAddress: address,
    contactName: contact.contactName,
    contactPhone: contact.contactPhone,
    contactEmail: contact.contactEmail,
    instructions: [
      'Confirm decision-maker and property ownership.',
      `Owner intelligence confidence: ${contact.contactConfidence}/100.`,
      'Ask whether they would consider a clean as-is offer.',
      'Capture motivation, timing, price expectation, and occupancy status.',
      'Move qualified conversations into offer research.',
    ],
    script: [
      `Hi, this is Dynasty PropertyOS calling about ${item.property.address}.`,
      'I am reaching out because we are buying in the area and can make clean as-is offers.',
      'Would you consider discussing options if the numbers made sense?',
      'What would need to be true for this to be worth your time?',
    ],
  }
}

function researchArtifact(item: CampaignQueueItemInput): CampaignArtifact {
  const address = propertyLine(item)
  return {
    workType: 'Due diligence checklist',
    headline: `Research underwriting blockers for ${address}`,
    propertyAddress: address,
    ...firstContact(item),
    instructions: [
      'Verify ownership and mailing address.',
      'Check tax delinquency, liens, vacancy, and occupancy.',
      'Review nearby sold comps and rental support.',
      'Confirm repair risk before offer escalation.',
    ],
    checklist: [
      'Owner record verified',
      'Mailing address verified',
      'Tax status checked',
      'Vacancy checked',
      'Comps reviewed',
      'Repair risk noted',
      'Recommended next action selected',
    ],
  }
}

function lowOfferArtifact(item: CampaignQueueItemInput): CampaignArtifact {
  const address = propertyLine(item)
  const value = toNumber(item.property.arv) || toNumber(item.property.currentValue)
  const suggestedOffer = value > 0 ? Math.round(value * 0.55) : null
  return {
    workType: 'Offer worksheet',
    headline: `Prepare low-offer worksheet for ${address}`,
    propertyAddress: address,
    ...firstContact(item),
    instructions: [
      'Do not anchor to asking price without verified ARV and repair risk.',
      'Prepare seller-friendly terms if price spread is thin.',
      'Document all assumptions before sending an offer.',
    ],
    worksheet: {
      estimated_value: value || null,
      suggested_starting_offer: suggestedOffer,
      offer_basis: suggestedOffer ? `${formatCurrency(suggestedOffer)} equals about 55% of estimated value.` : 'Estimate value before offer.',
      score: item.dealScore.dealScore,
      risk_score: item.dealScore.riskScore,
      strategy: item.dealScore.strategy,
    },
  }
}

function mailArtifact(item: CampaignQueueItemInput): CampaignArtifact {
  const address = propertyLine(item)
  const contact = firstContact(item)
  return {
    workType: 'Mail merge batch row',
    headline: `Mail outreach for ${address}`,
    propertyAddress: address,
    ...contact,
    instructions: [
      'Include in next direct-mail export.',
      contact.mailingAddress ? `Mailing address: ${contact.mailingAddress}.` : 'Research mailing address before export.',
      'Use as-is purchase language.',
      'Route responses back into call queue.',
    ],
    mailMerge: mailMerge(item),
  }
}

function textArtifact(item: CampaignQueueItemInput): CampaignArtifact {
  const address = propertyLine(item)
  return {
    workType: 'Text outreach prompt',
    headline: `Text outreach for ${address}`,
    propertyAddress: address,
    ...firstContact(item),
    instructions: [
      'Send only where compliant contact permission exists.',
      'Keep message short and route positive replies to call queue.',
    ],
    script: [
      `Hi, I am reaching out about ${item.property.address}. Would you consider an as-is offer if the numbers made sense?`,
    ],
  }
}

function skipArtifact(item: CampaignQueueItemInput): CampaignArtifact {
  const address = propertyLine(item)
  return {
    workType: 'Archive / no-touch',
    headline: `Archive ${address}`,
    propertyAddress: address,
    ...firstContact(item),
    instructions: [
      'Do not spend outbound budget on this record.',
      'Reopen only if price, ownership, condition, or market data changes.',
    ],
    archiveReason: item.reason,
  }
}

export function generateCampaignArtifact(item: CampaignQueueItemInput): CampaignArtifact {
  const campaignType = item.actionType as CampaignType
  if (campaignType === 'CALL_NOW') return callArtifact(item)
  if (campaignType === 'MAIL_NOW') return mailArtifact(item)
  if (campaignType === 'TEXT_NOW') return textArtifact(item)
  if (campaignType === 'RESEARCH') return researchArtifact(item)
  if (campaignType === 'LOW_OFFER') return lowOfferArtifact(item)
  return skipArtifact(item)
}

export function campaignTypeLabel(campaignType: string) {
  return campaignType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}
