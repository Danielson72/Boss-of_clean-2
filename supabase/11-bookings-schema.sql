-- =============================================
-- BOOKINGS TABLE
-- Supports instant booking for cleaners with availability
-- =============================================

CREATE TYPE booking_status AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE property_type AS ENUM ('apartment', 'house', 'condo', 'townhouse', 'office', 'other');

CREATE TABLE public.bookings (
  id UUID DEFAULT uuid_generate_v4(),
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  property_type property_type NOT NULL DEFAULT 'house',
  bedrooms INTEGER DEFAULT 2,
  bathrooms INTEGER DEFAULT 1,
  square_footage INTEGER,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  address TEXT,
  special_instructions TEXT,
  estimated_price DECIMAL(10,2) NOT NULL,
  estimated_hours DECIMAL(4,1) NOT NULL,
  status booking_status DEFAULT 'confirmed',
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT valid_booking_time CHECK (end_time > start_time),
  CONSTRAINT future_booking CHECK (booking_date >= CURRENT_DATE)
);

-- Indexes
CREATE INDEX idx_bookings_cleaner_id ON public.bookings(cleaner_id);
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_cleaner_date ON public.bookings(cleaner_id, booking_date);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Customers can view their own bookings" ON public.bookings
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Cleaners can view bookings for their business" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = bookings.cleaner_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND customer_id = auth.uid());

CREATE POLICY "Customers can cancel their own bookings" ON public.bookings
  FOR UPDATE USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Cleaners can update booking status" ON public.bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = bookings.cleaner_id AND c.user_id = auth.uid()
    )
  );
