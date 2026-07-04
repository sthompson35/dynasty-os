import type { OfferStatus } from '@/lib/seller-offers/resolve-offer'

export type NegotiationOutcome = {
  dealStatus: string
  offerStatus: OfferStatus
  purchasePrice: number | null
}

export function resolveNegotiation(input: {
  resolution: string | null
  counterAmount: number | null
  offerAmount: number
}): NegotiationOutcome {
  const finalAmount = input.counterAmount ?? input.offerAmount

  switch (input.resolution) {
    case 'ACCEPTED':
      return { dealStatus: 'under_contract', offerStatus: 'ACCEPTED', purchasePrice: finalAmount }
    case 'WALKED_AWAY':
      return { dealStatus: 'dead', offerStatus: 'REJECTED', purchasePrice: null }
    case 'REJECTED':
      return { dealStatus: 'negotiating', offerStatus: 'REJECTED', purchasePrice: null }
    case 'COUNTERED':
    default:
      return { dealStatus: 'negotiating', offerStatus: 'COUNTERED', purchasePrice: null }
  }
}
