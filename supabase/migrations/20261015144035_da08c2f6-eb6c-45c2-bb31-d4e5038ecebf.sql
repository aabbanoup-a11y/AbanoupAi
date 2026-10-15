DROP POLICY IF EXISTS employees_auth_update ON public.employees;
REVOKE UPDATE ON public.employees FROM authenticated;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
DROP POLICY IF EXISTS tasks_auth_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_auth_update ON public.tasks;
CREATE POLICY tasks_own_insert ON public.tasks FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY tasks_own_update ON public.tasks FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());