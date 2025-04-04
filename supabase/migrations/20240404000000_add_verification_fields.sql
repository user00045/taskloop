
-- Add verification code fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS requestor_verification_code TEXT,
ADD COLUMN IF NOT EXISTS doer_verification_code TEXT,
ADD COLUMN IF NOT EXISTS is_requestor_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_doer_verified BOOLEAN DEFAULT FALSE;

-- Enable realtime for task_applications
ALTER TABLE public.task_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_applications;
