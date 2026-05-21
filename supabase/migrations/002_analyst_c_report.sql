-- Add Analyst C (player screening) report column
alter table public.ai_analyses add column if not exists analyst_c_report text;

-- Update upsert_analysis RPC with analyst_c_report parameter
create or replace function public.upsert_analysis(
  p_fixture_id bigint,
  p_total_goals_prediction text,
  p_total_goals_confidence real,
  p_btts_prediction text,
  p_btts_confidence real,
  p_winner_prediction text,
  p_winner_confidence real,
  p_first_half_goals_prediction text,
  p_first_half_goals_confidence real,
  p_lambda_home real,
  p_lambda_away real,
  p_confidence_interval_low real,
  p_confidence_interval_high real,
  p_chairman_signed boolean default false,
  p_analyst_a_report text default null,
  p_analyst_b_report text default null,
  p_chairman_report text default null,
  p_analyst_c_report text default null
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  insert into public.ai_analyses (
    fixture_id, total_goals_prediction, total_goals_confidence,
    btts_prediction, btts_confidence,
    winner_prediction, winner_confidence,
    first_half_goals_prediction, first_half_goals_confidence,
    lambda_home, lambda_away,
    confidence_interval_low, confidence_interval_high,
    chairman_signed, analyst_a_report, analyst_b_report, chairman_report, analyst_c_report
  ) values (
    p_fixture_id, p_total_goals_prediction, p_total_goals_confidence,
    p_btts_prediction, p_btts_confidence,
    p_winner_prediction, p_winner_confidence,
    p_first_half_goals_prediction, p_first_half_goals_confidence,
    p_lambda_home, p_lambda_away,
    p_confidence_interval_low, p_confidence_interval_high,
    p_chairman_signed, p_analyst_a_report, p_analyst_b_report, p_chairman_report, p_analyst_c_report
  )
  on conflict (fixture_id) do update set
    total_goals_prediction = excluded.total_goals_prediction,
    total_goals_confidence = excluded.total_goals_confidence,
    btts_prediction = excluded.btts_prediction,
    btts_confidence = excluded.btts_confidence,
    winner_prediction = excluded.winner_prediction,
    winner_confidence = excluded.winner_confidence,
    first_half_goals_prediction = excluded.first_half_goals_prediction,
    first_half_goals_confidence = excluded.first_half_goals_confidence,
    lambda_home = excluded.lambda_home,
    lambda_away = excluded.lambda_away,
    confidence_interval_low = excluded.confidence_interval_low,
    confidence_interval_high = excluded.confidence_interval_high,
    chairman_signed = excluded.chairman_signed,
    analyst_a_report = coalesce(excluded.analyst_a_report, ai_analyses.analyst_a_report),
    analyst_b_report = coalesce(excluded.analyst_b_report, ai_analyses.analyst_b_report),
    chairman_report = coalesce(excluded.chairman_report, ai_analyses.chairman_report),
    analyst_c_report = coalesce(excluded.analyst_c_report, ai_analyses.analyst_c_report),
    updated_at = now()
  returning row_to_json(ai_analyses)::jsonb into v_result;
  return v_result;
end;
$$;
