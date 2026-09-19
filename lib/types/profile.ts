export type InstagramObjective =
  | "followers"
  | "reach"
  | "clients"
  | "sales"
  | "authority"
  | "brand_deals"
  | "community"
  | "monetization"
  | "other";

export type ConversionGoal =
  | "follow"
  | "direct"
  | "whatsapp"
  | "purchase"
  | "booking"
  | "quote"
  | "awareness"
  | "other";

export interface StrategicProfile {
  profileDescription: string;
  desiredOutcome: string;
  objective?: InstagramObjective;
  conversionGoal?: ConversionGoal;
  audience?: string;
  location?: string;
  appearsOnCamera?: boolean;
  availableMinutesPerDay?: number;
  ninetyDayGoal?: string;
}
