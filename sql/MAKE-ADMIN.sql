-- Change the email only if your admin email is different.
insert into public.profiles(id,email,full_name,phone,role)
select u.id,u.email,nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'phone',''),'admin'::public.user_role
from auth.users u where lower(u.email)=lower('admin@gmail.com')
on conflict(id) do update set email=excluded.email,role='admin',updated_at=now();
select id,email,role from public.profiles order by role,email;
