export interface CampaignDayDefinition {
  dayId: string;
  eyebrow: string;
  headline: string;
  briefing: string;
  unlockLine: string;
  eventIcon?: string;
  eventLabel?: string;
  achievementId?: string;
  achievementStars?: number;
}

/**
 * Narrative/retention metadata stays separate from the restaurant rules.
 * Gameplay can be rebalanced without rewriting the campaign presentation.
 */
export const campaignDays: Readonly<Record<string, CampaignDayDefinition>> = {
  'day-01': {
    dayId: 'day-01',
    eyebrow: 'GRAND OPENING',
    headline: 'The doors are finally open.',
    briefing: 'Seat your first guests, bring menus, and learn the rhythm of the room.',
    unlockLine: 'Today: Seating + Menu',
  },
  'day-02': {
    dayId: 'day-02',
    eyebrow: 'A BUSIER LUNCH',
    headline: 'Guests are ready to order.',
    briefing: 'Watch for the ready signal, tap the table, and remember what they asked for.',
    unlockLine: 'New: Order Taking + Memory',
  },
  'day-03': {
    dayId: 'day-03',
    eyebrow: 'COUNTER ONLINE',
    headline: 'The POS is finally working.',
    briefing: 'Remember the order, then enter it at the service counter before the window closes.',
    unlockLine: 'New: POS + Kitchen',
  },
  'day-04': {
    dayId: 'day-04',
    eyebrow: 'MORE TABLES',
    headline: 'Word is getting around.',
    briefing: 'A third table opens and food now waits at pickup. Drag each dish to the right guests.',
    unlockLine: 'New: Manual Serving',
  },
  'day-05': {
    dayId: 'day-05',
    eyebrow: 'FULL SERVICE',
    headline: 'Now it feels like a real restaurant.',
    briefing: 'Run the full flow from the door to payment. Every clean turnover matters.',
    unlockLine: 'New: Payment + Full Service',
  },
  'day-06': {
    dayId: 'day-06',
    eyebrow: 'DINNER RUSH',
    headline: 'Tonight, the room fills fast.',
    briefing: 'Four tables, tighter service windows, and streak scoring. Keep the rhythm alive.',
    unlockLine: 'New: Service Ratings + Streak',
    eventIcon: '🔥',
    eventLabel: 'DINNER RUSH',
  },
  'day-07': {
    dayId: 'day-07',
    eyebrow: 'SPECIAL GUEST',
    headline: 'A food critic booked a table.',
    briefing: 'Run your best full-service shift. Earn at least two stars to leave a strong first impression.',
    unlockLine: 'Event: Food Critic',
    eventIcon: '🕵️',
    eventLabel: 'CRITIC WATCHING',
    achievementId: 'critic-approved',
    achievementStars: 2,
  },
};
