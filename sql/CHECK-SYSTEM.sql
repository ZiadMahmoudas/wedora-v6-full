-- WEDORA clean release diagnostics
select email,role,created_at from public.profiles order by created_at desc;
select id,slug,name_en,reference_price,price,duration_months,is_lifetime,is_active from public.plans order by sort_order;
select id,user_id,plan_id,status,current_period_end,is_lifetime,source_order_id from public.subscriptions order by updated_at desc;
select id,user_id,invitation_id,plan_id,amount,payment_method,status,created_at from public.orders order by created_at desc;
select id,user_id,slug,status,plan_id,active_until,is_lifetime,is_trial,published_at from public.invitations order by created_at desc;
