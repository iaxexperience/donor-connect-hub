-- Function to import donors handling both email and document_id unique constraints
CREATE OR REPLACE FUNCTION import_donors_safe(donors jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  donor jsonb;
  existing_id integer;
  inserted_count integer := 0;
  updated_count integer := 0;
BEGIN
  FOR donor IN SELECT * FROM jsonb_array_elements(donors)
  LOOP
    BEGIN
      -- Find existing donor by email OR document_id
      SELECT id INTO existing_id
      FROM donors
      WHERE
        (donor->>'email' IS NOT NULL AND email = donor->>'email')
        OR (donor->>'document_id' IS NOT NULL AND document_id = donor->>'document_id')
      LIMIT 1;

      IF existing_id IS NOT NULL THEN
        UPDATE donors SET
          name         = COALESCE(NULLIF(donor->>'name', ''), name),
          email        = COALESCE(NULLIF(donor->>'email', ''), email),
          phone        = COALESCE(NULLIF(donor->>'phone', ''), phone),
          document_id  = COALESCE(NULLIF(donor->>'document_id', ''), document_id),
          type         = COALESCE(NULLIF(donor->>'type', ''), type::text)::donor_type,
          birth_date   = CASE WHEN donor->>'birth_date' IS NOT NULL THEN (donor->>'birth_date')::date ELSE birth_date END,
          zip_code     = COALESCE(NULLIF(donor->>'zip_code', ''), zip_code),
          address      = COALESCE(NULLIF(donor->>'address', ''), address),
          address_number = COALESCE(NULLIF(donor->>'address_number', ''), address_number),
          complement   = COALESCE(NULLIF(donor->>'complement', ''), complement),
          neighborhood = COALESCE(NULLIF(donor->>'neighborhood', ''), neighborhood),
          city         = COALESCE(NULLIF(donor->>'city', ''), city),
          state        = COALESCE(NULLIF(donor->>'state', ''), state)
        WHERE id = existing_id;
        updated_count := updated_count + 1;
      ELSE
        INSERT INTO donors (name, email, phone, document_id, type, birth_date,
          zip_code, address, address_number, complement, neighborhood, city, state,
          total_donated, donation_count)
        VALUES (
          COALESCE(NULLIF(donor->>'name', ''), 'Doador sem Nome'),
          NULLIF(donor->>'email', ''),
          COALESCE(NULLIF(donor->>'phone', ''), ''),
          NULLIF(donor->>'document_id', ''),
          COALESCE(NULLIF(donor->>'type', ''), 'lead')::donor_type,
          CASE WHEN donor->>'birth_date' IS NOT NULL AND donor->>'birth_date' != '' THEN (donor->>'birth_date')::date ELSE NULL END,
          NULLIF(donor->>'zip_code', ''),
          NULLIF(donor->>'address', ''),
          NULLIF(donor->>'address_number', ''),
          NULLIF(donor->>'complement', ''),
          NULLIF(donor->>'neighborhood', ''),
          NULLIF(donor->>'city', ''),
          NULLIF(donor->>'state', ''),
          0,
          0
        );
        inserted_count := inserted_count + 1;
      END IF;

    EXCEPTION WHEN others THEN
      -- Skip this donor and continue
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('inserted', inserted_count, 'updated', updated_count);
END;
$$;

GRANT EXECUTE ON FUNCTION import_donors_safe(jsonb) TO authenticated;
