-- Quick diagnostics
select email,role,created_at from public.profiles order by created_at desc;
select id,slug,name_en,reference_price,price,duration_months,is_lifetime,is_active from public.plans order by sort_order;
select id,user_id,invitation_id,amount,payment_method,status,created_at from public.orders order by created_at desc;
select id,slug,status,plan_id,active_until,is_lifetime from public.invitations order by created_at desc;
