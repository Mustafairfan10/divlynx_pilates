import Dexie, { type EntityTable } from "dexie";
import type {
  Activity, Booking, ClassType, Equipment, Instructor, Member, Membership, Payment, Plan, Product, Room, Session, Settings,
} from "./types";
import { demoProducts } from "./products";

export class StudioDB extends Dexie {
  settings!: EntityTable<Settings, "id">;
  members!: EntityTable<Member, "id">;
  instructors!: EntityTable<Instructor, "id">;
  classTypes!: EntityTable<ClassType, "id">;
  rooms!: EntityTable<Room, "id">;
  sessions!: EntityTable<Session, "id">;
  bookings!: EntityTable<Booking, "id">;
  plans!: EntityTable<Plan, "id">;
  memberships!: EntityTable<Membership, "id">;
  payments!: EntityTable<Payment, "id">;
  equipment!: EntityTable<Equipment, "id">;
  activity!: EntityTable<Activity, "id">;
  products!: EntityTable<Product, "id">;

  constructor() {
    super("pilates-studio");
    this.version(1).stores({
      settings: "id",
      members: "id, lastName, status, joinedAt",
      instructors: "id",
      classTypes: "id",
      rooms: "id",
      sessions: "id, start, instructorId, classTypeId, roomId, seriesId",
      bookings: "id, sessionId, memberId, membershipId, status, [sessionId+memberId]",
      plans: "id",
      memberships: "id, memberId, planId, endDate",
      payments: "id, memberId, date, membershipId",
      equipment: "id, roomId, status",
      activity: "id, at",
    });
    this.version(2).stores({ products: "id, category" }).upgrade((tx) => tx.table("products").bulkAdd(demoProducts()));
  }
}

export const db = new StudioDB();

export const ALL_TABLES = [
  "settings", "members", "instructors", "classTypes", "rooms", "sessions",
  "bookings", "plans", "memberships", "payments", "equipment", "activity", "products",
] as const;
