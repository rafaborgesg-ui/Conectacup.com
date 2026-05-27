-- Adiciona coluna car_generation para armazenar o modelo do carro (992.1, 991.2, 991.1)
-- Adiciona coluna warping_level para armazenar o nível de empenamento (N1, N2)
-- Data: 2025-02-10

-- Adiciona coluna car_generation (modelo/geração do carro)
ALTER TABLE wheel_damage_occurrences 
ADD COLUMN IF NOT EXISTS car_generation TEXT;

-- Adiciona coluna warping_level (nível de empenamento para avarias tipo "empenada")
ALTER TABLE wheel_damage_occurrences 
ADD COLUMN IF NOT EXISTS warping_level TEXT;

-- Adiciona comentários nas colunas para documentação
COMMENT ON COLUMN wheel_damage_occurrences.car_generation IS 'Modelo/geração do carro (ex: 992.1, 991.2, 991.1)';
COMMENT ON COLUMN wheel_damage_occurrences.warping_level IS 'Nível de empenamento quando damage_type = empenada (N1 ou N2)';

-- Verifica se as colunas foram criadas
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'wheel_damage_occurrences' 
        AND column_name = 'car_generation'
    ) THEN
        RAISE NOTICE '✅ Coluna car_generation criada com sucesso';
    ELSE
        RAISE EXCEPTION '❌ Erro: Coluna car_generation não foi criada';
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'wheel_damage_occurrences' 
        AND column_name = 'warping_level'
    ) THEN
        RAISE NOTICE '✅ Coluna warping_level criada com sucesso';
    ELSE
        RAISE EXCEPTION '❌ Erro: Coluna warping_level não foi criada';
    END IF;
END $$;
