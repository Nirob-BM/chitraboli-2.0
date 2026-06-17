
-- 1) site_settings: restrict public read to non-sensitive categories
DROP POLICY IF EXISTS "Site settings are publicly readable" ON public.site_settings;
CREATE POLICY "Public site settings are readable"
  ON public.site_settings FOR SELECT
  USING (category NOT IN ('system','integrations','notifications','analytics','orders','inventory'));

-- 2) profile_audit_logs: lock down INSERT, route through SECURITY DEFINER helpers
DROP POLICY IF EXISTS "Users can create their own audit logs" ON public.profile_audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.profile_audit_logs;

CREATE POLICY "Admins can insert audit logs"
  ON public.profile_audit_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_self_profile_audit(
  _action text,
  _field_changed text DEFAULT NULL,
  _old_value text DEFAULT NULL,
  _new_value text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.profile_audit_logs (user_id, action, field_changed, old_value, new_value, changed_by)
  VALUES (auth.uid(), _action, _field_changed, _old_value, _new_value, auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_log_profile_audit(
  _target_user_id uuid,
  _action text,
  _field_changed text DEFAULT NULL,
  _old_value text DEFAULT NULL,
  _new_value text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  INSERT INTO public.profile_audit_logs (user_id, action, field_changed, old_value, new_value, changed_by)
  VALUES (_target_user_id, _action, _field_changed, _old_value, _new_value, auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_self_profile_audit(text,text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.admin_log_profile_audit(uuid,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_self_profile_audit(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_profile_audit(uuid,text,text,text,text) TO authenticated;

-- 3) contact_messages: replace WITH CHECK (true) with input validation
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (
    length(trim(name)) BETWEEN 1 AND 200
    AND length(trim(email)) BETWEEN 3 AND 320
    AND email LIKE '%@%.%'
    AND length(trim(subject)) BETWEEN 1 AND 200
    AND length(trim(message)) BETWEEN 1 AND 5000
  );

-- 4) Storage policies for private 'backups' bucket (admin-only)
DROP POLICY IF EXISTS "Admins can read backups" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload backups" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update backups" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete backups" ON storage.objects;

CREATE POLICY "Admins can read backups"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can upload backups"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update backups"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete backups"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'::app_role));
