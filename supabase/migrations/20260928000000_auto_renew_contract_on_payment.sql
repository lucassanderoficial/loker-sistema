/*
  # Auto-renew contract immediately after payment

  Weekly renewal only ran once, via the `auto-renew-contracts-monday` cron
  job (Mondays at 04:00). A contract whose period already ended but whose
  payment only lands AFTER that job ran (e.g. paid later the same day, or
  any day during the week) stayed stuck on the old, already-expired period
  until the following Monday.

  Renewal should happen the moment a contract becomes fully paid, not just
  once a week: when a contract's payment_status flips to 'paid' and its
  current period has already ended, immediately run the same
  force_contract_renewal() used by the manual "Forçar Renovação" button
  and by the weekly job.

  1. New Function
    - `trigger_auto_renew_on_payment`: fires force_contract_renewal() right
      after a contract is marked as paid, if its period already ended and
      auto_renew is on. A renewal failure is caught and logged, never
      blocking the payment itself from being recorded.

  2. New Trigger
    - `auto_renew_on_payment_trigger` on contracts, AFTER UPDATE OF
      payment_status.
*/

CREATE OR REPLACE FUNCTION public.trigger_auto_renew_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS DISTINCT FROM 'paid')
     AND NEW.status = 'active'
     AND NEW.auto_renew = true
     AND NEW.end_date < (get_brasilia_time())::date
  THEN
    BEGIN
      PERFORM force_contract_renewal(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      -- A renewal failure must never block the payment itself from being
      -- recorded; surface it in the logs instead.
      RAISE WARNING 'Auto-renovação após pagamento falhou para o contrato %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_renew_on_payment_trigger ON contracts;
CREATE TRIGGER auto_renew_on_payment_trigger
  AFTER UPDATE OF payment_status ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_renew_on_payment();
