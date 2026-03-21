
CREATE TABLE public.spotlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  image_url TEXT,
  color TEXT,
  reference_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spotlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active spotlights"
  ON public.spotlights FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'organizer'::app_role) OR has_role(auth.uid(), 'helper'::app_role));

CREATE POLICY "Organizers can manage spotlights"
  ON public.spotlights FOR ALL
  USING (has_role(auth.uid(), 'organizer'::app_role) OR has_role(auth.uid(), 'helper'::app_role));

CREATE TRIGGER update_spotlights_updated_at
  BEFORE UPDATE ON public.spotlights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_spotlights
  AFTER INSERT OR UPDATE OR DELETE ON public.spotlights
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TABLE public.spotlights IS 'Promotional banners/spotlights managed by organizers. Types: article, user, game, shop_item, custom';
