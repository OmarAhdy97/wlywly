-- شغّله مرة واحدة في Supabase → SQL Editor. كل الأوامر آمنة لإعادة التشغيل.

-- 1) حماية البيانات: حذف سياسات "السماح للجميع". كل جدول عنده بالفعل سياسات user_id الصحيحة،
--    والتطبيق أصلًا بيفلتر بـ user_id، فمفيش حاجة هتتغير للمستخدم.
drop policy if exists "Allow all for cases"        on public.cases;
drop policy if exists "Allow all for clients"      on public.clients;
drop policy if exists "Allow all for sessions"     on public.sessions;
drop policy if exists "Allow all for team_members" on public.team_members;

-- 2) العمود الناقص اللي كان بيمنع حفظ حالة المهام الإدارية ومهام المحضرين
alter table public.admin_tasks   add column if not exists completed_by uuid references auth.users(id);
alter table public.bailiff_tasks add column if not exists completed_at timestamptz;
alter table public.bailiff_tasks add column if not exists completed_by uuid references auth.users(id);

-- 3) فهارس للجداول اللي مفيهاش فهرس (سرعة مع كبر البيانات)
create index if not exists idx_admin_tasks_user_id    on public.admin_tasks(user_id);
create index if not exists idx_admin_tasks_client_id  on public.admin_tasks(client_id);
create index if not exists idx_bailiff_tasks_user_id  on public.bailiff_tasks(user_id);
create index if not exists idx_bailiff_tasks_client   on public.bailiff_tasks(client_id);
create index if not exists idx_agenda_events_user_id  on public.agenda_events(user_id);
create index if not exists idx_agenda_events_date     on public.agenda_events(event_date);
create index if not exists idx_appeals_user_id        on public.appeals(user_id);
create index if not exists idx_appeals_case_id        on public.appeals(case_id);
create index if not exists idx_sessions_case_id       on public.sessions(case_id);
create index if not exists idx_sessions_date          on public.sessions(session_date);
create index if not exists idx_cases_client_id        on public.cases(client_id);

-- 4) agenda_events و appeals: user_id يبقى إلزامي (دلوقتي ممكن يبقى null فالسجل مش بيظهر لأي حد)
--    شغّله بعد ما تتأكد إنه مفيش صفوف بـ user_id فاضي (الفحص الحالي: صفر).
alter table public.agenda_events alter column user_id set not null;
alter table public.appeals       alter column user_id set not null;

-- 5) مجلد الملفات "documents": بقى عام (أي حد معاه الرابط يفتح الملف). حاليًا فاضي.
--    قبل ما تبدأ ترفع مستندات موكلين: خليه خاص وحدد سياسات لكل مستخدم.
update storage.buckets set public = false where id = 'documents';
drop policy if exists "documents_own_select" on storage.objects;
drop policy if exists "documents_own_insert" on storage.objects;
drop policy if exists "documents_own_delete" on storage.objects;
create policy "documents_own_select" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_own_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
