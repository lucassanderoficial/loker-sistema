/*
  # Fix late fee calculation falling back to zero (WhatsApp "valor atualizado")

  The 08h/16h overdue WhatsApp reminders (whatsapp-overdue-reminders Edge
  Function) compute the late fee live via calculate_contract_late_fees()
  and send it as "Valor Total Atualizado". That function caps the late fee
  with `LEAST(raw_late_fee, base_amount)` — but `base_amount` is never set
  anywhere (not in ContractForm's insert, not in force_contract_renewal's
  insert), so it sits at its column default of 0 for the vast majority of
  contracts. LEAST(raw_late_fee, 0) is always 0, so the late fee — and the
  "updated value" sent to the client — silently comes out as 0 added, no
  matter how many days overdue. 15 of the 17 currently unpaid active
  contracts have base_amount unset.

  update_late_fees_for_pending_contracts() (the batch job that persists
  late fees onto contracts.total_amount) has the same problem one level up:
  it explicitly skips every contract with `base_amount > 0`, i.e. it skips
  exactly the contracts that need the fallback.

  1. Changes
    - `calculate_contract_late_fees`: fall back to `total_amount` as the
      base when `base_amount` is NULL or 0 (mirrors the fallback already
      used correctly by the asaas-create-pix Edge Function that generates
      the client's PIX charge).
    - `update_late_fees_for_pending_contracts`: process contracts whose
      base is available via that same fallback, not just base_amount > 0.
    - `force_contract_renewal`: set `base_amount` on the new contract it
      creates, so future renewals stop reproducing this gap.
    - One-time backfill: set `base_amount = total_amount` for existing
      active/finished contracts that never had it set.
*/

CREATE OR REPLACE FUNCTION public.calculate_contract_late_fees(p_contract_id uuid, p_current_time timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(days_overdue integer, late_fee_amount numeric, total_amount numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_contract record;
v_brasilia_time timestamptz;
v_due_datetime timestamptz;
v_days_overdue integer;
v_raw_late_fee decimal(10,2);
v_late_fee decimal(10,2);
v_total decimal(10,2);
v_base_amount decimal(10,2);
BEGIN
-- Obter horário de Brasília
v_brasilia_time := COALESCE(p_current_time, get_brasilia_time());

-- Buscar dados do contrato
SELECT
c.id,
c.due_date,
c.base_amount,
c.total_amount,
c.daily_rate,
c.payment_status,
c.status,
c.late_fee_days,
c.late_fee_amount
INTO v_contract
FROM contracts c
WHERE c.id = p_contract_id;

-- Se contrato não existe, retornar zeros
IF NOT FOUND THEN
RETURN QUERY SELECT 0, 0.00::decimal(10,2), 0.00::decimal(10,2);
RETURN;
END IF;

-- Valor original do período: base_amount quando definido, senão
-- total_amount (base_amount não é preenchido em todo contrato).
v_base_amount := COALESCE(NULLIF(v_contract.base_amount, 0), v_contract.total_amount, 0.00);

-- Se já foi pago ou cancelado, retornar zeros
IF v_contract.payment_status IN ('paid', 'cancelled') THEN
RETURN QUERY SELECT 0, 0.00::decimal(10,2), v_base_amount;
RETURN;
END IF;

-- Se não está ativo nem finalizado, retornar zeros
IF v_contract.status NOT IN ('active', 'finished') THEN
RETURN QUERY SELECT 0, 0.00::decimal(10,2), v_base_amount;
RETURN;
END IF;

-- Calcular data/hora de vencimento (17h do dia de vencimento em Brasília)
v_due_datetime := (v_contract.due_date || ' 17:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';

-- Se ainda não passou do horário de vencimento, sem acréscimos
IF v_brasilia_time <= v_due_datetime THEN
RETURN QUERY SELECT 0, 0.00::decimal(10,2), v_base_amount;
RETURN;
END IF;

-- Calcular dias de atraso completos (após 17h) - sem limite fixo de dias
v_days_overdue := FLOOR(EXTRACT(EPOCH FROM (v_brasilia_time - v_due_datetime)) / 86400)::integer;

-- Se passou das 17h mas ainda não completou 1 dia, considerar 1 dia
IF v_days_overdue = 0 AND v_brasilia_time > v_due_datetime THEN
v_days_overdue := 1;
END IF;

-- Calcular valor bruto do acréscimo (dias * diária)
v_raw_late_fee := v_days_overdue * v_contract.daily_rate;

-- Aplicar o teto: juros não pode ultrapassar o valor original (máximo = dobro do valor)
v_late_fee := LEAST(v_raw_late_fee, v_base_amount);

-- Se atingiu o teto, ajustar o número de dias para refletir o máximo cobrado
IF v_late_fee >= v_base_amount AND v_contract.daily_rate > 0 THEN
v_days_overdue := FLOOR(v_base_amount / v_contract.daily_rate)::integer;
v_late_fee := v_base_amount;
END IF;

-- Calcular total (base + acréscimo)
v_total := v_base_amount + v_late_fee;

-- Retornar resultado
RETURN QUERY SELECT v_days_overdue, v_late_fee, v_total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_late_fees_for_pending_contracts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_contract record;
v_late_fee_data record;
v_updated_count integer := 0;
v_brasilia_time timestamptz;
BEGIN
-- Obter horário de Brasília uma vez para todos os contratos
v_brasilia_time := get_brasilia_time();

-- Processar contratos ativos e não pagos com um valor base disponível
-- (base_amount quando definido, senão total_amount)
FOR v_contract IN
SELECT id, base_amount, daily_rate, due_date, late_fee_days, late_fee_amount
FROM contracts
WHERE status = 'active'
AND payment_status IN ('pending', 'overdue')
AND COALESCE(NULLIF(base_amount, 0), total_amount, 0) > 0
LOOP
-- Calcular acréscimos para este contrato
SELECT * INTO v_late_fee_data
FROM calculate_contract_late_fees(v_contract.id, v_brasilia_time);

-- Se houve mudança nos acréscimos, atualizar
IF v_late_fee_data.days_overdue != COALESCE(v_contract.late_fee_days, 0)
OR v_late_fee_data.late_fee_amount != COALESCE(v_contract.late_fee_amount, 0) THEN

-- Atualizar contrato
UPDATE contracts
SET
late_fee_days = v_late_fee_data.days_overdue,
late_fee_amount = v_late_fee_data.late_fee_amount,
total_amount = v_late_fee_data.total_amount,
calculated_at = v_brasilia_time,
payment_status = CASE
WHEN v_late_fee_data.days_overdue > 0 THEN 'overdue'::payment_status
ELSE payment_status
END
WHERE id = v_contract.id;

-- Registrar no histórico se há acréscimos
IF v_late_fee_data.days_overdue > 0 THEN
INSERT INTO contract_late_fee_history (
contract_id,
calculation_date,
brasilia_time,
due_date,
days_overdue,
daily_rate,
late_fee_amount
) VALUES (
v_contract.id,
now(),
v_brasilia_time,
v_contract.due_date,
v_late_fee_data.days_overdue,
v_contract.daily_rate,
v_late_fee_data.late_fee_amount
);
END IF;

v_updated_count := v_updated_count + 1;
END IF;
END LOOP;

RETURN v_updated_count;
END;
$function$;

-- force_contract_renewal creates a brand new contract for the next period;
-- stamp base_amount on it too so future renewals stop reproducing this gap.
CREATE OR REPLACE FUNCTION public.force_contract_renewal(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_contract record;
  v_today date;
  v_start_date date;
  v_end_date date;
  v_due_date date;
  v_total_amount decimal(10,2);
  v_new_contract_id uuid;
BEGIN
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;

  IF v_contract.status != 'active' THEN
    RAISE EXCEPTION 'Apenas contratos ativos podem ser renovados';
  END IF;

  IF NOT v_contract.auto_renew THEN
    RAISE EXCEPTION 'Este contrato não possui auto renovação ativada';
  END IF;

  v_today := (get_brasilia_time())::date;
  v_start_date := v_today - ((EXTRACT(DOW FROM v_today)::integer + 6) % 7);
  v_end_date := v_start_date + 6;
  v_due_date := v_end_date + 1;

  v_total_amount := v_contract.daily_rate * 7;

  BEGIN
    UPDATE contracts
    SET
      status = 'finished',
      updated_at = now()
    WHERE id = p_contract_id;

    INSERT INTO contracts (
      client_id,
      vehicle_id,
      deposit_id,
      start_date,
      end_date,
      auto_renew,
      daily_rate,
      total_amount,
      base_amount,
      due_date,
      payment_status,
      status,
      created_by
    ) VALUES (
      v_contract.client_id,
      v_contract.vehicle_id,
      v_contract.deposit_id,
      v_start_date,
      v_end_date,
      true,
      v_contract.daily_rate,
      v_total_amount,
      -- Base value for this new period, before any late fee accrues.
      v_total_amount,
      v_due_date,
      'pending',
      'active',
      COALESCE(auth.uid(), v_contract.created_by)
    )
    RETURNING id INTO v_new_contract_id;

    INSERT INTO vehicle_inspections (
      contract_id, vehicle_id, client_id, inspection_date, fuel_level, mileage,
      exterior_condition, interior_condition, accessories, observations, photos,
      created_by, type, cleanliness, oil_change_sticker, company_sticker,
      battery_photo, tire_front_left_photo, tire_front_right_photo,
      tire_back_left_photo, tire_back_right_photo, spare_tire_photo,
      left_side_photo, right_side_photo, front_photo, back_photo, body_damage,
      video_url, engine_photo, jack_kit_photo, dashboard_photo, status,
      inspector_signature, damage_photos, device_info, device_phone,
      verification_hash, protocol_code, is_internal
    )
    SELECT
      v_new_contract_id, vi.vehicle_id, vi.client_id, vi.inspection_date, vi.fuel_level, vi.mileage,
      vi.exterior_condition, vi.interior_condition, vi.accessories,
      concat_ws(' ', vi.observations, '[Vistoria mantida automaticamente na renovação semanal — origem: contrato ' || p_contract_id || ']'),
      vi.photos, vi.created_by, vi.type, vi.cleanliness, vi.oil_change_sticker, vi.company_sticker,
      vi.battery_photo, vi.tire_front_left_photo, vi.tire_front_right_photo,
      vi.tire_back_left_photo, vi.tire_back_right_photo, vi.spare_tire_photo,
      vi.left_side_photo, vi.right_side_photo, vi.front_photo, vi.back_photo, vi.body_damage,
      vi.video_url, vi.engine_photo, vi.jack_kit_photo, vi.dashboard_photo, vi.status,
      vi.inspector_signature, vi.damage_photos, vi.device_info, vi.device_phone,
      vi.verification_hash,
      COALESCE(vi.protocol_code, 'VIS') || '-R' || substr(v_new_contract_id::text, 1, 8),
      vi.is_internal
    FROM vehicle_inspections vi
    WHERE vi.vehicle_id = v_contract.vehicle_id
      AND vi.client_id = v_contract.client_id
      AND vi.type = 'checkin'
    ORDER BY vi.created_at DESC
    LIMIT 1;

    INSERT INTO contract_payments (
      contract_id,
      amount,
      payment_date,
      payment_method,
      period_start,
      period_end,
      created_by
    ) VALUES (
      v_new_contract_id,
      v_total_amount,
      NULL,
      NULL,
      v_start_date,
      v_end_date,
      COALESCE(auth.uid(), v_contract.created_by)
    );

    UPDATE vehicles
    SET
      status = 'rented',
      updated_at = now()
    WHERE id = v_contract.vehicle_id;
  END;
END;
$function$;

-- One-time backfill: contracts that never had base_amount set (0 or NULL)
-- keep their original total_amount as the base for late-fee purposes.
UPDATE contracts
SET base_amount = total_amount
WHERE status IN ('active', 'finished')
  AND (base_amount IS NULL OR base_amount = 0)
  AND total_amount > 0;

-- Refresh persisted late fees now, so contracts.total_amount and
-- payment_status are consistent immediately, not just the next time
-- something recalculates on the fly.
SELECT update_late_fees_for_pending_contracts();
