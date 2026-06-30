INSERT INTO organizations (name, legal_name, business_type)
VALUES ('Dynasty PropertyOS Demo', 'Shylow Thompson LLC', 'real_estate_technology')
ON CONFLICT DO NOTHING;

WITH org AS (SELECT id FROM organizations WHERE name = 'Dynasty PropertyOS Demo' LIMIT 1),
prop AS (
  INSERT INTO properties (organization_id, property_code, address, city, state, zip, property_type, sqft, beds, baths, status)
  SELECT id, 'PROP-USDA-001', 'USDA 1 Bedroom Prototype', 'Demo City', 'MO', '00000', 'single_family', 860, 1, 1, 'prototype'
  FROM org
  ON CONFLICT (property_code) DO UPDATE SET status = EXCLUDED.status
  RETURNING id
),
twin AS (
  INSERT INTO digital_twins (property_id, model_status, scale_unit)
  SELECT id, 'draft', 'feet' FROM prop
  RETURNING id, property_id
)
INSERT INTO rooms (property_id, digital_twin_id, room_name, room_type, floor_level, x, y, width, length, height, sqft)
SELECT property_id, id, 'Living Room', 'living', 'L1', 0, 0, 14, 16, 8, 224 FROM twin
UNION ALL SELECT property_id, id, 'Kitchen', 'kitchen', 'L1', 14, 0, 10, 12, 8, 120 FROM twin
UNION ALL SELECT property_id, id, 'Bedroom', 'bedroom', 'L1', 0, 16, 12, 12, 8, 144 FROM twin
UNION ALL SELECT property_id, id, 'Bathroom', 'bathroom', 'L1', 12, 16, 8, 8, 8, 64 FROM twin
UNION ALL SELECT property_id, id, 'Utility', 'utility', 'L1', 20, 12, 6, 8, 8, 48 FROM twin;
