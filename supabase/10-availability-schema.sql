-- =============================================
-- CLEANER AVAILABILITY SCHEMA
-- Manages weekly schedules, blocked dates, and instant booking
-- =============================================

-- Weekly availability slots for cleaners
CREATE TABLE public.cleaner_availability (
  id UUID DEFAULT uuid_generate_v4(),
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_cleaner_day_slot UNIQUE (cleaner_id, day_of_week, start_time, end_time)
);

-- Blocked dates (vacation/time off)
CREATE TABLE public.cleaner_blocked_dates (
  id UUID DEFAULT uuid_generate_v4(),
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT unique_cleaner_blocked_date UNIQUE (cleaner_id, blocked_date)
);

-- Indexes
CREATE INDEX idx_cleaner_availability_cleaner_id ON public.cleaner_availability(cleaner_id);
CREATE INDEX idx_cleaner_availability_day ON public.cleaner_availability(day_of_week);
CREATE INDEX idx_cleaner_blocked_dates_cleaner_id ON public.cleaner_blocked_dates(cleaner_id);
CREATE INDEX idx_cleaner_blocked_dates_date ON public.cleaner_blocked_dates(blocked_date);

-- Enable RLS
ALTER TABLE public.cleaner_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cleaner_availability
CREATE POLICY "Anyone can view cleaner availability" ON public.cleaner_availability
  FOR SELECT USING (true);

CREATE POLICY "Cleaners can manage their own availability" ON public.cleaner_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = cleaner_availability.cleaner_id AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for cleaner_blocked_dates
CREATE POLICY "Anyone can view blocked dates" ON public.cleaner_blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "Cleaners can manage their own blocked dates" ON public.cleaner_blocked_dates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = cleaner_blocked_dates.cleaner_id AND c.user_id = auth.uid()
    )
  );
