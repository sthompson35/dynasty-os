import type { Strategy } from '../types'

export const DEVELOPMENT: Strategy = {
  id: 'development',
  name: 'Development',
  shortName: 'Development',
  tagline: 'Take raw or underused land through entitlement and construction into finished, sellable or rentable product.',
  flywheelStage: 'The longest-cycle strategy in the flywheel - underwritten by the Deal Engine\'s Land + Build UW tools, funded in stages by the Capital Engine, and the highest-complexity path to Disposition.',
  minBar: 'Feasibility study confirms cost, timeline, and margin clear the bar before entitlement capital is spent',
  modules: [
    {
      id: 'development-beginner',
      level: 'beginner',
      audience: 'both',
      title: 'Development Fundamentals',
      summary: 'Why development is fundamentally different from flipping or land flipping, and the basic stages every project moves through.',
      readTime: '8 min',
      sections: [
        {
          heading: 'What makes development different',
          body: [
            'Every other strategy in this Learning Center works with something that already exists - a house, a parcel - and changes its condition, ownership, or use. Development creates something that didn\'t exist before: new lots, new buildings, new usable space. That creation process is slower, more capital-intensive, and carries more regulatory and market risk than any other strategy here.',
          ],
        },
        {
          heading: 'The basic stages',
          body: [
            'Every development project moves through the same broad arc: acquisition of raw or underused land, entitlement (getting legal approval for what you want to build), horizontal development (grading, roads, utilities - making the land physically buildable), vertical development (actual construction), and finally disposition (sale or lease-up of the finished product).',
            'Each stage has its own risks, its own financing needs, and its own timeline - which is why development projects are commonly measured in years, not months, unlike a flip or a land flip.',
          ],
        },
        {
          heading: 'Why most of the risk is front-loaded',
          body: [
            'Entitlement risk - will the local government actually approve rezoning, a variance, or a site plan - sits at the very front of a project, before most capital has been spent, but it\'s also the stage most outside your direct control. A project can look financially excellent on paper and still die at the entitlement stage if a jurisdiction says no, which is why feasibility work happens before land is even purchased in a well-run development deal, not after.',
          ],
        },
        {
          heading: 'How this connects to land flipping',
          body: [
            'Development and land flipping both start with raw land, but land flipping resells the land as-is, betting entirely on sourcing and valuation. Development instead invests in making the land more valuable by earning the legal right and physical infrastructure to build on it - much higher potential return, much higher capital commitment and timeline.',
          ],
        },
      ],
      keyTakeaways: [
        'Development creates new value through entitlement and construction, rather than capturing an existing gap the way a flip or land flip does.',
        'Projects move through acquisition, entitlement, horizontal development, vertical development, and disposition - each with distinct risk and financing needs.',
        'Entitlement risk sits at the front of the project and is largely outside your control - which is why feasibility work has to happen before land is committed to.',
      ],
      terms: ['Entitlement', 'Horizontal Development', 'Vertical Development', 'Zoning', 'Feasibility Study'],
    },
    {
      id: 'development-intermediate',
      level: 'intermediate',
      audience: 'both',
      title: 'Feasibility, Entitlement, and the Pro Forma',
      summary: 'How to test whether a development idea should proceed before spending real money, and what the entitlement process actually involves.',
      readTime: '9 min',
      sections: [
        {
          heading: 'The feasibility study',
          body: [
            'Before committing to acquire land for development, a feasibility study tests whether the project is physically possible (does the site support the intended use, given topography, soil, and utility access), legally possible (does current zoning allow it, or is rezoning realistic), and financially viable (does a rough pro forma clear an acceptable return once realistic costs and timeline are applied).',
            'A feasibility study that returns "this doesn\'t work" is a success, not a failure - it\'s far cheaper to learn that before buying the land than after.',
          ],
        },
        {
          heading: 'Building the pro forma',
          body: [
            'A development pro forma projects total costs (land, entitlement, horizontal, vertical, soft costs like design and legal, financing costs) against total projected revenue (sale prices or lease-up income), spread across the project\'s realistic timeline. Because timelines run long, a pro forma also needs to account for how costs and market conditions might shift between today and the eventual sale or lease-up - a two-year-old pro forma using two-year-old assumptions is a liability, not a plan.',
          ],
        },
        {
          heading: 'Navigating entitlement',
          body: [
            'Entitlement can mean requesting a rezoning (changing what the land is legally allowed to be used for), a variance (a narrow exception to a specific rule like a setback), or simply site plan approval for a use the zoning already allows. Each involves public hearings, planning staff review, and often community input - timelines can run from a few months to well over a year depending on the jurisdiction and how controversial the request is.',
            'Engaging with planning staff and neighboring stakeholders early, before formally filing, generally produces a smoother approval than filing cold and hoping.',
          ],
        },
        {
          heading: 'Impact fees and other easy-to-miss costs',
          body: [
            'Impact fees, utility connection fees, and other government-charged costs due at permitting can add a meaningful, easy-to-underestimate chunk to total project cost. These vary widely by jurisdiction and use type, and need to be confirmed directly with the local authority during feasibility - not assumed from a different project or a different county.',
          ],
        },
      ],
      keyTakeaways: [
        'A feasibility study that kills a project before land is purchased is doing its job - it\'s the cheapest place to find a fatal flaw.',
        'The pro forma has to account for how costs and market conditions may shift across a multi-year timeline, not just today\'s numbers.',
        'Impact fees and permitting costs vary by jurisdiction and are commonly underestimated - confirm them locally during feasibility, not after.',
      ],
      terms: ['Feasibility Study', 'Pro Forma', 'Rezoning', 'Variance', 'Site Plan', 'Impact Fees'],
    },
    {
      id: 'development-advanced',
      level: 'advanced',
      audience: 'both',
      title: 'Phasing, Construction Financing, and Managing Absorption Risk',
      summary: 'How larger projects manage financing and market risk across phases, and what determines how fast finished product actually sells or leases.',
      readTime: '10 min',
      sections: [
        {
          heading: 'Why larger projects phase',
          body: [
            'Building an entire subdivision or a large project all at once concentrates market risk into a single moment - if demand softens right as everything completes, all the finished inventory competes for the same shrinking buyer pool at once. Phasing breaks a project into smaller releases, letting later phases be sized, priced, or even paused based on how earlier phases actually sold or leased, rather than committing all capital to a single market bet.',
          ],
        },
        {
          heading: 'Construction financing across stages',
          body: [
            'A construction loan typically funds in draws tied to inspected construction milestones, similar in spirit to a rehab draw schedule but on a larger scale and with more formal inspection requirements. Development often layers financing: land acquisition debt, then a separate horizontal development loan or line, then vertical construction financing - each sized against the value created by the stage before it, since raw land, graded and utility-served lots, and finished buildings are each worth very different amounts to a lender.',
          ],
        },
        {
          heading: 'Absorption rate and pacing decisions',
          body: [
            'Absorption rate - how quickly a market will buy or lease up new inventory at a given price - directly drives how many units to build and release at once. Overestimating absorption leads to too much finished inventory sitting unsold, burning holding costs and construction loan interest every month it sits. Reading absorption conservatively, and being willing to slow a later phase\'s construction start based on how the current phase is actually absorbing, protects margin far more than an aggressive one-shot build-out.',
          ],
        },
        {
          heading: 'The certificate of occupancy as the real finish line',
          body: [
            'A building isn\'t sellable or leasable - in the fullest sense - until it receives its certificate of occupancy, the final government sign-off that it meets code and is safe to occupy. Scheduling final inspections and CO issuance needs to be tracked as carefully as construction itself, since a finished-looking building without its CO can\'t legally close or lease, creating a costly, avoidable delay right at the finish line.',
          ],
        },
      ],
      keyTakeaways: [
        'Phasing a large project spreads market risk across time instead of betting everything on demand at one single completion date.',
        'Construction financing is typically layered in stages, each sized against the value the previous stage created.',
        'Absorption rate should be read conservatively - overbuilding into a market that can\'t absorb it is one of development\'s costliest mistakes.',
      ],
      terms: ['Absorption Rate', 'Construction Loan', 'Certificate of Occupancy (CO)', 'Subdivision', 'Capital Stack'],
    },
  ],
}
