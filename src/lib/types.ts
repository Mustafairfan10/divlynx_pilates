export type ID = string;

export type MemberStatus = "active" | "inactive" | "lead" | "frozen";
export type ClassCategory = "reformer" | "mat" | "tower" | "chair" | "barre" | "private" | "other";
export type Level = "all" | "beginner" | "intermediate" | "advanced";
export type BookingStatus = "booked" | "waitlist" | "checked_in" | "cancelled" | "late_cancel" | "no_show";
export type PlanType = "pack" | "unlimited" | "intro" | "private";
export type PaymentMethod = "card" | "cash" | "transfer" | "other";
export type PaymentType = "membership" | "drop_in" | "retail" | "fee" | "refund";
export type EquipmentType = "reformer" | "cadillac" | "chair" | "barrel" | "tower" | "mat" | "accessory";
export type EquipmentStatus = "operational" | "maintenance" | "out_of_service";

export interface Settings {
  id: "studio";
  studioName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  locale: string;
  taxRate: number; // percent
  cancellationWindowHours: number;
  lateCancelForfeit: boolean;
  noShowForfeit: boolean;
  autoPromoteWaitlist: boolean;
  bookingWindowDays: number;
  openingHour: number;
  closingHour: number;
  weekStartsOn: 0 | 1;
  ownerName: string;
  seededAt?: string;
}

export interface Member {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday?: string;
  status: MemberStatus;
  joinedAt: string;
  source?: string;
  tags: string[];
  emergencyName?: string;
  emergencyPhone?: string;
  healthNotes?: string;
  goals?: string;
  notes?: string;
  waiverSigned: boolean;
  intake?: Intake;
}

export type Experience = "new" | "some" | "regular" | "instructor";
export interface Intake {
  submittedAt: string;
  experience: Experience;
  activityLevel: "low" | "moderate" | "high";
  goals: string[];
  interests: ClassCategory[];
  preferredTimes: string[];
  injuries: string[];
  conditions: string[];
  medications?: string;
  bodyNotes?: string;
  occupation?: string;
  signatureName: string;
  signatureImage?: string;
  marketingOptIn: boolean;
  needsClearance: boolean;
}

export type ProductArt = "socks" | "bottle" | "tote" | "band" | "towel" | "mat" | "ring" | "giftcard";
export interface Product {
  id: ID;
  name: string;
  category: "apparel" | "equipment" | "accessories" | "gift";
  price: number;
  description: string;
  stock: number;
  art: ProductArt;
  tone: string;
  active: boolean;
  badge?: string;
}

export interface Instructor {
  id: ID;
  name: string;
  email: string;
  phone: string;
  bio?: string;
  specialties: ClassCategory[];
  color: string;
  ratePerClass: number;
  ratePerPrivate: number;
  active: boolean;
  hiredAt: string;
}

export interface ClassType {
  id: ID;
  name: string;
  category: ClassCategory;
  level: Level;
  duration: number; // minutes
  defaultCapacity: number;
  creditCost: number;
  color: string; // css color
  description?: string;
  active: boolean;
}

export interface Room {
  id: ID;
  name: string;
  capacity: number;
  description?: string;
}

export interface Session {
  id: ID;
  classTypeId: ID;
  instructorId: ID;
  roomId: ID;
  start: string; // ISO
  duration: number;
  capacity: number;
  cancelled: boolean;
  notes?: string;
  seriesId?: ID;
}

export interface Booking {
  id: ID;
  sessionId: ID;
  memberId: ID;
  membershipId?: ID;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string;
  creditCharged: number; // credits currently consumed by this booking
  spot?: number;
}

export interface Plan {
  id: ID;
  name: string;
  type: PlanType;
  credits: number | null; // null = unlimited
  validityDays: number;
  price: number;
  description?: string;
  active: boolean;
  privateOnly: boolean;
  popular?: boolean;
}

export interface Membership {
  id: ID;
  memberId: ID;
  planId: ID;
  planName: string;
  planType: PlanType;
  startDate: string; // ISO date
  endDate: string;
  creditsTotal: number | null;
  creditsUsed: number;
  pricePaid: number;
  status: "active" | "frozen" | "cancelled";
  frozenAt?: string;
  privateOnly: boolean;
  createdAt: string;
}

export interface Payment {
  id: ID;
  invoiceNo: string;
  memberId?: ID;
  membershipId?: ID;
  amount: number; // gross incl. tax; negative for refunds
  tax: number;
  method: PaymentMethod;
  type: PaymentType;
  description: string;
  date: string;
  status: "paid" | "pending" | "refunded";
}

export interface Equipment {
  id: ID;
  name: string;
  type: EquipmentType;
  roomId?: ID;
  serial?: string;
  purchasedAt?: string;
  lastServiceAt?: string;
  serviceIntervalDays: number;
  status: EquipmentStatus;
  notes?: string;
}

export interface Activity {
  id: ID;
  at: string;
  kind: "booking" | "checkin" | "cancel" | "payment" | "member" | "membership" | "session" | "system";
  message: string;
  refId?: ID;
}
