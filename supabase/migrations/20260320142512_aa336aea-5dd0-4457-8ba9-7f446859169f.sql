
-- Season configuration table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible seasons" ON public.seasons
  FOR SELECT USING (is_visible = true OR has_role(auth.uid(), 'organizer'::app_role) OR has_role(auth.uid(), 'helper'::app_role));

CREATE POLICY "Organizers can manage seasons" ON public.seasons
  FOR ALL USING (has_role(auth.uid(), 'organizer'::app_role) OR has_role(auth.uid(), 'helper'::app_role));

-- Season riddles (daily puzzles)
CREATE TABLE public.season_riddles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  hint TEXT,
  scheduled_date DATE NOT NULL,
  reward_item_id UUID REFERENCES public.shop_items(id),
  reward_discount_percent INTEGER DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.season_riddles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published riddles of visible seasons" ON public.season_riddles
  FOR SELECT USING (
    (is_published = true AND scheduled_date <= CURRENT_DATE AND EXISTS (
      SELECT 1 FROM public.seasons WHERE id = season_id AND is_visible = true
    ))
    OR has_role(auth.uid(), 'organizer'::app_role) 
    OR has_role(auth.uid(), 'helper'::app_role)
  );

CREATE POLICY "Organizers can manage riddles" ON public.season_riddles
  FOR ALL USING (has_role(auth.uid(), 'organizer'::app_role) OR has_role(auth.uid(), 'helper'::app_role));

-- User riddle attempts/solutions
CREATE TABLE public.season_riddle_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  riddle_id UUID NOT NULL REFERENCES public.season_riddles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(riddle_id, user_id)
);

ALTER TABLE public.season_riddle_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts" ON public.season_riddle_attempts
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'organizer'::app_role));

CREATE POLICY "Users can insert own attempts" ON public.season_riddle_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Season rewards (milestones)
CREATE TABLE public.season_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  required_correct_count INTEGER NOT NULL DEFAULT 1,
  reward_type TEXT NOT NULL DEFAULT 'points',
  reward_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.season_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rewards of visible seasons" ON public.season_rewards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.seasons WHERE id = season_id AND is_visible = true)
    OR has_role(auth.uid(), 'organizer'::app_role)
  );

CREATE POLICY "Organizers can manage rewards" ON public.season_rewards
  FOR ALL USING (has_role(auth.uid(), 'organizer'::app_role) OR has_role(auth.uid(), 'helper'::app_role));

-- Claimed rewards tracking
CREATE TABLE public.season_reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES public.season_rewards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reward_id, user_id)
);

ALTER TABLE public.season_reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.season_reward_claims
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'organizer'::app_role));

CREATE POLICY "Users can claim rewards" ON public.season_reward_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);
