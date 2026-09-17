import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
export const registerSchema = z.object({ userId: z.string().min(3).max(12), firstName: z.string().min(2), lastName: z.string().optional(), email: z.string().email(), password: z.string().min(8), phone: z.string().min(7) });
export const bookingSchema = z.object({ pickupLocation: z.string().min(3), dropLocation: z.string().min(3), vehicleType: z.string().min(2) });
export const transitionSchema = z.object({ to: z.enum(["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]), reason: z.string().max(240).optional() });
export const availabilitySchema = z.object({ status: z.enum(["ONLINE", "OFFLINE"]) });
export const paymentSchema = z.object({ method: z.enum(["CARD", "UPI", "CASH"]) });
