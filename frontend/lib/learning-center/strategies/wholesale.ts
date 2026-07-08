import type { Strategy } from '../types'

export const WHOLESALE: Strategy = {
  id: 'wholesale',
  name: 'Wholesale',
  shortName: 'Wholesale',
  tagline: 'Contract a deal below market value, sell the contract to an end buyer - no purchase, no rehab, no holding.',
  flywheelStage: 'The fastest loop in the flywheel: Lead Engine sources the seller, Deal Engine underwrites the spread, and the assignment fee recycles straight back into more lead generation.',
  minBar: 'Minimum $15,000 assignment fee',
  modules: [
    {
      id: 'wholesale-beginner',
      level: 'beginner',
      audience: 'both',
      title: 'Wholesale Fundamentals',
      summary: 'What wholesaling is, why it works, and the core mechanics of assigning a contract for a fee.',
      readTime: '7 min',
      sections: [
        {
          heading: 'What wholesaling is',
          body: [
            'Wholesaling means putting a property under contract at a below-market price, then transferring your right to buy it to another investor - a landlord, a flipper, a builder - for a fee, without ever using your own capital to actually purchase the property.',
            'You\'re not selling the house. You\'re selling the contract: the legal right to buy the house on the terms you already negotiated. The end buyer closes with the original seller (or in a double close, with you), and you\'re paid at that closing.',
          ],
        },
        {
          heading: 'Why it works',
          body: [
            'Sellers with distressed, inherited, or unwanted property often value speed and certainty over maximum price - no listing, no showings, no repairs, no financing contingency that could fall through. Investor buyers, meanwhile, want deal flow below retail price but don\'t always have the time or systems to find it themselves.',
            'Wholesaling exists in the gap between those two: the wholesaler\'s job is finding the motivated seller and negotiating a real discount, then connecting that discount to an investor buyer who will pay for the convenience of a ready-to-close deal.',
          ],
        },
        {
          heading: 'The assignment mechanism',
          body: [
            'The purchase & sale agreement you sign with the seller includes assignable rights (unless the seller or their agent specifically blocks it with a non-assignable clause). You then sign a separate assignment of contract with your end buyer, who pays you an assignment fee - the difference between your contracted price and what they\'re willing to pay - typically due at or before their closing with the original seller.',
          ],
        },
        {
          heading: 'The minimum bar',
          body: [
            'Dynasty underwrites every wholesale opportunity against a $15,000 minimum assignment fee. Deals that don\'t clear that bar after realistic costs (marketing to find the buyer, any earnest money at risk, holding time on the contract) aren\'t worth the operational effort compared to other exit strategies on the same property.',
          ],
        },
      ],
      keyTakeaways: [
        'Wholesaling sells the contract, not the property - you never take ownership or use your own capital to buy.',
        'Margin comes entirely from the gap between your contracted price and what an end buyer will pay for that same contract.',
        'A non-assignable clause forces a double close instead of a simple assignment - know which one you\'re structuring before you sign.',
      ],
      terms: ['Wholesaling', 'Assignment Fee', 'Assignment of Contract', 'Non-Assignable Clause', 'Motivated Seller'],
    },
    {
      id: 'wholesale-intermediate',
      level: 'intermediate',
      audience: 'both',
      title: 'Building a Buyers List and Negotiating the Spread',
      summary: 'How to build reliable cash-buyer demand, price a contract correctly, and move fast enough that the deal doesn\'t die on the vine.',
      readTime: '8 min',
      sections: [
        {
          heading: 'Why the buyers list matters more than the seller lead',
          body: [
            'A signed contract with no buyer is just a countdown clock to a blown deadline. Before actively sourcing deals, a wholesaler needs a working buyers list - cash buyers who\'ve stated their criteria (property type, price range, area, condition tolerance) and have a track record of actually closing, not just asking questions.',
            'Buyers lists are built from local investor meetups, online cash-buyer forms, following up on public records of recent cash purchases, and simply asking every buyer you work with who else they know that buys.',
          ],
        },
        {
          heading: 'Pricing the contract',
          body: [
            'Estimate the property\'s ARV using real comps, then estimate a realistic rehab budget the way an investor buyer would (not optimistically). Your contract price needs enough room below that "investor-adjusted" value for both your assignment fee and the buyer\'s own required margin - if you leave the buyer no spread, they won\'t close, no matter how good your marketing was.',
          ],
        },
        {
          heading: 'Speed as a competitive advantage',
          body: [
            'Wholesale contracts typically carry short inspection/due-diligence periods, which means the property needs to be presented to buyers and moving toward an accepted offer within days, not weeks. Pre-qualifying 3-5 likely buyers before the contract is even signed - based on their known criteria - compresses this timeline dramatically compared to marketing cold after signing.',
          ],
        },
        {
          heading: 'When to double-close instead',
          body: [
            'Double closing costs more (two sets of closing costs) and requires either your own funds or transactional/table funding to briefly own the property, but it keeps your assignment fee private from the seller and works around non-assignable clauses. Use it when the seller\'s agent blocks assignment, or when you don\'t want the seller to see what the end buyer is actually paying.',
          ],
        },
      ],
      keyTakeaways: [
        'A signed contract without a pre-qualified buyer pool is the most common way wholesale deals fall apart.',
        'Price the contract off a realistic investor-adjusted rehab estimate, not your own optimistic one - leave the buyer real margin.',
        'Double closing solves the non-assignable-clause and privacy problems, at the cost of extra closing costs and needing transactional funding.',
      ],
      terms: ['Buyers List', 'Cash Buyer', 'Double Close (Simultaneous Close)', 'Table Funding', 'Comparable Sales (Comps)'],
    },
    {
      id: 'wholesale-advanced',
      level: 'advanced',
      audience: 'both',
      title: 'Scaling Wholesale Into a Consistent Deal Machine',
      summary: 'Turning wholesale from a one-off hustle into a repeatable pipeline, and using it as the flywheel\'s fastest capital-recycling engine.',
      readTime: '9 min',
      sections: [
        {
          heading: 'From deal-by-deal to a pipeline',
          body: [
            'At scale, wholesaling stops being about any single hot lead and becomes about consistent lead volume feeding a consistent, disciplined underwriting filter - the same Deal Score / Underwriting Score logic applied to every incoming lead, so marketing spend only chases leads worth chasing.',
            'This is where a CRM-style intake process (contract status, days under contract, assigned buyer, fee collected) starts to matter more than any individual negotiation skill - the constraint shifts from "can I find a good deal" to "can I process deal flow fast enough not to lose deals to slow follow-up."',
          ],
        },
        {
          heading: 'Segmenting your buyers list by exit strategy',
          body: [
            'Not every buyer wants the same thing. Some are BRRRR investors looking for rentable-condition properties with room to add value; some are flippers looking for the largest possible ARV spread regardless of condition; some are cash landlords who want turnkey or near-turnkey. Tagging your buyers list by which exit strategy they run lets you match a given contract to the right buyer segment immediately instead of blasting everyone and hoping.',
          ],
        },
        {
          heading: 'Wholesale\'s role in the capital flywheel',
          body: [
            'Because wholesale requires no rehab capital and (in a clean assignment) little to no acquisition capital, its cash conversion cycle is the fastest of any strategy in the flywheel - contract to paid assignment fee can be days to a few weeks. That makes it a natural source of quick capital to fund marketing for the next batch of leads, or to top off capital partner returns while slower BRRRR and flip capital is still tied up.',
          ],
        },
        {
          heading: 'Reputation risk and repeat business',
          body: [
            'Because wholesalers work the same local buyer pool repeatedly, a buyer who feels misled about a property\'s condition or an inflated ARV won\'t transact with you again - and will tell other buyers. Long-term wholesale volume depends on buyers trusting your numbers more than it depends on any single deal\'s spread.',
          ],
        },
      ],
      keyTakeaways: [
        'At volume, the bottleneck shifts from finding deals to processing them fast and consistently - treat intake like a pipeline, not a series of one-offs.',
        'Segmenting buyers by exit strategy (BRRRR, flip, turnkey landlord) speeds up matching a contract to the right buyer.',
        'Wholesale\'s fast cash cycle makes it a natural funding source for the rest of the flywheel - but only if buyer trust in your numbers holds up over time.',
      ],
      terms: ['Deal Score / Underwriting Score', 'Exit Strategy', 'Assignment Fee', 'Capital Stack'],
    },
  ],
}
