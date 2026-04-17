-- Habilita extensões necessárias
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema cron;

-- Remove job antigo se existir
select cron.unschedule('followup-auto-daily') where exists (
  select 1 from cron.job where jobname = 'followup-auto-daily'
);

-- Agenda verificação automática todo dia às 12:00 UTC (09:00 Brasília)
select cron.schedule(
  'followup-auto-daily',
  '0 12 * * *',
  $$
  select
    extensions.http_post(
      url  := 'https://zljlhlfbtnzbmeaglkll.supabase.co/functions/v1/process-followups',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A'
      ),
      body := '{"auto": true}'::jsonb
    );
  $$
);
