-- 声形绘 SoundShape 初始化数据库（文档第八节原文）
-- 严格按文档：UUID / JSONB / TIMESTAMPTZ

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE play_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instrument VARCHAR(50) NOT NULL,
  notes_played JSONB,
  duration_sec INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tuning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instrument VARCHAR(50) NOT NULL,
  target_note VARCHAR(10),
  measured_freq FLOAT,
  deviation_cents FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  instrument VARCHAR(50) NOT NULL,
  shapes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
