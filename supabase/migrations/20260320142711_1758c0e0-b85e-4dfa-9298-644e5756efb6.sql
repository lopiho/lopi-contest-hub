
-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_by_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only organizers can view audit logs" ON public.audit_log
  FOR SELECT USING (has_role(auth.uid(), 'organizer'::app_role));

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _role TEXT;
  _record_id TEXT;
BEGIN
  _user_id := auth.uid();
  
  SELECT role::text INTO _role FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY CASE role WHEN 'organizer' THEN 1 WHEN 'helper' THEN 2 ELSE 3 END
  LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id::text;
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, changed_by, changed_by_role)
    VALUES (TG_TABLE_NAME, _record_id, 'DELETE', to_jsonb(OLD), _user_id, COALESCE(_role, 'unknown'));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _record_id := NEW.id::text;
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by, changed_by_role)
    VALUES (TG_TABLE_NAME, _record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), _user_id, COALESCE(_role, 'unknown'));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    _record_id := NEW.id::text;
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, changed_by, changed_by_role)
    VALUES (TG_TABLE_NAME, _record_id, 'INSERT', to_jsonb(NEW), _user_id, COALESCE(_role, 'unknown'));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers to key tables
CREATE TRIGGER audit_articles AFTER INSERT OR UPDATE OR DELETE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_guessing_games AFTER INSERT OR UPDATE OR DELETE ON public.guessing_games FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_guessing_tips AFTER INSERT OR UPDATE OR DELETE ON public.guessing_tips FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_shop_items AFTER INSERT OR UPDATE OR DELETE ON public.shop_items FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_purchases AFTER INSERT OR UPDATE OR DELETE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_site_content AFTER INSERT OR UPDATE OR DELETE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_seasons AFTER INSERT OR UPDATE OR DELETE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_season_riddles AFTER INSERT OR UPDATE OR DELETE ON public.season_riddles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
