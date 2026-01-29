-- Check current user role
SELECT id, email, first_name, last_name, role, created_at 
FROM users 
WHERE email = 'aiartvers3@gmail.com';

-- Check if seller record exists
SELECT * FROM sellers WHERE user_id = '61c05214-a970-4b89-a675-4b4f2fbe3f37';

-- Update user role to seller (if needed)
UPDATE users 
SET role = 'seller' 
WHERE id = '61c05214-a970-4b89-a675-4b4f2fbe3f37';

-- Check seller_kyc status
SELECT * FROM seller_kyc WHERE user_id = '61c05214-a970-4b89-a675-4b4f2fbe3f37';

-- Approve KYC
UPDATE seller_kyc 
SET status = 'approved', 
    admin_notes = 'Test approval',
    updated_at = NOW()
WHERE user_id = '61c05214-a970-4b89-a675-4b4f2fbe3f37';

-- Verify everything is correct
SELECT 
    u.id,
    u.email,
    u.role as user_role,
    s.id as seller_id,
    sk.status as kyc_status
FROM users u
LEFT JOIN sellers s ON u.id = s.user_id
LEFT JOIN seller_kyc sk ON u.id = sk.user_id
WHERE u.id = '61c05214-a970-4b89-a675-4b4f2fbe3f37';
