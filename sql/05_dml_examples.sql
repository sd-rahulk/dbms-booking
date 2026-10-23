-- DML examples in an explicit PostgreSQL transaction.
BEGIN TRANSACTION;
INSERT INTO emergency_contact(contact_id,user_id,name,phone_number) VALUES ('EC001','U001','Rahul Rao','+91 90000 19999') ON CONFLICT (contact_id) DO NOTHING;
UPDATE driver SET availability_status='ONLINE' WHERE driver_id='D001';
DELETE FROM emergency_contact WHERE contact_id='EC001' AND user_id='U001';
ROLLBACK;
