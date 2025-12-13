-- ============================================
-- 🔥 SQL SUPABASE - VERSÃO FINAL CORRIGIDA
-- ============================================
-- Data: 13/12/2025
-- ✅ CORRIGIDO: Campo email adicionado em profiles
-- ✅ TESTADO: Compatível com backend e frontend
-- ============================================

-- ============================================
-- 0. RESET COMPLETO
-- ============================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

DROP TABLE IF EXISTS mqtt_data CASCADE;
DROP TABLE IF EXISTS access_requests CASCADE;
DROP TABLE IF EXISTS widgets CASCADE;
DROP TABLE IF EXISTS device_users CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- 1. EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. TABELAS
-- ============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    username TEXT NOT NULL,
    email TEXT, -- ✅ CORRIGIDO: Adicionado para facilitar queries
    role TEXT DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    has_access BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_has_access ON profiles(has_access);
CREATE INDEX idx_profiles_email ON profiles(email); -- ✅ Índice para email

CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mqtt_broker TEXT NOT NULL,
    mqtt_port INTEGER DEFAULT 1883,
    mqtt_topic TEXT NOT NULL,
    mqtt_username TEXT,
    mqtt_password TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_devices_name ON devices(name);
CREATE INDEX idx_devices_mqtt_topic ON devices(mqtt_topic);
CREATE INDEX idx_devices_owner ON devices(owner_id);

CREATE TABLE device_users (
    device_id UUID NOT NULL REFERENCES devices(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (device_id, user_id)
);

CREATE INDEX idx_device_users_user ON device_users(user_id);
CREATE INDEX idx_device_users_device ON device_users(device_id);

CREATE TABLE widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (
        type IN ('line', 'bar', 'gauge', 'table', 'card', 'pie', 'doughnut')
    ),
    config JSONB DEFAULT '{}',
    position JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (device_id, name, type)
);

CREATE INDEX idx_widgets_device ON widgets(device_id);
CREATE INDEX idx_widgets_type ON widgets(type);

CREATE TABLE access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    device_id UUID REFERENCES devices(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    message TEXT,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_access_requests_status ON access_requests(status);
CREATE INDEX idx_access_requests_user ON access_requests(user_id);
CREATE INDEX idx_access_requests_device ON access_requests(device_id);

CREATE TABLE mqtt_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    topic TEXT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mqtt_data_device ON mqtt_data(device_id);
CREATE INDEX idx_mqtt_data_received ON mqtt_data(received_at DESC);
CREATE INDEX idx_mqtt_data_device_received ON mqtt_data(device_id, received_at DESC);
CREATE INDEX idx_mqtt_data_payload ON mqtt_data USING GIN(payload);

-- ============================================
-- 3. FUNÇÕES AUXILIARES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin',
        false
    );
$$;

-- ✅ CORRIGIDO: Adicionado campo email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, role, has_access)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email, -- ✅ CORRIGIDO: Email agora é salvo
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        COALESCE((NEW.raw_user_meta_data->>'has_access')::boolean, false)
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. TRIGGERS
-- ============================================

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widgets_updated_at
BEFORE UPDATE ON widgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_requests_updated_at
BEFORE UPDATE ON access_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mqtt_data_updated_at
BEFORE UPDATE ON mqtt_data
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_data ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. POLICIES
-- ============================================

-- PROFILES
CREATE POLICY profiles_select_own ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY profiles_select_admin ON profiles FOR SELECT
USING (is_admin());

CREATE POLICY profiles_update_own ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND has_access = (SELECT has_access FROM profiles WHERE id = auth.uid())
);

CREATE POLICY profiles_update_admin ON profiles FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY profiles_insert_admin ON profiles FOR INSERT
WITH CHECK (is_admin());

-- DEVICES
CREATE POLICY devices_select ON devices FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM device_users
        WHERE device_users.device_id = devices.id
        AND device_users.user_id = auth.uid()
    )
    OR is_admin()
);

CREATE POLICY devices_insert_admin ON devices FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY devices_update_admin ON devices FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY devices_delete_admin ON devices FOR DELETE
USING (is_admin());

-- DEVICE_USERS
CREATE POLICY device_users_select ON device_users FOR SELECT
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY device_users_insert_admin ON device_users FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY device_users_update_admin ON device_users FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY device_users_delete_admin ON device_users FOR DELETE
USING (is_admin());

-- WIDGETS
CREATE POLICY widgets_select ON widgets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM device_users
        WHERE device_users.device_id = widgets.device_id
        AND device_users.user_id = auth.uid()
    )
    OR is_admin()
);

CREATE POLICY widgets_insert ON widgets FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM device_users
        WHERE device_users.device_id = widgets.device_id
        AND device_users.user_id = auth.uid()
    )
    OR is_admin()
);

CREATE POLICY widgets_update ON widgets FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM device_users
        WHERE device_users.device_id = widgets.device_id
        AND device_users.user_id = auth.uid()
    )
    OR is_admin()
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM device_users
        WHERE device_users.device_id = widgets.device_id
        AND device_users.user_id = auth.uid()
    )
    OR is_admin()
);

CREATE POLICY widgets_delete ON widgets FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM device_users
        WHERE device_users.device_id = widgets.device_id
        AND device_users.user_id = auth.uid()
    )
    OR is_admin()
);

-- ACCESS_REQUESTS
CREATE POLICY access_requests_select ON access_requests FOR SELECT
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY access_requests_insert ON access_requests FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND (device_id IS NULL OR EXISTS (SELECT 1 FROM devices WHERE id = device_id))
);

CREATE POLICY access_requests_update_admin ON access_requests FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY access_requests_delete_own ON access_requests FOR DELETE
USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY access_requests_delete_admin ON access_requests FOR DELETE
USING (is_admin());

-- MQTT_DATA
CREATE POLICY mqtt_data_select ON mqtt_data FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM device_users
        WHERE device_users.device_id = mqtt_data.device_id
        AND device_users.user_id = auth.uid()
    )
    OR is_admin()
);

CREATE POLICY mqtt_data_insert_service ON mqtt_data FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- ✅ SUCESSO!
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- Depois configure as variáveis .env:
--   Backend: SUPABASE_URL + SUPABASE_SERVICE_KEY
--   Frontend: REACT_APP_SUPABASE_URL + REACT_APP_SUPABASE_ANON_KEY
-- ============================================
