import type { Strategy } from '../types'

export const BRRRR: Strategy = {
  id: 'brrrr',
  name: 'BRRRR',
  shortName: 'BRRRR',
  tagline: 'Buy, Rehab, Rent, Refinance, Repeat - recycle the same capital into a growing rental portfolio.',
  flywheelStage: 'The strategy that most directly powers the flywheel\'s "repeat" loop - the refinance step returns capital to the Capital Engine to fund the next acquisition.',
  minBar: 'Cash-out refinance returns enough capital to redeploy while the property still cash flows',
  modules: [
    {
      id: 'brrrr-beginner',
      level: 'beginner',
      audience: 'both',
      title: 'BRRRR Fundamentals',
      summary: 'The five steps of BRRRR, why it\'s different from a simple buy-and-hold, and what makes the "recycle capital" idea actually work.',
      readTime: '7 min',
      sections: [
        {
          heading: 'The five steps',
          body: [
            'Buy a property below market value, usually one needing work. Rehab it to a rentable (or better) standard. Rent it to a qualified tenant at market rate. Refinance the property based on its new, higher appraised value, paying off the original acquisition/rehab loan and pulling cash out. Repeat, using that returned cash as capital for the next deal.',
          ],
        },
        {
          heading: 'How it differs from a simple buy-and-hold',
          body: [
            'A straightforward buy-and-hold purchases a rent-ready property and leaves capital parked in it indefinitely. BRRRR deliberately buys distressed property specifically because the value-add from rehab, combined with buying below market, creates enough of a gap between all-in cost and refinance-appraised value to pull most (sometimes effectively all) of the original capital back out.',
          ],
        },
        {
          heading: 'Why the recycling matters',
          body: [
            'If you can only buy one rental for every $50,000 of capital and never get it back, your portfolio grows as fast as you can save or raise new capital. If that same $50,000 gets returned via refinance and redeployed into the next property, the same capital can fund several properties over time - this is the entire reason BRRRR is central to a capital-flywheel business model rather than a slower buy-and-hold approach.',
          ],
        },
        {
          heading: 'What has to be true for it to work',
          body: [
            'The purchase price plus rehab has to be meaningfully below the property\'s stabilized, rent-ready appraised value - otherwise there\'s no equity gap for a refinance to capture. And the property has to cash flow acceptably at the new, larger post-refinance loan payment - a refinance that pulls out maximum cash but leaves the property barely breaking even (or losing money) every month isn\'t actually a win.',
          ],
        },
      ],
      keyTakeaways: [
        'BRRRR works because rehab plus below-market buying creates an equity gap a refinance can convert back into cash.',
        'The entire point is capital recycling - the same dollars funding multiple properties over time, not just one.',
        'A refinance that maximizes cash-out but breaks the property\'s cash flow isn\'t a win - both have to work together.',
      ],
      terms: ['BRRRR', 'Cash-Out Refinance', 'ARV (After Repair Value)', 'Cash-on-Cash Return'],
    },
    {
      id: 'brrrr-intermediate',
      level: 'intermediate',
      audience: 'both',
      title: 'Underwriting the Refinance Before You Buy',
      summary: 'Why the refinance has to be underwritten on day one, not after the rehab is done, and how seasoning periods affect timing.',
      readTime: '8 min',
      sections: [
        {
          heading: 'Underwrite the exit before the entrance',
          body: [
            'The most common BRRRR mistake is underwriting the purchase and rehab carefully, then treating the refinance as an afterthought that "should just work out." The refinance loan amount - based on the post-rehab appraisal, the lender\'s maximum LTV, and required DSCR - needs to be estimated before you buy, because it determines how much of your capital actually comes back out.',
          ],
        },
        {
          heading: 'Seasoning periods and timing',
          body: [
            'Most lenders won\'t refinance based on a new appraisal until you\'ve owned the property for a minimum period, commonly six to twelve months - the seasoning period. This means BRRRR capital isn\'t returned instantly after rehab completes; it\'s tied up for months even after the property is rent ready, which needs to be planned for in how many deals you can run in parallel with a given amount of capital.',
          ],
        },
        {
          heading: 'Choosing the right lender for the refinance',
          body: [
            'Conventional lenders (Fannie/Freddie-backed) often have the best rates but the strictest seasoning requirements, DTI limits, and caps on the number of financed properties one borrower can hold. Portfolio lenders keep loans on their own books and can offer more flexibility - sometimes shorter seasoning, sometimes lending to an LLC directly - in exchange for a higher rate. Lining up the refinance lender relationship before you need it avoids a scramble when the seasoning clock runs out.',
          ],
        },
        {
          heading: 'Rent-ready timing and its effect on appraisal',
          body: [
            'An appraiser values a rental partly on comparable sales and partly on the fact that it\'s an income-producing, occupied property with a lease in place. Getting to genuinely rent ready - not just "mostly done" - before ordering the refinance appraisal matters: an appraisal ordered too early, before rehab is fully finished, can undervalue the property and shrink the cash pulled out.',
          ],
        },
      ],
      keyTakeaways: [
        'Estimate the refinance loan amount before buying - it determines how much capital actually returns to you, which is the whole point.',
        'Seasoning periods mean capital return is delayed months past rehab completion - plan parallel deal capacity accordingly.',
        'Order the refinance appraisal only once the property is genuinely rent ready, not merely close to finished.',
      ],
      terms: ['Seasoning Period', 'DSCR (Debt Service Coverage Ratio)', 'Portfolio Lender', 'Rent Ready', 'DTI (Debt-to-Income Ratio)'],
    },
    {
      id: 'brrrr-advanced',
      level: 'advanced',
      audience: 'both',
      title: 'Scaling BRRRR and Managing Portfolio-Level Constraints',
      summary: 'What actually limits how many BRRRR deals you can run, and how to structure capital partners into the recycling loop.',
      readTime: '9 min',
      sections: [
        {
          heading: 'DTI becomes the real ceiling, not deal flow',
          body: [
            'Early on, the constraint on BRRRR volume is finding good deals. At scale, for an individual borrower using conventional financing, the real ceiling is often debt-to-income ratio and Fannie/Freddie\'s cap on the number of financed properties one person can hold - not a lack of opportunities. This is exactly why serious BRRRR operators eventually shift toward portfolio lenders, entity-level lending, or bringing in equity capital partners rather than scaling purely on personal conventional credit.',
          ],
        },
        {
          heading: 'Structuring capital partners into the loop',
          body: [
            'A private capital partner can fund the buy-and-rehab phase as a short-term debt position (paid off at refinance, like a hard money loan would be) or as an equity position that stays in the deal long-term for a share of cash flow and appreciation. Debt structures are simpler and let the partner\'s capital recycle into your next deal quickly; equity structures build longer-term alignment but tie the partner\'s capital to that specific property\'s performance.',
          ],
        },
        {
          heading: 'Managing a portfolio, not a series of one-offs',
          body: [
            'At 10+ BRRRR properties, tracking each one\'s stage (rehab in progress, seasoning clock running, refinance submitted, stabilized and cash flowing) by memory breaks down. This is where Dynasty\'s property activity tracking - recording purchase price changes, GIS/enrichment events, and scoring updates per property - becomes less of a nice-to-have and more of the only way to know, at a glance, which properties in a large book need attention this week.',
          ],
        },
        {
          heading: 'When to stop recycling and hold cash-flow-only',
          body: [
            'Not every property should be pushed for maximum cash-out at refinance. Sometimes leaving more equity in a stronger-cash-flowing property (rather than maximizing cash extracted) makes sense - especially if new deal flow has temporarily slowed, or if a more conservative loan-to-value improves the portfolio\'s overall risk profile heading into a softer market.',
          ],
        },
      ],
      keyTakeaways: [
        'At scale, DTI and financed-property caps constrain BRRRR volume more than deal availability does - plan your lending strategy accordingly.',
        'Capital partners can be structured as short-term debt (fast recycling) or long-term equity (deeper alignment) - choose based on what the partner and the deal actually need.',
        'A large BRRRR portfolio needs systematic tracking of each property\'s stage - memory doesn\'t scale past a handful of simultaneous deals.',
      ],
      terms: ['DTI (Debt-to-Income Ratio)', 'Portfolio Lender', 'Capital Stack', 'Preferred Return', 'Deal Score / Underwriting Score'],
    },
  ],
}
