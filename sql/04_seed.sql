-- Deterministic starter rows. Password hashes are created by prisma/seed.ts.
INSERT OR IGNORE INTO app_user(user_id,first_name,last_name,email) VALUES ('U001','Ananya','Rao','ananya@aeride.local'),('U002','Vikram','Iyer','vikram@aeride.local'),('U003','Meera','Nair','meera@aeride.local'),('U004','Arjun','Menon','arjun@aeride.local'),('U005','Divya','Shah','divya@aeride.local');
INSERT OR IGNORE INTO fare_policy(policy_id,vehicle_type,base_fare,per_km_rate) VALUES ('FP001','Hatchback',45,12),('FP002','Sedan',65,15),('FP003','SUV',90,20);
