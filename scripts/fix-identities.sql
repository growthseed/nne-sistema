INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  ('580e566b-34b7-47e6-a1c3-62a32d36ef81', '580e566b-34b7-47e6-a1c3-62a32d36ef81', jsonb_build_object('sub', '580e566b-34b7-47e6-a1c3-62a32d36ef81', 'email', 'thiagobenicio61336@gmail.com'), 'email', '580e566b-34b7-47e6-a1c3-62a32d36ef81', now(), now(), now()),
  ('b2ff9706-0a72-4eaa-8c56-da3077d0072b', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b', jsonb_build_object('sub', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b', 'email', 'adrianocardoso2009@hotmail.com'), 'email', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b', now(), now(), now())
ON CONFLICT DO NOTHING;
