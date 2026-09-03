import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Upload, ArrowLeft } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { getMasterData } from '../utils/storage';
import ImageEditor from './ImageEditor';
import { createWatermarkData, type WatermarkData } from '../utils/watermarkGenerator';
import { uploadMultipleDamagePhotos } from '../utils/wheelDamageStorage';

interface NovaAvariaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Season {
  id: string;
  name: string;
}

interface SeasonStage {
  id: string;
  name: string;
  season_id: string;
}

interface TireModel {
  id: string;
  name: string;
}

interface Driver {
  id: string;
  chassis_number: string;
  driver_name: string;
  driver_number: string;
  season_id: string;
  stage_id: string;
  generation_id: string;
  categoria?: string; // Adicionado campo categoria
  classe?: string; // Adicionado campo classe
}

interface CategoryWithGeneration {
  name: string;
  generation: string;
}

export default function NovaAvariaModal({ isOpen, onClose, onSave }: NovaAvariaModalProps) {
  const supabase = createClient();
  
  // Estados do formulário
  const [incidentDate, setIncidentDate] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // Mudado de selectedModel para selectedCategory
  const [carGeneration, setCarGeneration] = useState(''); // 🆕 Estado para geração/modelo do carro (992.1, 991.2, 991.1)
  const [selectedChassis, setSelectedChassis] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverNumber, setDriverNumber] = useState('');
  const [classe, setClasse] = useState(''); // Campo classe do piloto/chassis
  const [session, setSession] = useState('');
  const [wheelPosition, setWheelPosition] = useState('');
  const [wheelColor, setWheelColor] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [damageType, setDamageType] = useState('');
  const [warpingLevel, setWarpingLevel] = useState(''); // 🆕 Nível de empenamento
  const [actionTaken, setActionTaken] = useState('');
  const [destination, setDestination] = useState('INDEFINIDO');
  const [observations, setObservations] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  
  // 🆕 Estado para o próximo código de ocorrência
  const [nextCode, setNextCode] = useState<string>('');
  
  // Estados do ImageEditor
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [currentEditingImage, setCurrentEditingImage] = useState<File | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]); // Fila de fotos para processar
  const [currentWatermarkData, setCurrentWatermarkData] = useState<WatermarkData | null>(null); // Armazena os dados da marca d'água
  
  // Listas para selects
  const [stages, setStages] = useState<SeasonStage[]>([]);
  const [models, setModels] = useState<TireModel[]>([]);
  const [categories, setCategories] = useState<CategoryWithGeneration[]>([]); // Mudado para incluir geração
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  
  // Estado de validação
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      loadNextCode(); // 🆕 Carrega o próximo código ao abrir
    }
  }, [isOpen]);

  useEffect(() => {
    // Quando a etapa ou categoria mudam, recarrega os chassis confirmados
    // Importante: só executa se stages já estiver carregado
    if (selectedStage && selectedCategory && stages.length > 0) {
      loadConfirmedChassis(selectedStage, selectedCategory);
    } else {
      setFilteredDrivers([]);
      setSelectedChassis('');
      setDriverName('');
      setDriverNumber('');
    }
  }, [selectedStage, selectedCategory, stages]); // Adiciona stages como dependência

  useEffect(() => {
    // Preenche dados do piloto automaticamente quando chassi é selecionado
    if (selectedChassis) {
      const driver = filteredDrivers.find(d => d.id === selectedChassis);
      if (driver) {
        setDriverName(driver.driver_name);
        setDriverNumber(driver.driver_number);
        setClasse(driver.classe || '');
      }
    }
  }, [selectedChassis, filteredDrivers]);

  // useEffect para processar as fotos pendentes
  useEffect(() => {
    if (pendingPhotos.length > 0 && !isImageEditorOpen && !currentEditingImage) {
      // Pega a primeira foto da fila
      const nextPhoto = pendingPhotos[0];
      setCurrentEditingImage(nextPhoto);
      
      // Gera watermark data
      getWatermarkDataSync().then(data => {
        setCurrentWatermarkData(data);
        setIsImageEditorOpen(true);
      });
    }
  }, [pendingPhotos, isImageEditorOpen, currentEditingImage]);

  async function loadInitialData() {
    try {
      // Carrega etapas da temporada ativa
      const { data: seasonData, error: seasonError } = await supabase
        .from('seasons')
        .select('*')
        .eq('status', 'active')
        .single();

      if (seasonError) {
        console.error('❌ Erro ao carregar temporada:', seasonError);
      }

      if (seasonData) {
        const { data: stagesData, error: stagesError } = await supabase
          .from('season_stages')
          .select('*')
          .eq('season_id', seasonData.id)
          .order('start_date', { ascending: true });

        if (stagesError) {
          console.error('❌ Erro ao carregar etapas:', stagesError);
        }

        setStages(stagesData || []);
        console.log('✅ Etapas carregadas:', stagesData?.length || 0);
      }

      // Carrega modelos de pneus
      const { data: modelsData, error: modelsError } = await supabase
        .from('tire_models')
        .select('*')
        .order('name');

      if (modelsError) {
        console.error('❌ Erro ao carregar modelos de pneus:', modelsError);
      } else {
        console.log('✅ Modelos de pneus carregados:', modelsData?.length || 0);
      }

      setModels(modelsData || []);

      // Carrega todos os chassis ativos com informações de piloto
      const { data: driversData, error: driversError } = await supabase
        .from('chassis')
        .select('*')
        .eq('ativo', true);

      if (driversError) {
        console.error('❌ Erro ao carregar chassis/motoristas:', driversError);
      } else {
        // Transforma os dados de chassis no formato esperado pelo componente
        const formattedDrivers = (driversData || []).map(chassis => ({
          id: chassis.id,
          chassis_number: chassis.codigo,
          driver_name: '', // Será preenchido manualmente
          driver_number: '', // Será preenchido manualmente
          season_id: '', // Não usado neste contexto
          stage_id: '', // Não usado - filtraremos por categoria
          generation_id: chassis.geracao || '',
          categoria: chassis.categoria || '' // Adiciona categoria do chassis
        }));

        setDrivers(formattedDrivers);
        console.log('✅ Chassis carregados:', formattedDrivers.length);
      }

      // Carrega categorias da temporada para obter o mapeamento categoria -> geração
      const { data: seasonCategoriesData, error: seasonCategoriesError } = await supabase
        .from('season_categories')
        .select('*');

      // Cria mapeamento de categoria -> geração (car_model)
      const categoryGenerationMap = new Map<string, string>();
      if (seasonCategoriesData) {
        seasonCategoriesData.forEach(sc => {
          if (sc.category_name && sc.car_model) {
            categoryGenerationMap.set(sc.category_name, sc.car_model);
          }
        });
        console.log('✅ Mapeamento categoria -> geração:', Object.fromEntries(categoryGenerationMap));
      }

      // Carrega categorias do Master Data e adiciona a geração
      try {
        const masterData = await getMasterData();
        const categoriaData = masterData['categoria'] || [];
        const categoriasComGeracao = categoriaData.map((item: any) => ({
          name: item.name,
          generation: categoryGenerationMap.get(item.name) || ''
        }));
        setCategories(categoriasComGeracao);
        console.log('✅ Categorias carregadas com gerações:', categoriasComGeracao);
      } catch (error) {
        console.error('❌ Erro ao carregar categorias:', error);
        setCategories([]);
      }

    } catch (error) {
      console.error('❌ Erro geral ao carregar dados:', error);
    }
  }

  async function loadNextCode() {
    try {
      const { data: lastRecord } = await supabase
        .from('wheel_damage_occurrences')
        .select('line_code')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const lastCode = lastRecord?.line_code;
      console.log('🔍 Último código registrado:', lastCode || 'nenhum');
      
      if (lastCode) {
        // Extrai o número sequencial (ex: "L01" -> 1, "L23" -> 23)
        const match = lastCode.match(/L(\d+)/);
        const lastNumber = match ? parseInt(match[1]) : 0;
        const nextNumber = lastNumber + 1;
        // Formata com zero à esquerda (mínimo 2 dígitos)
        setNextCode(`L${nextNumber.toString().padStart(2, '0')}`);
      } else {
        setNextCode('L01');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar o próximo código:', error);
      setNextCode('L01');
    }
  }

  async function loadConfirmedChassis(stageId: string, categoryName: string) {
    try {
      console.log('🔍 Buscando chassis confirmados para etapa:', stageId, 'e categoria:', categoryName);
      console.log('📋 Etapas disponíveis:', stages.map(s => ({ id: s.id, name: s.name })));

      // Busca o nome da etapa
      const stage = stages.find(s => s.id === stageId);
      if (!stage) {
        console.error('❌ Etapa não encontrada no array de stages');
        console.error('   Stage ID buscado:', stageId);
        console.error('   Stages disponíveis:', stages);
        setFilteredDrivers([]);
        return;
      }

      console.log('✅ Etapa encontrada:', stage.name);

      // Busca sessões de conferência finalizadas (tire_check_sessions)
      const { data: finishedSessions, error: finishedError } = await supabase
        .from('tire_check_sessions')
        .select('*')
        .eq('stage_name', stage.name);

      if (finishedError) {
        console.error('❌ Erro ao buscar tire_check_sessions:', finishedError);
      } else {
        console.log('✅ tire_check_sessions encontradas:', finishedSessions?.length || 0);
        if (finishedSessions && finishedSessions.length > 0) {
          console.log('📄 Primeira sessão encontrada:', finishedSessions[0]);
        }
      }

      // Busca sessões de conferência em andamento (conference_sessions)
      const { data: activeSessions, error: activeError } = await supabase
        .from('conference_sessions')
        .select('*')
        .eq('etapa_name', stage.name);

      if (activeError) {
        console.error('❌ Erro ao buscar conference_sessions:', activeError);
      } else {
        console.log('✅ conference_sessions encontradas:', activeSessions?.length || 0);
        if (activeSessions && activeSessions.length > 0) {
          console.log('📄 Primeira sessão ativa encontrada:', activeSessions[0]);
        }
      }

      // Combina as duas fontes de dados
      const allSessions: any[] = [];
      
      // Adiciona sessões finalizadas com chassis_data
      if (finishedSessions) {
        finishedSessions.forEach(session => {
          allSessions.push({
            chassis_data: session.chassis_data || [],
            source: 'finished'
          });
        });
      }
      
      // Adiciona sessões ativas com excel_data
      if (activeSessions) {
        activeSessions.forEach(session => {
          // Em conference_sessions, os dados estão em excel_data, não em chassis_data
          allSessions.push({
            chassis_data: session.excel_data || [],
            source: 'active'
          });
        });
      }
      
      console.log('✅ Total de sessões encontradas:', allSessions.length);

      if (allSessions.length === 0) {
        console.warn('⚠️ NENHUMA SESSÃO ENCONTRADA!');
        console.warn('   Verificar se existem registros nas tabelas:');
        console.warn('   - tire_check_sessions com stage_name =', stage.name);
        console.warn('   - conference_sessions com etapa_name =', stage.name);
      }

      // Extrai chassis confirmados da categoria selecionada
      const confirmedChassisSet = new Set<string>();
      const chassisDetailsMap = new Map<string, { piloto: string; numero: string; corrida: string; classe: string }>();

      allSessions.forEach((session, sessionIndex) => {
        const chassisData = session.chassis_data || [];
        console.log(`📊 Sessão ${sessionIndex + 1} (${session.source}): ${chassisData.length} chassis encontrados`);
        
        if (chassisData.length === 0) {
          console.warn(`   ⚠️ Sessão ${sessionIndex + 1} não tem chassis_data ou está vazio`);
        }
        
        chassisData.forEach((chassis: any, chassisIndex: number) => {
          // ✅ FILTRO: Verifica se o chassis está marcado como "Corre" (corrida = 'SIM')
          const corridaStatus = chassis.corrida?.trim().toUpperCase() || '';
          
          if (corridaStatus !== 'SIM') {
            console.log(`  ⏭️ Chassis ${chassisIndex + 1}: ${chassis.chassis} - Status corrida: "${corridaStatus}" (não corre), pulando...`);
            return; // Pula chassis que não correm
          }
          
          console.log(`  ✅ Chassis ${chassisIndex + 1}: ${chassis.chassis} - CORRE nesta etapa (corrida = SIM)`);
          console.log(`     📋 Piloto: ${chassis.piloto}`);
          console.log(`     🔢 Número: ${chassis.numero || '(não informado)'}`);
          
          // Verifica se o chassis pertence à categoria selecionada
          // A categoria pode estar em chassis.categoria ou chassis.sheetName
          const chassisCategory = chassis.categoria || chassis.sheetName || '';
          
          console.log(`     Categoria do chassis: "${chassisCategory}"`);
          
          // Normaliza as strings para comparação (remove espaços extras e converte para maiúsculas)
          const normalizedChassisCategory = chassisCategory.trim().toUpperCase();
          const normalizedSelectedCategory = categoryName.trim().toUpperCase();
          
          // Verifica se as categorias são exatamente iguais ou se uma contém a outra
          const isMatch = normalizedChassisCategory === normalizedSelectedCategory ||
                          normalizedChassisCategory.includes(normalizedSelectedCategory) ||
                          normalizedSelectedCategory.includes(normalizedChassisCategory);
          
          if (isMatch) {
            console.log(`    ✅ Match! Adicionando chassis: ${chassis.chassis}`);
            confirmedChassisSet.add(chassis.chassis);
            chassisDetailsMap.set(chassis.chassis, {
              piloto: chassis.piloto || '',
              numero: chassis.numero || '', // ✅ Campo 'numero' já vem da planilha processada
              corrida: chassis.corrida || '',
              classe: chassis.classe || '' // ✅ Campo 'classe' da planilha
            });
          } else {
            console.log(`    ❌ Não corresponde. Esperado: "${normalizedSelectedCategory}", Encontrado: "${normalizedChassisCategory}"`);
          }
        });
      });

      console.log('✅ Chassis únicos confirmados:', confirmedChassisSet.size);
      console.log('📋 Lista de chassis confirmados:', Array.from(confirmedChassisSet));

      // Formata os chassis confirmados com as informações de piloto
      const formattedDrivers: Driver[] = Array.from(confirmedChassisSet).map(chassisCode => {
        const details = chassisDetailsMap.get(chassisCode);
        
        // ✅ Usa o número diretamente da coluna # da planilha
        const pilotoNumero = details?.numero || '';
        const pilotoNome = details?.piloto || '';

        return {
          id: chassisCode, // Usa o código do chassi como ID temporário
          chassis_number: chassisCode,
          driver_name: pilotoNome,
          driver_number: pilotoNumero,
          season_id: '',
          stage_id: stageId,
          generation_id: '',
          categoria: categoryName,
          classe: details?.classe || '' // Adiciona classe do chassis
        };
      });

      // Ordena alfabeticamente pelo código do chassis
      formattedDrivers.sort((a, b) => a.chassis_number.localeCompare(b.chassis_number));

      setFilteredDrivers(formattedDrivers);
      console.log('✅ Chassis formatados e setados no estado:', formattedDrivers);

      if (formattedDrivers.length === 0) {
        console.warn('⚠️ ATENÇÃO: Nenhum chassis foi encontrado para esta combinação de etapa/categoria');
        console.warn('   Etapa:', stage.name);
        console.warn('   Categoria:', categoryName);
        console.warn('   Total de sessões analisadas:', allSessions.length);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar chassis confirmados:', error);
      setFilteredDrivers([]);
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    // Validação: verifica se os campos necessários para a marca d'água estão preenchidos
    if (!selectedStage || !incidentDate || !driverNumber || !driverName || !selectedCategory || !selectedChassis || !session) {
      alert('Por favor, preencha todos os campos obrigatórios antes de adicionar fotos:\n\n- Data do Incidente\n- Etapa\n- Categoria\n- Chassi\n- Nome do Piloto\n- Número do Piloto\n- Sessão');
      e.target.value = ''; // Limpa o input
      return;
    }

    const newPhotos = Array.from(e.target.files);
    setPendingPhotos([...pendingPhotos, ...newPhotos]); // Adiciona as novas fotos à fila de processamento
    setPhotoError(false);
    e.target.value = ''; // Limpa o input para permitir selecionar as mesmas fotos novamente se necessário
  }

  async function handleImageEditorSave(processedBlob: Blob) {
    // Converte o Blob em File
    const processedFile = new File(
      [processedBlob], 
      `avaria_${Date.now()}.jpg`, 
      { type: 'image/jpeg' }
    );
    
    // Adiciona a foto processada ao array de fotos
    setPhotos(prev => [...prev, processedFile]);
    
    // Remove a foto atual da fila de pendentes
    setPendingPhotos(prev => prev.slice(1));
    
    // Limpa o estado de edição
    setCurrentEditingImage(null);
    setIsImageEditorOpen(false);
  }

  function handleImageEditorClose() {
    // Cancela a edição - remove a foto da fila mas não adiciona ao array de fotos
    setPendingPhotos(prev => prev.slice(1));
    setCurrentEditingImage(null);
    setIsImageEditorOpen(false);
  }

  async function getWatermarkData(): Promise<WatermarkData> {
    const stage = stages.find(s => s.id === selectedStage);
    const stageName = stage?.name || '';
    
    // Busca o número do chassi selecionado
    const selectedDriver = filteredDrivers.find(d => d.id === selectedChassis);
    const chassisNumber = selectedDriver?.chassis_number || selectedChassis || '';
    
    // Busca o último código registrado
    const { data: lastRecord } = await supabase
      .from('wheel_damage_occurrences')
      .select('line_code')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const lastCode = lastRecord?.line_code;
    console.log('🔍 Último código registrado:', lastCode || 'nenhum');
    
    return createWatermarkData(
      stageName,
      driverNumber,
      driverName,
      selectedCategory,
      classe || selectedCategory, // Se não tiver classe, usa a categoria
      chassisNumber,
      incidentDate,
      session,
      lastCode
    );
  }

  async function getWatermarkDataSync(): Promise<WatermarkData> {
    const stage = stages.find(s => s.id === selectedStage);
    const stageName = stage?.name || '';
    
    // Busca o número do chassi selecionado
    const selectedDriver = filteredDrivers.find(d => d.id === selectedChassis);
    const chassisNumber = selectedDriver?.chassis_number || selectedChassis || '';
    
    // Busca o último código registrado
    const { data: lastRecord } = await supabase
      .from('wheel_damage_occurrences')
      .select('line_code')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const lastCode = lastRecord?.line_code;
    console.log('🔍 Último código registrado:', lastCode || 'nenhum');
    
    return createWatermarkData(
      stageName,
      driverNumber,
      driverName,
      selectedCategory,
      classe || selectedCategory, // Se não tiver classe, usa a categoria
      chassisNumber,
      incidentDate,
      session,
      lastCode
    );
  }

  async function handleSubmit() {
    // Validação: pelo menos uma foto
    if (photos.length === 0) {
      setPhotoError(true);
      alert('Por favor, adicione pelo menos uma foto da avaria.');
      return;
    }

    try {
      console.log('💾 Iniciando salvamento da avaria...');
      console.log('📋 Dados do formulário:', {
        incidentDate,
        selectedStage,
        selectedCategory,
        selectedChassis,
        driverName,
        driverNumber,
        session,
        wheelPosition,
        damageType,
        destination,
        photosCount: photos.length
      });

      // Busca informações da etapa
      const stage = stages.find(s => s.id === selectedStage);
      const stageName = stage?.name || '';
      
      console.log('🏁 Etapa encontrada:', { stageId: selectedStage, stageName });

      // Gera o watermark data
      const watermarkData = await getWatermarkDataSync();
      console.log('🏷️ Watermark data:', watermarkData);

      // Cria registro da avaria primeiro (sem fotos)
      console.log('📝 Inserindo registro na tabela wheel_damage_occurrences...');
      const insertData = {
        incident_date: incidentDate,
        stage_id: selectedStage,
        stage_name: stageName,
        category: selectedCategory,
        car_generation: carGeneration || null, // 🆕 Adiciona geração/modelo do carro
        chassis: selectedChassis,
        driver_name: driverName,
        driver_number: driverNumber,
        classe: classe || selectedCategory,
        session: session,
        wheel_position: wheelPosition,
        wheel_color: wheelColor || null,
        serial_number: serialNumber || null,
        damage_type: damageType,
        warping_level: warpingLevel || null, // 🆕 Adiciona nível de empenamento
        action_taken: actionTaken || null,
        destination,
        observations: observations || null,
        // line_code será gerado automaticamente pelo banco de dados via trigger
        status: 'pending' // Status inicial: aguardando aprovação
      };
      
      console.log('📤 Dados a serem inseridos:', insertData);
      
      const { data: damageRecord, error: damageError } = await supabase
        .from('wheel_damage_occurrences')
        .insert(insertData)
        .select()
        .single();

      if (damageError) {
        console.error('❌ Erro detalhado ao salvar avaria:', {
          error: damageError,
          message: damageError.message,
          details: damageError.details,
          hint: damageError.hint,
          code: damageError.code
        });
        alert(`Erro ao salvar avaria: ${damageError.message}\n\nDetalhes: ${damageError.details || 'Nenhum detalhe adicional'}`);
        return;
      }

      console.log('✅ Avaria salva com sucesso:', damageRecord);

      // 🆕 Adiciona evento de criação no histórico
      console.log('📝 Adicionando evento de criação no histórico...');
      const { data: { user } } = await supabase.auth.getUser();
      
      // 🆕 Busca o nome do usuário do user_metadata (sistema Supabase Auth)
      let userName = 'Sistema';
      if (user?.id) {
        // Prioridade: user_metadata.name > user_metadata.full_name > email
        userName = user.user_metadata?.name || 
                   user.user_metadata?.full_name || 
                   user.email?.split('@')[0] || 
                   'Usuário';
      }

      const { error: historyError } = await supabase
        .from('wheel_damage_history')
        .insert({
          occurrence_id: damageRecord.id,
          action_type: 'created',
          changes: null,
          description: 'Avaria registrada',
          user_id: user?.id || null,
          user_name: userName
        });

      if (historyError) {
        console.error('⚠️ Erro ao adicionar entrada no histórico:', historyError);
        // Não bloqueia o fluxo, apenas loga o erro
      } else {
        console.log('✅ Histórico criado com sucesso');
      }

      // Faz upload das fotos
      console.log('📸 Fazendo upload de', photos.length, 'fotos...');
      const photoUrls = await uploadMultipleDamagePhotos(photos, damageRecord.id);
      
      console.log('✅ URLs das fotos:', photoUrls);
      
      if (photoUrls.length === 0) {
        console.error('❌ Nenhuma foto foi enviada com sucesso');
        alert('Avaria salva, mas houve erro ao fazer upload das fotos. Por favor, tente adicionar as fotos manualmente.');
        onSave();
        handleClose();
        return;
      }

      // Atualiza o registro com as URLs das fotos
      console.log('🔄 Atualizando registro com URLs das fotos...');
      const { error: updateError } = await supabase
        .from('wheel_damage_occurrences')
        .update({ photo_urls: photoUrls })
        .eq('id', damageRecord.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar URLs das fotos:', updateError);
        alert('Avaria salva, mas houve erro ao atualizar as fotos. As fotos foram enviadas com sucesso.');
      }

      console.log('✅ Avaria registrada com sucesso!');
      alert('Avaria registrada com sucesso!');
      
      onSave();
      handleClose();

    } catch (error: any) {
      console.error('❌ Erro geral ao salvar avaria:', error);
      console.error('Stack trace:', error.stack);
      alert(`Erro ao salvar avaria: ${error.message || 'Erro desconhecido'}\n\nPor favor, verifique o console para mais detalhes.`);
    }
  }

  function handleClose() {
    // Reset form
    setIncidentDate('');
    setSelectedStage('');
    setSelectedCategory(''); // Mudado de setSelectedModel
    setCarGeneration(''); // 🆕 Limpa geração do carro
    setSelectedChassis('');
    setDriverName('');
    setDriverNumber('');
    setClasse('');
    setSession('');
    setWheelPosition('');
    setWheelColor('');
    setSerialNumber('');
    setDamageType('');
    setWarpingLevel(''); // 🆕 Limpa nível de empenamento
    setActionTaken('');
    setDestination('INDEFINIDO');
    setObservations('');
    setPhotos([]);
    setPhotoError(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white border border-gray-200 rounded-lg w-full max-w-4xl mx-4 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Nova Avaria</h2>
          <p className="text-gray-600 text-sm">Registrar nova avaria de rodas</p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-8">
          {/* 🆕 Banner do Próximo Código */}
          {nextCode && (
            <div className="bg-gradient-to-r from-red-900 to-red-800 border-2 border-red-600 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <span className="text-white font-semibold">Próximo código de ocorrência:</span>
                <span className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold text-lg">
                  {nextCode}
                </span>
              </div>
            </div>
          )}
          
          {/* Seção: Formulário de Registro */}
          <div>
            <div className="mb-6">
              <h3 className="text-gray-900 font-bold text-sm mb-1">FORMULÁRIO DE REGISTRO</h3>
              <p className="text-gray-500 text-xs">Preencha os dados da avaria</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data do Incidente */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Data do Incidente
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>

              {/* Etapa */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Etapa
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                >
                  <option value="">Selecione a etapa</option>
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm mb-2">
                  Categoria do Carro
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    // 🆕 Captura a geração quando a categoria for selecionada
                    const category = categories.find(cat => cat.name === e.target.value);
                    setCarGeneration(category?.generation || '');
                    console.log('🏎️ Categoria selecionada:', e.target.value, 'Geração:', category?.generation);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map(category => (
                    <option key={category.name} value={category.name}>
                      {category.name}{category.generation ? ` (${category.generation})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chassi */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm mb-2">
                  Chassi (Confirmado na etapa)
                </label>
                <select
                  value={selectedChassis}
                  onChange={(e) => setSelectedChassis(e.target.value)}
                  disabled={!selectedStage || !selectedCategory}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">
                    {!selectedStage || !selectedCategory 
                      ? 'Selecione uma etapa e categoria primeiro'
                      : filteredDrivers.length === 0
                      ? 'Nenhum piloto cadastrado nesta etapa para este modelo. Você pode prosseguir em modo manual (usando o cadastro geral de pilotos).'
                      : 'Selecione o chassi'
                    }
                  </option>
                  {filteredDrivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.chassis_number}
                      {driver.driver_number && ` (#${driver.driver_number}`}
                      {driver.driver_name && ` - ${driver.driver_name}`}
                      {driver.driver_number && ')'} 
                    </option>
                  ))}
                </select>
                {!selectedStage || !selectedCategory ? (
                  <p className="text-gray-500 text-xs mt-1">
                    Selecione a etapa e a categoria para ver os chassis confirmados na planilha
                  </p>
                ) : filteredDrivers.length === 0 ? (
                  <p className="text-amber-600 text-xs mt-1">
                    ⚠️ Nenhum chassis encontrado na planilha para esta etapa/categoria
                  </p>
                ) : (
                  <p className="text-gray-500 text-xs mt-1">
                    Mostrando {filteredDrivers.length} chassis confirmados na planilha
                  </p>
                )}
              </div>

              {/* Nome do Piloto */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Nome do Piloto (editável)
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Preenchido automaticamente pelo chassi, mas pode ser alterado
                </p>
              </div>

              {/* Número do Piloto */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Número do Piloto
                </label>
                <input
                  type="text"
                  value={driverNumber}
                  onChange={(e) => setDriverNumber(e.target.value)}
                  placeholder="Ex: 77"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              {/* Classe */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Classe
                </label>
                <input
                  type="text"
                  value={classe}
                  onChange={(e) => setClasse(e.target.value)}
                  placeholder="Ex: LMP2"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              {/* Sessão */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Sessão
                </label>
                <div className="relative">
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 pl-10 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  >
                    <option value="">Selecione a sessão</option>
                    <option value="treino_livre">Treino Livre</option>
                    <option value="treino_livre_1">Treino Livre 1</option>
                    <option value="treino_livre_2">Treino Livre 2</option>
                    <option value="treino_livre_3">Treino Livre 3</option>
                    <option value="treino_livre_4">Treino Livre 4</option>
                    <option value="treino_opcional">Treino Opcional</option>
                    <option value="treino_opcional_1">Treino Opcional 1</option>
                    <option value="treino_opcional_2">Treino Opcional 2</option>
                    <option value="treino_opcional_3">Treino Opcional 3</option>
                    <option value="treino_opcional_4">Treino Opcional 4</option>
                    <option value="treino_extra">Treino Extra</option>
                    <option value="classificacao">Classificação</option>
                    <option value="corrida">Corrida</option>
                    <option value="corrida_1">Corrida 1</option>
                    <option value="corrida_2">Corrida 2</option>
                  </select>
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Posição da Roda */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Posição da Roda
                </label>
                <select
                  value={wheelPosition}
                  onChange={(e) => setWheelPosition(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                >
                  <option value="">Selecione a posição</option>
                  <option value="dianteira">Dianteira (D)</option>
                  <option value="dianteira_direita">Dianteira Direita (DD)</option>
                  <option value="dianteira_esquerda">Dianteira Esquerda (DE)</option>
                  <option value="traseira">Traseira (T)</option>
                  <option value="traseira_direita">Traseira Direita (TD)</option>
                  <option value="traseira_esquerda">Traseira Esquerda (TE)</option>
                </select>
              </div>

              {/* Cor da Roda */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Cor da Roda
                </label>
                <select
                  value={wheelColor}
                  onChange={(e) => setWheelColor(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                >
                  <option value="">Selecione a cor</option>
                  <option value="chumbo">Chumbo</option>
                  <option value="prata">Prata</option>
                  <option value="preta">Preta</option>
                  <option value="colorida">Colorida</option>
                </select>
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Serial Number (Opcional)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Ex: SN123456"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              {/* Tipo de Avaria */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Tipo de Avaria
                </label>
                <select
                  value={damageType}
                  onChange={(e) => {
                    setDamageType(e.target.value);
                    // Limpa o nível de empenamento se o tipo não for "empenada"
                    if (e.target.value !== 'empenada') {
                      setWarpingLevel('');
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="empenada">Empenada</option>
                  <option value="fora_de_centro">Fora de Centro</option>
                  <option value="vazamento">Vazamento</option>
                  <option value="pintura">Pintura</option>
                  <option value="dsi">DSI</option>
                </select>
              </div>

              {/* 🆕 Nível de Empenamento (só aparece quando tipo = empenada) */}
              {damageType === 'empenada' && (
                <div>
                  <label className="block text-gray-700 text-sm mb-2">
                    Nível de Empenamento
                  </label>
                  <select
                    value={warpingLevel}
                    onChange={(e) => setWarpingLevel(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  >
                    <option value="">Selecione o nível</option>
                    <option value="N1">N1</option>
                    <option value="N2">N2</option>
                  </select>
                </div>
              )}

              {/* Ação Tomada */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Ação Tomada (Opcional)
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                >
                  <option value="">Selecione a ação</option>
                  <option value="reforma">Reforma</option>
                  <option value="pintura">Pintura</option>
                  <option value="dsi">DSI</option>
                </select>
              </div>

              {/* Destino */}
              <div>
                <label className="block text-gray-700 text-sm mb-2">
                  Destino
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                >
                  <option value="INDEFINIDO">INDEFINIDO</option>
                  <option value="CUP">CUP</option>
                  <option value="CONTA">CONTA</option>
                </select>
              </div>

              {/* Observações */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm mb-2">
                  Observações (Opcional)
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Detalhes adicionais sobre a avaria..."
                  rows={4}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Seção: Fotos da Avaria */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900 font-bold text-sm mb-1">FOTOS DA AVARIA</h3>
                <p className="text-gray-500 text-xs">
                  Pelo menos uma foto é obrigatória para registrar a ocorrência
                </p>
              </div>
              <label className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                Adicionar Fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photoError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-700 text-sm flex items-center gap-2">
                  <X className="w-4 h-4" />
                  É necessário adicionar pelo menos uma foto da ocorrência antes de registrar
                </p>
              </div>
            )}

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-white">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Arraste fotos aqui ou clique no botão acima
                </p>
                <p className="text-gray-500 text-xs">
                  Fotos serão ajustadas para 800x600 com marca d'água
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex gap-4 bg-gray-50">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Registrar Avaria
          </button>
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* ImageEditor Modal */}
      {isImageEditorOpen && currentEditingImage && (
        <ImageEditor
          isOpen={isImageEditorOpen}
          imageFile={currentEditingImage}
          onClose={handleImageEditorClose}
          onSave={handleImageEditorSave}
          watermarkData={currentWatermarkData || undefined}
        />
      )}
    </div>
  );
}

export { NovaAvariaModal };