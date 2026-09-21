/*
  # Fix automatic contract renewal

  The weekly `auto-renew-contracts` Edge Function (triggered every Monday by
  the `auto-renew-contracts-monday` pg_cron job) was renewing contracts by
  mutating the existing row's dates in place. That is not how renewal is
  supposed to work: the same as the manual "Forçar Renovação" action, a
  renewal must finalize the current contract (status = 'finished') and open
  a brand new contract for the next period.

  `force_contract_renewal(uuid)` already does this correctly, but it can
  only be called by an authenticated user: it stamps `created_by` with
  `auth.uid()`, which is NULL when invoked by the automatic job (that job
  calls the Edge Function with the service role key, with no user session).
  Since `contracts.created_by` is NOT NULL, that call would fail.

  1. Changes
    - `force_contract_renewal`: fall back to the original contract's
      `created_by` when there is no authenticated user (automatic runs),
      so the same function that powers the manual action can also be
      called by the automatic weekly job.
    - `record_contract_status_change`: same fallback for the
      `vehicle_history` audit row written when a contract's status changes,
      so automatic finalizations keep an attributable audit trail.
*/

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

  -- Use Brasília's current date (not the DB's UTC date) as the reference.
  v_today := (get_brasilia_time())::date;

  -- Start date is Monday of THIS week (the week containing today), not the
  -- next upcoming Monday — force renewal continues the current week's
  -- rental, it does not schedule a future one.
  -- EXTRACT(DOW) is 0=Sunday..6=Saturday; this rolls back to that week's Monday.
  v_start_date := v_today - ((EXTRACT(DOW FROM v_today)::integer + 6) % 7);
  -- End date is the Sunday of that same week.
  v_end_date := v_start_date + 6;
  -- Due date is the following Monday.
  v_due_date := v_end_date + 1;

  -- Calculate total amount (7 days fixed period)
  v_total_amount := v_contract.daily_rate * 7;

  -- Begin transaction
  BEGIN
    -- 1. Finish current contract
    UPDATE contracts
    SET
      status = 'finished',
      updated_at = now()
    WHERE id = p_contract_id;

    -- 2. Create new contract
    INSERT INTO contracts (
      client_id,
      vehicle_id,
      deposit_id,
      start_date,
      end_date,
      auto_renew,
      daily_rate,
      total_amount,
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
      true, -- Keep auto_renew enabled
      v_contract.daily_rate,
      v_total_amount,
      v_due_date,
      'pending',
      'active',
      -- Falls back to the original contract's creator when there is no
      -- authenticated user, e.g. the automatic weekly renewal job.
      COALESCE(auth.uid(), v_contract.created_by)
    )
    RETURNING id INTO v_new_contract_id;

    -- 2b. Carry the most recent check-in inspection for this client+vehicle
    -- forward onto the new contract. A forced weekly renewal is a
    -- continuation of the same rental, not a new pickup, so it must not
    -- require a fresh /vistorias inspection. protocol_code is unique per
    -- row, so the carried-over copy gets a derived, still-unique code.
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

    -- 3. Create contract history record
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
      NULL, -- Payment date will be set when paid
      NULL, -- Payment method will be set when paid
      v_start_date,
      v_end_date,
      COALESCE(auth.uid(), v_contract.created_by)
    );

    -- 4. Ensure vehicle stays marked as rented
    UPDATE vehicles
    SET
      status = 'rented',
      updated_at = now()
    WHERE id = v_contract.vehicle_id;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_contract_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_client_name text;
  v_vehicle_info text;
  v_description text;
BEGIN
  -- Only proceed if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get client name
  SELECT name INTO v_client_name
  FROM clients
  WHERE id = NEW.client_id;

  -- Get vehicle info
  SELECT brand || ' ' || model || ' (' || plate || ')' INTO v_vehicle_info
  FROM vehicles
  WHERE id = NEW.vehicle_id;

  -- Create description based on status change
  v_description := 'Contrato ' ||
                  CASE NEW.status
                    WHEN 'active' THEN 'ativado'
                    WHEN 'finished' THEN 'finalizado'
                    WHEN 'cancelled' THEN 'cancelado'
                    ELSE NEW.status::text
                  END ||
                  ' para cliente ' || v_client_name;

  -- Insert history record
  INSERT INTO vehicle_history (
    vehicle_id,
    event_type,
    event_date,
    description,
    details,
    reference_id,
    reference_type,
    created_by
  ) VALUES (
    NEW.vehicle_id,
    'rental',
    now(),
    v_description,
    jsonb_build_object(
      'client_id', NEW.client_id,
      'client_name', v_client_name,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date
    ),
    NEW.id,
    'contract',
    -- Falls back to the contract's creator when there is no authenticated
    -- user, e.g. a status change made by the automatic renewal job.
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$function$;
