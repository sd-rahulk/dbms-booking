import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);

async function main() {
  const hash = await bcrypt.hash("aeride123", 12);
  const adminHash = await bcrypt.hash("admin1234", 12);
  const users = [
    ["U001", "Ananya", "Rao", "ananya@aeride.local", "+91 90000 10001"], ["U002", "Vikram", "Iyer", "vikram@aeride.local", "+91 90000 10002"], ["U003", "Meera", "Nair", "meera@aeride.local", "+91 90000 10003"], ["U004", "Arjun", "Menon", "arjun@aeride.local", "+91 90000 10004"], ["U005", "Divya", "Shah", "divya@aeride.local", "+91 90000 10005"],
  ] as const;
  for (const [userId, firstName, lastName, email, phone] of users) {
    await db.appUser.upsert({ where: { userId }, update: { firstName, lastName, email }, create: { userId, firstName, lastName, email, phones: { create: { phoneNumber: phone } } } });
    await db.authAccount.upsert({ where: { email }, update: { passwordHash: hash, role: "PASSENGER", userId }, create: { email, passwordHash: hash, role: "PASSENGER", userId } });
  }
  const drivers = [
    ["D001", "Karthik", "R", "karthik@aeride.local", "ONLINE"], ["D002", "Sahana", "P", "sahana@aeride.local", "OFFLINE"], ["D003", "Mohan", "K", "mohan@aeride.local", "ONLINE"], ["D004", "Priya", "S", "priya@aeride.local", "OFFLINE"], ["D005", "Ravi", "V", "ravi@aeride.local", "OFFLINE"],
  ] as const;
  for (const [driverId, firstName, lastName, email, availabilityStatus] of drivers) {
    await db.driver.upsert({ where: { driverId }, update: { firstName, lastName, email, availabilityStatus: availabilityStatus as any, verificationStatus: "VERIFIED" }, create: { driverId, firstName, lastName, email, availabilityStatus: availabilityStatus as any, verificationStatus: "VERIFIED", phones: { create: { phoneNumber: `+91 98888 ${driverId.slice(1)}01` } } } });
    await db.authAccount.upsert({ where: { email }, update: { passwordHash: hash, role: "DRIVER", driverId }, create: { email, passwordHash: hash, role: "DRIVER", driverId } });
  }
  await db.authAccount.upsert({ where: { email: "admin@aeride.local" }, update: { passwordHash: adminHash, role: "ADMIN", userId: null, driverId: null }, create: { email: "admin@aeride.local", passwordHash: adminHash, role: "ADMIN" } });

  const vehicleData = [
    ["V001", "D001", "Sedan", "Honda City", 4, "TN01AB1001"], ["V002", "D002", "Hatchback", "Maruti Baleno", 4, "TN01AB1002"], ["V003", "D003", "SUV", "Kia Seltos", 6, "TN01AB1003"], ["V004", "D004", "Sedan", "Hyundai Verna", 4, "TN01AB1004"], ["V005", "D005", "Hatchback", "Tata Altroz", 4, "TN01AB1005"],
  ] as const;
  for (const [vehicleId, driverId, type, model, capacity, registrationNumber] of vehicleData) {
    await db.vehicle.upsert({ where: { vehicleId }, update: { driverId, type, model, capacity, registrationNumber }, create: { vehicleId, driverId, type, model, capacity, registrationNumber, documents: { create: { documentId: `DOC${vehicleId.slice(1)}`, issueDate: new Date("2025-01-01"), expiryDate: new Date(vehicleId === "V005" ? "2026-10-01" : "2027-12-31"), documentType: "RC" } } } });
  }
  const policies = [["FP001", "Hatchback", 45, 12], ["FP002", "Sedan", 65, 15], ["FP003", "SUV", 90, 20]] as const;
  for (const [policyId, vehicleType, baseFare, perKmRate] of policies) await db.farePolicy.upsert({ where: { policyId }, update: { vehicleType, baseFare, perKmRate }, create: { policyId, vehicleType, baseFare, perKmRate } });

  const routes = [["T001", "U001", "FP002", "Chennai Central", "Tidel Park", "COMPLETED", "D001", 11.4, 236], ["T002", "U001", "FP001", "Adyar", "Velachery", "COMPLETED", "D003", 7.2, 131.4], ["T003", "U002", "FP003", "Anna Nagar", "Airport", "IN_PROGRESS", "D001", 14.8, 386], ["T004", "U003", "FP002", "Mylapore", "Guindy", "CANCELLED", "D002", 8.1, 186.5], ["T005", "U004", "FP001", "Besant Nagar", "Sholinganallur", "REQUESTED", null, 9.5, 159]] as const;
  for (const [tripId, userId, policyId, pickupLocation, dropLocation, status, driverId, distanceKm, estimatedFare] of routes) {
    const trip = await db.trip.upsert({ where: { tripId }, update: { status, distanceKm, estimatedFare, finalFare: status === "COMPLETED" ? estimatedFare : null }, create: { tripId, userId, policyId, pickupLocation, dropLocation, bookingDate: daysAgo(status === "REQUESTED" ? 0 : 10), bookingTime: new Date(), requestedAt: daysAgo(status === "REQUESTED" ? 0 : 10), status, distanceKm, estimatedFare, finalFare: status === "COMPLETED" ? estimatedFare : null, completedAt: status === "COMPLETED" ? daysAgo(2) : null, cancelledAt: status === "CANCELLED" ? daysAgo(4) : null } });
    if (driverId) { await db.assignment.upsert({ where: { tripId_driverId: { tripId, driverId } }, update: {}, create: { tripId, driverId } }); }
    await db.tripEvent.upsert({ where: { eventId: `SEED-${tripId}` }, update: { tripId, eventType: "SEED_SNAPSHOT", newStatus: status }, create: { eventId: `SEED-${tripId}`, tripId, eventType: "SEED_SNAPSHOT", newStatus: status } });
    if (status === "COMPLETED") { await db.payment.upsert({ where: { paymentId: `PAY${tripId.slice(1)}` }, update: {}, create: { paymentId: `PAY${tripId.slice(1)}`, userId, driverId: driverId!, tripId, paymentDate: daysAgo(2), paymentMethod: tripId === "T002" ? "UPI" : "CARD", amount: estimatedFare, status: "PAID", transactionReference: `SEED-${tripId}` } }); }
  }
  await db.review.upsert({ where: { reviewId: "R001" }, update: { rating: 5, comment: "Quiet, quick, and thoughtfully handled." }, create: { reviewId: "R001", tripId: "T001", rating: 5, comment: "Quiet, quick, and thoughtfully handled." } });
  await db.review.upsert({ where: { reviewId: "R002" }, update: { rating: 4, comment: "Smooth ride across the city." }, create: { reviewId: "R002", tripId: "T002", rating: 4, comment: "Smooth ride across the city." } });
  console.log("AERIDE seed complete");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => db.$disconnect());
