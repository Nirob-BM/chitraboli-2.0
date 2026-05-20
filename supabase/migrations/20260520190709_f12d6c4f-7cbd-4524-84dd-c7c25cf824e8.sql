
CREATE OR REPLACE FUNCTION public.prevent_user_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to change anything
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- For non-admins, lock down privileged fields by reverting to OLD values
  NEW.wallet_balance := OLD.wallet_balance;
  NEW.store_credit := OLD.store_credit;
  NEW.loyalty_tier := OLD.loyalty_tier;
  NEW.email_verified := OLD.email_verified;
  NEW.phone_verified := OLD.phone_verified;
  NEW.account_status := OLD.account_status;
  NEW.last_login_at := OLD.last_login_at;
  NEW.last_login_ip := OLD.last_login_ip;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_profile_privesc ON public.user_profiles;
CREATE TRIGGER prevent_user_profile_privesc
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_profile_privilege_escalation();
