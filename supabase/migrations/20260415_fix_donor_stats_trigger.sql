-- ============================================================
-- Migration: Automatic Donor Stats & Classification Triggers
-- ============================================================

-- 1. Function to recalculate stats for a specific donor
CREATE OR REPLACE FUNCTION fn_recalculate_donor_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_donor_id UUID;
BEGIN
    -- Determine which donor to update
    IF (TG_OP = 'DELETE') THEN
        v_donor_id := OLD.donor_id;
    ELSE
        v_donor_id := NEW.donor_id;
    END IF;

    -- If there's a donor_id to update
    IF v_donor_id IS NOT NULL THEN
        UPDATE donors
        SET
            total_donated = (
                SELECT COALESCE(SUM(amount), 0)
                FROM donations
                WHERE donor_id = v_donor_id AND status = 'pago'
            ),
            donation_count = (
                SELECT COUNT(*)
                FROM donations
                WHERE donor_id = v_donor_id AND status = 'pago'
            ),
            last_donation_date = (
                SELECT MAX(donation_date)
                FROM donations
                WHERE donor_id = v_donor_id AND status = 'pago'
            ),
            type = CASE
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = v_donor_id AND status = 'pago') >= 5 THEN 'recorrente'::donor_type
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = v_donor_id AND status = 'pago') >= 2 THEN 'esporadico'::donor_type
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = v_donor_id AND status = 'pago') = 1 THEN 'unico'::donor_type
                ELSE 'lead'::donor_type
            END
        WHERE id::text = v_donor_id::text;
    END IF;

    -- If this was an UPDATE of donor_id, also update the OLD donor
    IF (TG_OP = 'UPDATE' AND OLD.donor_id IS NOT NULL AND OLD.donor_id != NEW.donor_id) THEN
        UPDATE donors
        SET
            total_donated = (
                SELECT COALESCE(SUM(amount), 0)
                FROM donations
                WHERE donor_id = OLD.donor_id AND status = 'pago'
            ),
            donation_count = (
                SELECT COUNT(*)
                FROM donations
                WHERE donor_id = OLD.donor_id AND status = 'pago'
            ),
            last_donation_date = (
                SELECT MAX(donation_date)
                FROM donations
                WHERE donor_id = OLD.donor_id AND status = 'pago'
            ),
            type = CASE
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = OLD.donor_id AND status = 'pago') >= 5 THEN 'recorrente'::donor_type
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = OLD.donor_id AND status = 'pago') >= 2 THEN 'esporadico'::donor_type
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = OLD.donor_id AND status = 'pago') = 1 THEN 'unico'::donor_type
                ELSE 'lead'::donor_type
            END
        WHERE id::text = OLD.donor_id::text;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS tr_on_donation_change ON donations;
CREATE TRIGGER tr_on_donation_change
AFTER INSERT OR UPDATE OR DELETE ON donations
FOR EACH ROW
EXECUTE FUNCTION fn_recalculate_donor_stats();

-- 3. MASS RECALCULATION: Fix all existing donors
DO $$
DECLARE
    d RECORD;
BEGIN
    FOR d IN SELECT id FROM donors LOOP
        UPDATE donors
        SET
            total_donated = (
                SELECT COALESCE(SUM(amount), 0)
                FROM donations
                WHERE donor_id = d.id AND status = 'pago'
            ),
            donation_count = (
                SELECT COUNT(*)
                FROM donations
                WHERE donor_id = d.id AND status = 'pago'
            ),
            last_donation_date = (
                SELECT MAX(donation_date)
                FROM donations
                WHERE donor_id = d.id AND status = 'pago'
            ),
            type = CASE
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = d.id AND status = 'pago') >= 5 THEN 'recorrente'::donor_type
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = d.id AND status = 'pago') >= 2 THEN 'esporadico'::donor_type
                WHEN (SELECT COUNT(*) FROM donations WHERE donor_id = d.id AND status = 'pago') = 1 THEN 'unico'::donor_type
                ELSE 'lead'::donor_type
            END
        WHERE id = d.id;
    END LOOP;
END $$;
