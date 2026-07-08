import type { Strategy } from '../types'

export const LAND_FLIPS: Strategy = {
  id: 'land-flips',
  name: 'Land Flips (Dirt Flipping)',
  shortName: 'Land Flips',
  tagline: 'Buy overlooked vacant land below market value, resell it - no rehab, no tenants, no contractors.',
  flywheelStage: 'Sourced by the Lead Engine, scored by the Deal Engine, funded by the Capital Engine - this is the strategy behind the bulk of the property portfolio currently in Dynasty OS.',
  minBar: 'Positive spread after holding and closing costs, verified buildable or explicitly priced as unbuildable',
  modules: [
    {
      id: 'land-flips-beginner',
      level: 'beginner',
      audience: 'both',
      title: 'Land Flipping Fundamentals',
      summary: 'What land flipping actually is, why vacant land behaves differently from houses, and how a basic deal makes money.',
      readTime: '7 min',
      sections: [
        {
          heading: 'What land flipping is',
          body: [
            'Land flipping means buying a vacant parcel - no house, no building, just dirt - for well below what it\'s actually worth, then reselling it to someone who wants it more: a builder, a farmer, a hunter, a neighbor expanding their lot, or another investor.',
            'There\'s no rehab, no tenants, no contractors, and no inspection reports full of surprises. The entire game is sourcing and valuation: finding sellers who don\'t know or don\'t care what their land is worth, and knowing what it\'s actually worth well enough to buy it right.',
          ],
        },
        {
          heading: 'Why vacant land sellers exist',
          body: [
            'Land is disproportionately owned by people who never intended to develop it - it was inherited, bought decades ago as a speculative afterthought, or picked up at a tax sale. Many owners live in a different state, have no emotional attachment to the parcel, and have no idea what similar land nearby is currently selling for.',
            'That gap - between what an absentee, disengaged owner thinks their land is worth (often "whatever I paid, or less") and what it\'s actually worth to a motivated end buyer - is where land-flip margin comes from.',
          ],
        },
        {
          heading: 'How value works without a building',
          body: [
            'A house is valued by comparing it to similar houses. Land is valued almost entirely by what it\'s legally and physically allowed to become: is it buildable, is there road access, are utilities nearby, what\'s the zoning, is it in a flood zone. Two parcels of identical acreage a mile apart can be worth wildly different amounts because one has none of those things and the other has all of them.',
            'This is why Dynasty\'s enrichment pipeline pulls GIS, flood zone, and parcel data automatically before a human ever looks at a listing - land underwriting is fundamentally a data-gathering problem before it\'s a negotiation problem.',
          ],
        },
        {
          heading: 'The basic deal shape',
          body: [
            'Source a parcel from a motivated, disengaged owner well below its resale value. Verify it isn\'t landlocked, isn\'t functionally unbuildable, and doesn\'t carry a fatal flaw (unpaid back taxes larger than the deal, contested title, an easement that swallows the usable area). Close, then resell - often with owner financing offered to the end buyer, since land buyers frequently can\'t get a conventional loan on raw dirt.',
          ],
        },
      ],
      keyTakeaways: [
        'Land value comes from legal/physical potential (zoning, access, utilities), not comps the way houses are valued.',
        'Margin comes from sourcing disengaged, motivated sellers - not from adding value through work.',
        'A parcel with no verified road access or a fatal title issue can be worthless regardless of acreage.',
      ],
      terms: ['Land Flipping (Dirt Flipping)', 'Vacant Land', 'Parcel', 'Motivated Seller'],
    },
    {
      id: 'land-flips-intermediate',
      level: 'intermediate',
      audience: 'both',
      title: 'Sourcing and Underwriting Raw Land',
      summary: 'Where land deals actually come from, the due-diligence checklist that separates buildable from worthless, and how to price an offer.',
      readTime: '9 min',
      sections: [
        {
          heading: 'Sourcing at scale',
          body: [
            'Most land deal flow comes from list-based marketing: county tax delinquency lists, absentee-owner filters on parcel data providers (like PropWire), probate/inherited-property lists, and direct mail to owners who\'ve held a parcel for many years with no activity on it. Skip tracing turns a mailing address into a phone number so outreach doesn\'t depend on a letter alone.',
            'Because land owners are scattered nationally and rarely respond quickly, land sourcing rewards volume and patience more than any single strategy - which is why the portfolio behind this track runs into the thousands of parcels rather than dozens.',
          ],
        },
        {
          heading: 'The due-diligence checklist',
          body: [
            'Before making an offer real, confirm: zoning (what is this parcel legally allowed to be used for), road access (a recorded right of way, not just "looks connected" on a map), utility proximity or well/septic feasibility, flood zone designation, and whether a perc test is realistically likely to pass if septic will be required.',
            'Then confirm the boring-but-fatal items: back taxes owed, any liens, and whether the seller\'s name on the deed actually matches who you\'re negotiating with (common issue with inherited land that was never formally transferred through probate).',
          ],
        },
        {
          heading: 'Pricing the offer',
          body: [
            'Pull recent comparable land sales in the same county or township - not just nearby houses, actual vacant-land sales, since land comps can be scarce and require a wider radius or longer time window than house comps. Adjust for acreage, access quality, and buildability.',
            'From an estimated resale value, work backward: subtract expected holding costs (property taxes, any loan interest), closing costs on both ends, and your required margin, to land on a maximum offer. This is the same MAO logic used across every Dynasty strategy, just with land-specific inputs.',
          ],
        },
        {
          heading: 'Why "unknown - verify locally" is a valid answer',
          body: [
            'Not every jurisdiction publishes zoning or GIS data cleanly. When Dynasty\'s enrichment can\'t confidently determine a value like zoning district, it flags the parcel as "unknown - verify locally" rather than guessing. Treat that flag as a to-do, not a red flag - it means a phone call to the county, not an automatic pass on the deal.',
          ],
        },
      ],
      keyTakeaways: [
        'Land sourcing is a volume game built on absentee-owner and tax-delinquency lists, not driving neighborhoods.',
        'Zoning, access, and perc feasibility are the three checks that most often kill a land deal - verify them before you get emotionally attached to the price.',
        'Land comps require a wider net than house comps - pull actual vacant-land sales, not nearby home sales.',
      ],
      terms: ['Percolation Test (Perc Test)', 'Zoning', 'Right of Way', 'MAO (Maximum Allowable Offer)', 'GIS (Geographic Information System)', 'Skip Tracing'],
    },
    {
      id: 'land-flips-advanced',
      level: 'advanced',
      audience: 'both',
      title: 'Scaling a Land Portfolio and Structuring Exits',
      summary: 'Owner financing as an exit multiplier, subdividing for margin, and managing risk across a large land book.',
      readTime: '10 min',
      sections: [
        {
          heading: 'Owner financing as the default exit',
          body: [
            'Most retail land buyers can\'t get a conventional mortgage on raw land - banks consider it higher risk with no structure to secure the loan against. Offering seller/owner financing on your resale dramatically widens your buyer pool and often lets you sell at a higher price and collect interest on top, turning a single flip into a small recurring note.',
            'The tradeoff is capital velocity: a financed sale returns your capital over years, not weeks, which is why serious land operators run a blended book - some parcels sold for cash at a discount to recycle capital quickly, others financed to maximize total return.',
          ],
        },
        {
          heading: 'Subdividing for margin',
          body: [
            'A large parcel is sometimes worth meaningfully more divided into several smaller lots than sold as one piece - especially near growing suburban edges. Subdividing requires a survey, a recorded plat, and local approval, and it converts a land flip into a small development-adjacent project with a longer timeline and real entitlement risk.',
            'This only pencils when the uplift in combined lot value clearly exceeds survey, platting, and carrying costs across the longer timeline - run the math before committing, not after.',
          ],
        },
        {
          heading: 'Risk management at scale',
          body: [
            'The biggest portfolio-level risk in land investing isn\'t any single bad parcel - it\'s carrying too many marginal parcels at once, each with small holding costs that add up, tying up capital that could be recycled into better deals. Regularly reviewing the whole book for parcels that have sat too long, and being willing to sell at a smaller margin to free capital, protects overall velocity.',
            'The second biggest risk is compounding a bad zoning or access assumption across a batch - if a sourcing list or an assumption about a jurisdiction turns out wrong, it\'s wrong across every parcel bought under that assumption, not just one.',
          ],
        },
        {
          heading: 'Where this connects to the rest of Dynasty',
          body: [
            'A land-heavy portfolio is exactly the kind of dataset Dynasty\'s Investment Intelligence tools were built for: the Top 20 view surfaces which parcels deserve review first, Next Best Action tells you what to actually do next on each one, and Biggest Assumption flags which price or cost input a GO decision is most sensitive to - all of which matter more, not less, as the portfolio scales into the thousands.',
          ],
        },
      ],
      keyTakeaways: [
        'Owner financing widens your buyer pool and can raise total return, at the cost of slower capital recycling.',
        'Subdividing only makes sense when the combined-lot uplift clearly beats survey, platting, and carrying costs.',
        'At scale, the real risk is capital getting stuck in too many slow-moving parcels, not any single bad deal.',
      ],
      terms: ['Owner Financing (Seller Financing)', 'Subdivision', 'Land Survey', 'Plat / Plat Map', 'Deal Score / Underwriting Score'],
    },
  ],
}
