
USE meetplanning;

UPDATE notifications
SET role_target = 'admin'
WHERE user_id IS NULL
AND title LIKE '%คำขอจองใหม่%';

UPDATE notifications
SET role_target = 'admin'
WHERE user_id IS NULL
AND title LIKE '%new booking%';
