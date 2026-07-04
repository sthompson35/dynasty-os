export type OfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'COUNTERED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN'

export function dealStatusForOffer(offerStatus: string, currentDealStatus: string): string {
  if (offerStatus === 'SENT') return currentDealStatus === 'intake' || currentDealStatus === 'pending' ? 'offer_made' : currentDealStatus
  if (offerStatus === 'COUNTERED') return 'negotiating'
  if (offerStatus === 'ACCEPTED') return 'under_contract'
  if (offerStatus === 'REJECTED' || offerStatus === 'WITHDRAWN') return 'dead'
  return currentDealStatus
}
