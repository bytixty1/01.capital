DO $$
DECLARE
    v_user_id uuid;
    v_company_id uuid := gen_random_uuid();
    v_founder_id uuid := gen_random_uuid();
    v_investor_id uuid := gen_random_uuid();
BEGIN
    SELECT id INTO v_user_id FROM users WHERE email = 'ali.alghamdi.ps@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ali.alghamdi.ps@gmail.com not found';
    END IF;

    -- Create Company
    INSERT INTO companies (id, name_en, name_ar, entity_type, cr_number, status, authorized_capital, paid_up_capital, par_value_per_share, incorporation_date, fiscal_year_start, has_rofr, has_drag_tag, has_tag_along)
    VALUES (v_company_id, '01 Capital Mock Startup', 'شركة الصفر والواحد الوهمية', 'SJSC', '1010123456', 'active', 100000.00, 100000.00, 10.0000, '2023-01-01', 1, false, false, false);

    -- Add User to Company
    INSERT INTO company_members (id, company_id, user_id, role)
    VALUES (gen_random_uuid(), v_company_id, v_user_id, 'admin');

    -- Create Stakeholders
    INSERT INTO stakeholders (id, company_id, stakeholder_type, name_en, name_ar, email, nationality)
    VALUES (v_founder_id, v_company_id, 'natural_person', 'Ali Saleh Alghamdi', 'علي صالح الغامدي', 'ali.alghamdi.ps@gmail.com', 'SAU');

    INSERT INTO stakeholders (id, company_id, stakeholder_type, name_en, name_ar, cr_number)
    VALUES (v_investor_id, v_company_id, 'legal_entity', '01 Ventures', 'مشاريع 01', '1010987654');

    -- Create Cap Table Events
    INSERT INTO cap_table_events (id, company_id, event_type, event_date, payload, is_draft, created_by)
    VALUES (gen_random_uuid(), v_company_id, 'issue', '2023-01-15', jsonb_build_object('stakeholder_id', v_founder_id, 'share_class', 'ordinary', 'quantity', 8000, 'price_per_share', 10.00, 'pre_money_valuation', 0), false, v_user_id);

    INSERT INTO cap_table_events (id, company_id, event_type, event_date, payload, is_draft, created_by)
    VALUES (gen_random_uuid(), v_company_id, 'issue', '2023-06-01', jsonb_build_object('stakeholder_id', v_investor_id, 'share_class', 'ordinary', 'quantity', 2000, 'price_per_share', 50.00, 'pre_money_valuation', 400000), false, v_user_id);

    -- Create Holdings
    INSERT INTO holdings (id, company_id, stakeholder_id, share_class, quantity)
    VALUES (gen_random_uuid(), v_company_id, v_founder_id, 'ordinary', 8000);

    INSERT INTO holdings (id, company_id, stakeholder_id, share_class, quantity)
    VALUES (gen_random_uuid(), v_company_id, v_investor_id, 'ordinary', 2000);

    -- Create an Instrument (e.g., Convertible Note)
    INSERT INTO instruments (id, company_id, stakeholder_id, instrument_type, name, face_value, quantity, issue_date, terms, status)
    VALUES (gen_random_uuid(), v_company_id, v_investor_id, 'sukuk_convertible', 'Seed SAFE', 100000.00, 1.0000, '2023-12-01', '{"valuation_cap": 5000000}', 'active');

END $$;
