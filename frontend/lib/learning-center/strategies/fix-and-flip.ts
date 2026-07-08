import type { Strategy } from '../types'

export const FIX_AND_FLIP: Strategy = {
  id: 'fix-and-flip',
  name: 'Fix & Flip',
  shortName: 'Fix & Flip',
  tagline: 'Buy distressed, renovate with a disciplined budget, resell at a real margin above every cost you carried.',
  flywheelStage: 'Funded through the Capital Engine, executed through the Operations Engine\'s draw and rehab tracking, and closed out through the Disposition Engine.',
  minBar: 'Minimum 30% investor margin',
  modules: [
    {
      id: 'fix-and-flip-beginner',
      level: 'beginner',
      audience: 'both',
      title: 'Fix & Flip Fundamentals',
      summary: 'The basic economics of a flip, why most of the risk lives in the renovation, and how the 70% rule works as a quick screen.',
      readTime: '7 min',
      sections: [
        {
          heading: 'The basic economics',
          body: [
            'A flip makes money on the spread between what you pay all-in (purchase price plus rehab plus holding plus closing costs, twice) and what the finished property sells for. Unlike wholesaling, you take ownership, use real capital, and carry real risk for the months it takes to renovate and resell.',
            'That also means a flip is the strategy most exposed to two things you can\'t fully control once you\'re in it: how the market moves while you\'re renovating, and how the renovation itself goes.',
          ],
        },
        {
          heading: 'Why the renovation is where risk lives',
          body: [
            'Purchase price is negotiated and known before you close. Rehab cost is estimated - and estimates are wrong more often than buyers like to admit, especially once walls open up and reveal what an inspection couldn\'t see (old wiring, foundation issues, hidden water damage). Every week a rehab runs long is also another week of holding costs eating into margin.',
          ],
        },
        {
          heading: 'The 70% rule as a quick screen',
          body: [
            'A fast gut-check formula: don\'t offer more than 70% of ARV minus estimated repairs. On a property worth $200,000 after repairs needing $30,000 of work, that caps your offer around $110,000. It\'s not a substitute for full underwriting - it doesn\'t account for your specific holding costs or financing - but it catches obviously overpriced deals before you spend time on them.',
          ],
        },
        {
          heading: 'The 30% margin bar',
          body: [
            'Dynasty underwrites flips against a 30% minimum investor margin - meaning the projected profit needs to represent at least 30% of all-in cost, not just a positive number. A flip that "makes money" but only clears 8% margin isn\'t worth the capital, time, and risk compared to other opportunities the same dollars could fund.',
          ],
        },
      ],
      keyTakeaways: [
        'Flip profit is the gap between all-in cost and resale price - and all-in cost includes holding and closing costs, not just purchase and rehab.',
        'The 70% rule is a fast screen, not a real underwrite - always verify with actual numbers before committing.',
        'A positive-but-thin margin flip isn\'t automatically a good deal - Dynasty\'s 30% bar exists because thin margins don\'t survive rehab surprises.',
      ],
      terms: ['Fix and Flip', 'ARV (After Repair Value)', '70% Rule', 'All-In Basis'],
    },
    {
      id: 'fix-and-flip-intermediate',
      level: 'intermediate',
      audience: 'both',
      title: 'Scoping the Rehab and Managing the Draw Schedule',
      summary: 'Building a real rehab budget, choosing cosmetic vs. full-gut, and controlling a project once the contractor is on site.',
      readTime: '9 min',
      sections: [
        {
          heading: 'Writing a real scope of work',
          body: [
            'A vague scope ("update kitchen and baths, new flooring throughout") invites vague, wildly different contractor bids and constant scope arguments mid-project. A real scope of work specifies materials, brands or grades, room by room - it\'s the difference between comparing contractor bids apples-to-apples and comparing five unrelated guesses.',
          ],
        },
        {
          heading: 'Cosmetic vs. full gut',
          body: [
            'A cosmetic rehab (paint, flooring, fixtures, curb appeal) is faster, cheaper, and lower-risk, but caps how much ARV uplift you can capture - it won\'t fix a dated layout or failing systems. A full gut rehab can unlock much larger value gains by reworking layout and replacing every major system, but takes longer, costs more, and carries more of the "surprise" risk that erodes margin.',
            'The right call depends on the property\'s condition relative to its neighborhood ceiling - spending full-gut money on a house in a cosmetic-ceiling area wastes capital you can\'t recover at resale.',
          ],
        },
        {
          heading: 'Draw schedules protect everyone',
          body: [
            'Rather than paying a contractor the full rehab budget upfront, funds release in draws tied to inspected, completed milestones - demo complete, rough-in complete, drywall complete, final walkthrough. This protects the lender\'s (or your own) capital from a contractor who stalls or under-delivers, and gives you natural checkpoints to catch problems before they compound.',
          ],
        },
        {
          heading: 'Managing change orders',
          body: [
            'Unexpected conditions - a rotted subfloor found under old carpet, knob-and-tube wiring behind a wall - are normal, not a sign of a bad contractor. What matters is having a change order process: a documented, priced amendment to scope and budget before the work proceeds, not a surprise on the final invoice.',
          ],
        },
      ],
      keyTakeaways: [
        'A detailed, specific scope of work is what makes contractor bids comparable and prevents mid-project disputes.',
        'Match rehab depth to the neighborhood\'s value ceiling - over-improving wastes capital you won\'t recover at resale.',
        'Draw schedules and a real change-order process are what keep a rehab budget from becoming a rehab guess.',
      ],
      terms: ['Scope of Work (SOW)', 'Cosmetic Rehab', 'Full Gut Rehab', 'Draw Schedule', 'Change Order', 'General Contractor (GC)'],
    },
    {
      id: 'fix-and-flip-advanced',
      level: 'advanced',
      audience: 'both',
      title: 'Protecting Margin Across Market Cycles',
      summary: 'How holding time compounds risk, when to pivot a flip to a rental exit, and running multiple flips without spreading yourself too thin.',
      readTime: '9 min',
      sections: [
        {
          heading: 'Holding time is the hidden margin killer',
          body: [
            'Every extra month a flip sits - whether from rehab delays or a slow resale market - adds another month of loan interest, taxes, insurance, and utilities, while the ARV assumption you underwrote against can quietly go stale if the market shifts. Experienced flippers underwrite holding costs for a realistic timeline plus a buffer, not the optimistic best case.',
          ],
        },
        {
          heading: 'The optionality of pivoting to a rental exit',
          body: [
            'A flip that\'s renovated but facing a soft resale market doesn\'t have to sell at a loss - if the numbers work as a rental (positive cash flow, acceptable cash-on-cash return), converting the exit strategy to hold-and-rent, or even a delayed BRRRR-style refinance, can preserve the deal. This is exactly why Dynasty evaluates every property against all exit strategies up front, rather than locking in "this is a flip" before construction even starts.',
          ],
        },
        {
          heading: 'Running multiple flips without losing control',
          body: [
            'The failure mode at 3-5 simultaneous flips usually isn\'t underwriting - it\'s operational: draws not inspected on time, contractors juggled across sites, decisions made from memory instead of from a system. This is where Dynasty\'s activity tracking and next-best-action logic matter most - not because any single flip needs a computer to run it, but because five flips running in parallel need a system to make sure nothing silently stalls.',
          ],
        },
        {
          heading: 'Recognizing a flip that should be killed early',
          body: [
            'The best time to walk away from a bad flip is during due diligence, not after $20,000 of demo. If a contractor bid comes back well over budget, or an inspection reveals a structural issue that erases the margin, killing the deal (and losing a modest earnest deposit) is almost always cheaper than proceeding on hope.',
          ],
        },
      ],
      keyTakeaways: [
        'Underwrite holding costs for a realistic timeline plus buffer - optimistic timelines are where margin quietly disappears.',
        'A flip isn\'t locked into one exit - evaluating a rental pivot when resale conditions weaken can save a deal.',
        'Running multiple flips at once fails operationally more often than it fails financially - systemize draws and check-ins.',
      ],
      terms: ['Holding Costs (Carrying Costs)', 'Exit Strategy', 'Cash-on-Cash Return', 'Deal Score / Underwriting Score'],
    },
  ],
}
