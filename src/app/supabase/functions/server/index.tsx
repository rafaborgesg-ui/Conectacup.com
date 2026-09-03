import { Hono } from "npm:hono@4";
import { cors } from "npm:hono@4/cors";
import { logger } from "npm:hono@4/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Supabase Admin Client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Supabase Client (para operações não-admin)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

// ============================================
// AUTO-SETUP: Cria tabela KV se não existir
// ============================================
async function ensureKVTableExists() {
  try {
    // Tenta fazer uma query simples para verificar se a tabela existe
    const { error } = await supabaseAdmin
      .from('kv_store_18cdc61b')
      .select('key')
      .limit(1);
    
    if (error && error.message && (error.message.includes('does not exist') || error.message.includes('schema cache'))) {
      // BD não configurado - modo offline silencioso
      console.log('ℹ️ BD não configurado. Execute SETUP_DATABASE.sql para sincronização');
    } else if (error) {
      console.error('❌ Erro BD:', error.message || error);
    } else {
      console.log('✅ BD conectado');
    }
  } catch (err: any) {
    console.error('❌ Erro setup:', err?.message || err);
  }
}

// Executa setup na inicialização (não bloqueia o servidor)
ensureKVTableExists().catch(err => {
  console.error('Erro fatal no setup:', err);
});

// CORS PRIMEIRO - antes de tudo
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: false,
}));

app.use('*', logger(console.log));

// ============================================
// HEALTH CHECK & TEST ROUTES
// ============================================

/**
 * Health check endpoint
 * GET /server/health
 */
app.get("/server/health", (c) => {
  return c.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    routes: {
      signup: '/server/signup',
      login: '/server/auth/login',
      health: '/server/health',
    }
  });
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

/**
 * Middleware para verificar autenticação JWT
 * Aceita tanto JWT válido quanto publicAnonKey para compatibilidade com DEV mode
 */
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Auth Middleware: Token ausente ou formato inválido');
    return c.json({ success: false, error: 'Missing token' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  
  // Aceita publicAnonKey para compatibilidade com usuário DEV
  const publicAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  
  // Debug logs ATIVOS para troubleshooting
  console.log(`🔍 Auth Debug: Token = ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
  console.log(`🔍 Auth Debug: AnonKey = ${publicAnonKey.substring(0, 20)}...${publicAnonKey.substring(publicAnonKey.length - 10)}`);
  console.log(`🔍 Auth Debug: Match? ${token === publicAnonKey}`);
  
  if (token === publicAnonKey) {
    console.log('🔓 Auth: publicAnonKey aceito (DEV mode)');
    c.set('user', { id: 'dev-user', email: 'dev@local', user_metadata: { role: 'admin' } });
    c.set('userId', 'dev-user');
    c.set('userRole', 'admin');
    await next();
    return;
  }
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.log('❌ Auth Middleware: Token inválido ou usuário não encontrado');
      console.log('Error:', error?.message);
      return c.json({ success: false, error: 'Invalid token' }, 401);
    }
    
    console.log(`✅ Auth Middleware: Usuário autenticado - ${user.email} (${user.user_metadata?.role || 'operator'})`);
    
    c.set('user', user);
    c.set('userId', user.id);
    c.set('userRole', user.user_metadata?.role || 'operator');
    
    await next();
  } catch (error: any) {
    console.log('❌ Auth Middleware: Exceção na validação do token');
    console.log('Error:', error?.message);
    return c.json({ success: false, error: 'Token validation failed' }, 401);
  }
}

/**
 * Middleware para verificar role de admin
 */
async function adminMiddleware(c: any, next: any) {
  const userRole = c.get('userRole');
  
  if (userRole !== 'admin') {
    return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403);
  }
  
  await next();
}

// ============================================
// AUTH ENDPOINTS
// ============================================

/**
 * Signup - Criar novo usuário
 * POST /auth/signup
 * Body: { email, password, name, role }
 * 
 * IMPORTANTE: Esta rota deve ser protegida por admin em produção
 * Atualmente permite criação de usuários para simplificar onboarding
 */
app.post("/make-server-02726c7c/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    // Validações
    if (!email || !password || !name) {
      return c.json({ 
        success: false, 
        error: 'Email, password e name são obrigatórios' 
      }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Senha deve ter pelo menos 6 caracteres' 
      }, 400);
    }
    
    // Validação de role
    const userRole = role || 'operator';
    if (!['admin', 'operator'].includes(userRole)) {
      return c.json({ 
        success: false, 
        error: 'Role inválido. Use "admin" ou "operator"' 
      }, 400);
    }
    
    // Cria usuário via Admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma email (sem servidor de email configurado)
      user_metadata: {
        name,
        role: userRole,
      },
    });
    
    if (error) {
      console.error('Signup error:', error);
      return c.json({ 
        success: false, 
        error: error.message || 'Erro ao criar usuário' 
      }, 400);
    }
    
    console.log(`User created: ${email} (${userRole})`);
    
    return c.json({ 
      success: true, 
      message: 'Usuário criado com sucesso',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role,
      }
    });
  } catch (error) {
    console.error('Signup endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * ENSURE ROLE - Garante que usuário OAuth tenha role definida
 * POST /auth/ensure-role
 * Headers: Authorization: Bearer <access_token>
 * 
 * Este endpoint é chamado após login OAuth para garantir que o usuário
 * tenha uma role definida no user_metadata
 */
app.post("/make-server-02726c7c/auth/ensure-role", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: 'Token de autenticação ausente' 
      }, 401);
    }
    
    const accessToken = authHeader.split(' ')[1];
    
    // Obtém usuário atual usando o token de acesso
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      return c.json({ 
        success: false, 
        error: 'Usuário não encontrado ou token inválido' 
      }, 401);
    }
    
    console.log('🔐 Verificando role para usuário:', user.email);
    
    // Verifica se já tem role
    const currentRole = user.user_metadata?.role;
    
    if (currentRole) {
      console.log('✅ Usuário já tem role:', currentRole);
      return c.json({
        success: true,
        message: 'Usuário já tem role definida',
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          role: currentRole,
        }
      });
    }
    
    // Define role padrão para usuários OAuth
    const defaultRole = 'operator';
    const defaultName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
    
    console.log(`🔧 Definindo role padrão '${defaultRole}' para usuário OAuth:`, user.email);
    
    // Atualiza user_metadata com role
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          name: defaultName,
          role: defaultRole,
        }
      }
    );
    
    if (updateError) {
      console.error('Erro ao atualizar role:', updateError);
      return c.json({ 
        success: false, 
        error: 'Erro ao definir role do usuário' 
      }, 500);
    }
    
    console.log('✅ Role definida com sucesso:', defaultRole);
    
    return c.json({
      success: true,
      message: 'Role definida com sucesso',
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        name: defaultName,
        role: defaultRole,
      }
    });
  } catch (error: any) {
    console.error('Erro no ensure-role:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro interno no servidor' 
    }, 500);
  }
});

/**
 * AUTH DEBUG - Verificar status de autenticação
 * GET /auth/debug
 * 
 * Endpoint para debugar problemas de autenticação
 */
app.get("/make-server-02726c7c/auth/debug", async (c) => {
  const authHeader = c.req.header('Authorization');
  const publicAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  
  if (!authHeader) {
    return c.json({
      success: false,
      error: 'Nenhum header de autorização encontrado',
      hint: 'Envie o header Authorization: Bearer <token>'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  return c.json({
    success: true,
    debug: {
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader.substring(0, 20) + '...',
      tokenLength: token?.length || 0,
      tokenStart: token?.substring(0, 20) || '',
      tokenEnd: token?.substring(token?.length - 10) || '',
      anonKeyStart: publicAnonKey.substring(0, 20),
      anonKeyEnd: publicAnonKey.substring(publicAnonKey.length - 10),
      isAnonKey: token === publicAnonKey,
      tokenType: token === publicAnonKey ? 'publicAnonKey' : 'JWT (ou inválido)',
    }
  });
});

/**
 * DEV SETUP - Criar usuário de desenvolvimento admin
 * POST /setup-dev-user
 * 
 * Endpoint público para criar usuário admin de desenvolvimento
 * Só funciona em ambiente de desenvolvimento
 */
app.post("/make-server-02726c7c/setup-dev-user", async (c) => {
  try {
    const devEmail = 'rafael.borges@porschegt3cup.com.br';
    const devPassword = 'Porschegt3cupHere';
    const devName = 'Rafael Borges (DEV)';
    
    // Verifica se já existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === devEmail);
    
    if (userExists) {
      console.log(`ℹ️ Usuário DEV já existe: ${devEmail}`);
      return c.json({ 
        success: true, 
        message: 'Usuário de desenvolvimento já existe',
        email: devEmail
      });
    }
    
    // Cria usuário DEV admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: devEmail,
      password: devPassword,
      email_confirm: true,
      user_metadata: {
        name: devName,
        role: 'admin',
      },
    });
    
    if (error) {
      console.error('Erro ao criar usuário DEV:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 400);
    }
    
    console.log(`✅ Usuário DEV criado: ${devEmail} (admin)`);
    
    return c.json({ 
      success: true, 
      message: 'Usuário de desenvolvimento criado com sucesso!',
      user: {
        email: devEmail,
        name: devName,
        role: 'admin'
      },
      credentials: {
        email: devEmail,
        password: '(use a senha configurada)'
      }
    });
  } catch (error) {
    console.error('Erro ao setup usuário DEV:', error);
    return c.json({ 
      success: false, 
      error: 'Erro ao criar usuário de desenvolvimento' 
    }, 500);
  }
});

/**
 * Public Signup - Criar novo usuário (sempre como operator)
 * POST /signup
 * Body: { email, password, name }
 * 
 * Rota pública para cadastro de novos usuários
 * Sempre cria usuários com role "operator"
 */
app.post("/make-server-02726c7c/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    // Validações
    if (!email || !password || !name) {
      return c.json({ 
        success: false, 
        error: 'Email, senha e nome são obrigatórios' 
      }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Senha deve ter pelo menos 6 caracteres' 
      }, 400);
    }
    
    if (name.trim().length < 3) {
      return c.json({ 
        success: false, 
        error: 'Nome deve ter pelo menos 3 caracteres' 
      }, 400);
    }
    
    // Validação de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ 
        success: false, 
        error: 'Email inválido' 
      }, 400);
    }
    
    // Cria usuário via Admin API - SEMPRE como operator
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirma email (sem servidor de email configurado)
      user_metadata: {
        name: name.trim(),
        role: 'operator', // SEMPRE operator para cadastro público
      },
    });
    
    if (error) {
      console.error('Public signup error:', error);
      
      // Mensagens de erro mais amigáveis
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return c.json({ 
          success: false, 
          error: 'Este email já está cadastrado. Faça login ou use outro email.' 
        }, 400);
      }
      
      return c.json({ 
        success: false, 
        error: error.message || 'Erro ao criar conta' 
      }, 400);
    }
    
    console.log(`New user registered: ${email} (operator)`);
    
    return c.json({ 
      success: true, 
      message: 'Conta criada com sucesso! Você já pode fazer login.',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: 'operator',
      }
    });
  } catch (error) {
    console.error('Public signup endpoint error:', error);
    return c.json({ 
      success: false, 
      error: 'Erro ao criar conta. Tente novamente mais tarde.' 
    }, 500);
  }
});

/**
 * Login - Autenticar usuário
 * POST /auth/login
 * Body: { email, password }
 */
app.post("/make-server-02726c7c/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ 
        success: false, 
        error: 'Email e senha são obrigatórios' 
      }, 400);
    }
    
    // Autentica via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Login error:', error.message);
      return c.json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      }, 401);
    }
    
    console.log(`User logged in: ${email}`);
    
    return c.json({ 
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || email.split('@')[0],
        role: data.user.user_metadata?.role || 'operator',
      }
    });
  } catch (error) {
    console.error('Login endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Logout - Encerrar sessão
 * POST /auth/logout
 * Headers: Authorization: Bearer <token>
 */
app.post("/make-server-02726c7c/auth/logout", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: true, message: 'Already logged out' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Revoga o token
    await supabaseAdmin.auth.admin.signOut(token);
    
    console.log('User logged out');
    
    return c.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Logout error:', error);
    // Mesmo com erro, consideramos logout bem-sucedido
    return c.json({ success: true, message: 'Logout realizado' });
  }
});

/**
 * Verificar sessão
 * GET /auth/session
 * Headers: Authorization: Bearer <token>
 */
app.get("/make-server-02726c7c/auth/session", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    return c.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: user.user_metadata?.role || 'operator',
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Atualizar perfil do usuário
 * PUT /auth/profile
 * Headers: Authorization: Bearer <token>
 * Body: { name }
 */
app.put("/make-server-02726c7c/auth/profile", authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { name } = await c.req.json();
    
    if (!name) {
      return c.json({ 
        success: false, 
        error: 'Nome é obrigatório' 
      }, 400);
    }
    
    // Atualiza user metadata
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { name } }
    );
    
    if (error) {
      console.error('Profile update error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`Profile updated for user: ${userId}`);
    
    return c.json({ 
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role,
      }
    });
  } catch (error) {
    console.error('Profile update endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Password Recovery - Solicitar reset de senha
 * POST /auth/password-recovery
 * Body: { email }
 */
app.post("/make-server-02726c7c/auth/password-recovery", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ 
        success: false, 
        error: 'Email é obrigatório' 
      }, 400);
    }
    
    // Valida formato do email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ 
        success: false, 
        error: 'Email inválido' 
      }, 400);
    }
    
    // Envia email de recuperação via Supabase Auth
    // NOTA: Requer configuração de email template no Supabase Dashboard
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.conectacup.com/reset-password',
    });
    
    console.log('📧 Reset password email enviado para:', email);
    console.log('📍 Redirect URL configurado:', 'https://www.conectacup.com/reset-password');
    
    if (error) {
      console.error('Password recovery error:', error);
      // Por segurança, não revela se o email existe ou não
      // Sempre retorna sucesso
    }
    
    console.log(`Password recovery requested for: ${email}`);
    
    // Sempre retorna sucesso (segurança)
    return c.json({ 
      success: true,
      message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
    });
  } catch (error) {
    console.error('Password recovery endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Password Reset - Atualizar senha com token
 * POST /auth/password-reset
 * Body: { access_token, new_password }
 */
app.post("/make-server-02726c7c/auth/password-reset", async (c) => {
  try {
    const { access_token, new_password } = await c.req.json();
    
    if (!access_token || !new_password) {
      return c.json({ 
        success: false, 
        error: 'Token e nova senha são obrigatórios' 
      }, 400);
    }
    
    if (new_password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Senha deve ter pelo menos 6 caracteres' 
      }, 400);
    }
    
    // Verifica o token de reset
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(access_token);
    
    if (userError || !user) {
      return c.json({ 
        success: false, 
        error: 'Token inválido ou expirado' 
      }, 401);
    }
    
    // Atualiza a senha
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );
    
    if (updateError) {
      console.error('Password reset error:', updateError);
      return c.json({ 
        success: false, 
        error: 'Erro ao atualizar senha' 
      }, 500);
    }
    
    console.log(`Password reset completed for user: ${user.id}`);
    
    return c.json({ 
      success: true,
      message: 'Senha atualizada com sucesso'
    });
  } catch (error) {
    console.error('Password reset endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Health check endpoint (público)
app.get("/make-server-02726c7c/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// DATABASE RESET ENDPOINT
// Limpa tabelas de dados operacionais
// ============================================

/**
 * Reset Database - Limpa stock_entries, tire_consumption, tire_movements e tire_discards
 * POST /make-server-02726c7c/database/reset
 * Requer: Autenticação (token JWT)
 * Preserva: tire_models, containers, users
 */
app.post("/make-server-02726c7c/database/reset", authMiddleware, async (c) => {
  try {
    console.log('🗑️ Iniciando reset da base de dados...');
    
    // Conta registros antes de deletar
    const { count: stockCount } = await supabaseAdmin
      .from('stock_entries')
      .select('*', { count: 'exact', head: true });
    
    const { count: movementsCount } = await supabaseAdmin
      .from('tire_movements')
      .select('*', { count: 'exact', head: true });
    
    const { count: consumptionCount } = await supabaseAdmin
      .from('tire_consumption')
      .select('*', { count: 'exact', head: true });
    
    const { count: discardsCount } = await supabaseAdmin
      .from('tire_discards')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Antes do reset:
      - Stock entries: ${stockCount || 0}
      - Tire movements: ${movementsCount || 0}
      - Tire consumption: ${consumptionCount || 0}
      - Tire discards: ${discardsCount || 0}
    `);
    
    // Deleta todos os registros das tabelas operacionais
    const { error: stockError } = await supabaseAdmin
      .from('stock_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo
    
    if (stockError) {
      console.error('❌ Erro ao deletar stock_entries:', stockError);
      throw new Error(`Erro ao limpar stock_entries: ${stockError.message}`);
    }
    
    const { error: movementsError } = await supabaseAdmin
      .from('tire_movements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (movementsError) {
      console.error('❌ Erro ao deletar tire_movements:', movementsError);
      throw new Error(`Erro ao limpar tire_movements: ${movementsError.message}`);
    }
    
    const { error: consumptionError } = await supabaseAdmin
      .from('tire_consumption')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (consumptionError) {
      console.error('❌ Erro ao deletar tire_consumption:', consumptionError);
      throw new Error(`Erro ao limpar tire_consumption: ${consumptionError.message}`);
    }
    
    const { error: discardsError } = await supabaseAdmin
      .from('tire_discards')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (discardsError) {
      console.error('❌ Erro ao deletar tire_discards:', discardsError);
      throw new Error(`Erro ao limpar tire_discards: ${discardsError.message}`);
    }
    
    // Verifica se o reset foi completo
    const { count: verifyStock } = await supabaseAdmin
      .from('stock_entries')
      .select('*', { count: 'exact', head: true });
    
    const { count: verifyMovements } = await supabaseAdmin
      .from('tire_movements')
      .select('*', { count: 'exact', head: true });
    
    const { count: verifyConsumption } = await supabaseAdmin
      .from('tire_consumption')
      .select('*', { count: 'exact', head: true });
    
    const { count: verifyDiscards } = await supabaseAdmin
      .from('tire_discards')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Após o reset:
      - Stock entries: ${verifyStock || 0}
      - Tire movements: ${verifyMovements || 0}
      - Tire consumption: ${verifyConsumption || 0}
      - Tire discards: ${verifyDiscards || 0}
    `);
    
    return c.json({
      success: true,
      message: 'Base de dados resetada com sucesso',
      deleted: {
        stockEntries: stockCount || 0,
        tireMovements: movementsCount || 0,
        tireConsumption: consumptionCount || 0,
        tireDiscards: discardsCount || 0,
      },
      verified: {
        stockEntries: verifyStock || 0,
        tireMovements: verifyMovements || 0,
        tireConsumption: verifyConsumption || 0,
        tireDiscards: verifyDiscards || 0,
      },
    });
  } catch (error: any) {
    console.error('❌ Erro no reset da base de dados:', error);
    return c.json({
      success: false,
      error: error.message || 'Erro ao resetar base de dados',
    }, 500);
  }
});

// ============================================
// INITIALIZATION ENDPOINT
// Inicializa dados padrão no servidor
// ============================================

app.post("/make-server-02726c7c/initialize", async (c) => {
  try {
    console.log('🔧 Inicializando dados padrão no servidor...');
    
    // Dados padrão - 7 modelos oficiais da Porsche Cup Brasil
    const DEFAULT_TIRE_MODELS = [
      { id: 'model-991-dianteiro', code: 'A', name: '991 Dianteiro', type: 'Slick', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'model-991-traseiro', code: 'B', name: '991 Traseiro', type: 'Slick', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'model-992-dianteiro', code: 'C', name: '992 Dianteiro', type: 'Slick', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'model-992-traseiro', code: 'D', name: '992 Traseiro', type: 'Slick', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'model-991-wet-dianteiro', code: 'E', name: '991 Wet Dianteiro', type: 'Wet', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'model-992-wet-dianteiro', code: 'F', name: '992 Wet Dianteiro', type: 'Wet', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'model-wet-traseiro', code: 'G', name: 'Wet Traseiro (991/992)', type: 'Wet', isDefault: true, createdAt: new Date().toISOString() },
    ];

    // 5 containers padrão
    const DEFAULT_CONTAINERS = [
      { id: 'container-a', name: 'Container A', capacity: 100, current: 0, isDefault: true, createdAt: new Date().toISOString() },
      { id: 'container-b', name: 'Container B', capacity: 100, current: 0, isDefault: true, createdAt: new Date().toISOString() },
      { id: 'container-c', name: 'Container C', capacity: 100, current: 0, isDefault: true, createdAt: new Date().toISOString() },
      { id: 'container-d', name: 'Container D', capacity: 100, current: 0, isDefault: true, createdAt: new Date().toISOString() },
      { id: 'container-e', name: 'Container E', capacity: 100, current: 0, isDefault: true, createdAt: new Date().toISOString() },
    ];

    // 5 status padrão
    const DEFAULT_TIRE_STATUS = [
      { id: 'status-novo', name: 'Novo', color: '#3B82F6', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'status-pneu-cup', name: 'Pneu CUP', color: '#10B981', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'status-descartado-dsi', name: 'Descartado DSI', color: '#DC2626', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'status-descarte-piloto', name: 'Descarte Piloto', color: '#F97316', isDefault: true, createdAt: new Date().toISOString() },
      { id: 'status-piloto', name: 'Piloto', color: '#8B5CF6', isDefault: true, createdAt: new Date().toISOString() },
    ];

    // Verifica se já existem dados
    let existingModels, existingContainers, existingStatus;
    
    try {
      existingModels = await kv.get('tire_models');
      existingContainers = await kv.get('containers');
      existingStatus = await kv.get('tire_status');
    } catch (error: any) {
      // Se tabela não existe, retorna erro para frontend saber que precisa configurar
      const errorMsg = error?.message || error?.toString() || '';
      if (errorMsg.includes('kv_store') || errorMsg.includes('does not exist') || errorMsg.includes('schema cache')) {
        console.warn('⚠️ Tabela não configurada - servidor não pode inicializar');
        return c.json({
          success: false,
          error: 'Banco de dados não configurado. Execute SETUP_DATABASE.sql',
          needsSetup: true
        }, 503);
      }
      throw error;
    }

    let initialized = {
      tireModels: false,
      containers: false,
      tireStatus: false,
    };

    // Inicializa apenas se não existir
    if (!existingModels || (Array.isArray(existingModels) && existingModels.length === 0)) {
      await kv.set('tire_models', DEFAULT_TIRE_MODELS);
      initialized.tireModels = true;
      console.log('✅ Modelos de pneus inicializados');
    }

    if (!existingContainers || (Array.isArray(existingContainers) && existingContainers.length === 0)) {
      await kv.set('containers', DEFAULT_CONTAINERS);
      initialized.containers = true;
      console.log('✅ Containers inicializados');
    }

    if (!existingStatus || (Array.isArray(existingStatus) && existingStatus.length === 0)) {
      await kv.set('tire_status', DEFAULT_TIRE_STATUS);
      initialized.tireStatus = true;
      console.log('✅ Status de pneus inicializados');
    }

    // Inicializa arrays vazios para outros dados se não existirem
    try {
      const stockEntries = await kv.get('stock_entries');
      if (!stockEntries) {
        await kv.set('stock_entries', []);
        initialized.stockEntries = true;
      }
    } catch (e) {
      await kv.set('stock_entries', []);
      initialized.stockEntries = true;
    }

    try {
      const movements = await kv.get('tire_movements');
      if (!movements) {
        await kv.set('tire_movements', []);
        initialized.tireMovements = true;
      }
    } catch (e) {
      await kv.set('tire_movements', []);
      initialized.tireMovements = true;
    }

    try {
      const consumption = await kv.get('tire_consumption');
      if (!consumption) {
        await kv.set('tire_consumption', []);
        initialized.tireConsumption = true;
      }
    } catch (e) {
      await kv.set('tire_consumption', []);
      initialized.tireConsumption = true;
    }

    console.log('✅ Servidor inicializado com sucesso');

    return c.json({
      success: true,
      message: 'Servidor inicializado com sucesso',
      initialized,
      data: {
        tireModels: initialized.tireModels ? DEFAULT_TIRE_MODELS.length : (existingModels?.length || 0),
        containers: initialized.containers ? DEFAULT_CONTAINERS.length : (existingContainers?.length || 0),
        tireStatus: initialized.tireStatus ? DEFAULT_TIRE_STATUS.length : (existingStatus?.length || 0),
      }
    });
  } catch (error) {
    console.error('Erro na inicialização:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// TIRE MODELS ENDPOINTS - SUPABASE DIRETO (Protegido)
// ============================================

// GET - Listar todos os modelos
app.get("/make-server-02726c7c/tire-models", authMiddleware, async (c) => {
  try {
    console.log('📦 Buscando modelos de pneus da tabela tire_models...');
    
    const { data, error } = await supabaseAdmin
      .from('tire_models')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar modelos:', error);
      
      // Se tabela não existe, retorna modelos padrão
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('ℹ️ Tabela tire_models não existe. Execute SETUP_DATABASE.sql');
        return c.json({ 
          success: true, 
          data: [],
          warning: 'Tabela não configurada. Execute SETUP_DATABASE.sql'
        });
      }
      
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ ${data?.length || 0} modelos encontrados`);
    return c.json({ success: true, data: data || [] });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao buscar modelos:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST - Criar novo modelo (apenas admin)
app.post("/make-server-02726c7c/tire-models", authMiddleware, adminMiddleware, async (c) => {
  try {
    const model = await c.req.json();
    
    console.log(`📝 Criando novo modelo: ${model.name}`);
    
    // Validação
    if (!model.name || !model.type) {
      return c.json({ 
        success: false, 
        error: 'Nome e tipo são obrigatórios' 
      }, 400);
    }

    if (!['Slick', 'Wet'].includes(model.type)) {
      return c.json({ 
        success: false, 
        error: 'Tipo deve ser Slick ou Wet' 
      }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('tire_models')
      .insert([{
        name: model.name,
        code: model.code || '',
        type: model.type
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar modelo:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Modelo criado: ${data.id}`);
    return c.json({ success: true, data });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao criar modelo:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT - Atualizar modelo existente (apenas admin)
app.put("/make-server-02726c7c/tire-models/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    console.log(`📝 Atualizando modelo: ${id}`);
    
    // Validação
    if (updates.type && !['Slick', 'Wet'].includes(updates.type)) {
      return c.json({ 
        success: false, 
        error: 'Tipo deve ser Slick ou Wet' 
      }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('tire_models')
      .update({
        name: updates.name,
        code: updates.code,
        type: updates.type
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar modelo:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!data) {
      return c.json({ success: false, error: 'Modelo não encontrado' }, 404);
    }

    console.log(`✅ Modelo atualizado: ${id}`);
    return c.json({ success: true, data });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao atualizar modelo:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE - Remover modelo (apenas admin)
app.delete("/make-server-02726c7c/tire-models/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    
    console.log(`🗑️ Deletando modelo: ${id}`);
    
    // Verifica se há pneus usando este modelo
    const { data: stockEntries } = await supabaseAdmin
      .from('kv_store_18cdc61b')
      .select('value')
      .eq('key', 'stock_entries')
      .single();
    
    if (stockEntries) {
      const entries = stockEntries.value as any[];
      const hasEntries = entries.some((entry: any) => entry.modelId === id);
      
      if (hasEntries) {
        return c.json({ 
          success: false, 
          error: 'Não é possível excluir modelo que possui pneus cadastrados' 
        }, 400);
      }
    }

    const { error } = await supabaseAdmin
      .from('tire_models')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar modelo:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Modelo deletado: ${id}`);
    return c.json({ success: true });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao deletar modelo:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// CONTAINERS ENDPOINTS - SUPABASE DIRETO (Protegido)
// ============================================

// GET - Listar todos os contêineres
app.get("/make-server-02726c7c/containers", authMiddleware, async (c) => {
  try {
    console.log('📦 Buscando contêineres da tabela containers...');
    
    const { data, error } = await supabaseAdmin
      .from('containers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar contêineres:', error);
      
      // Se tabela não existe, retorna array vazio
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('ℹ️ Tabela containers não existe. Execute SETUP_DATABASE.sql');
        return c.json({ 
          success: true, 
          data: [],
          warning: 'Tabela não configurada. Execute SETUP_DATABASE.sql'
        });
      }
      
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ ${data?.length || 0} contêineres encontrados`);
    return c.json({ success: true, data: data || [] });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao buscar contêineres:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST - Criar novo contêiner (apenas admin)
app.post("/make-server-02726c7c/containers", authMiddleware, adminMiddleware, async (c) => {
  try {
    const container = await c.req.json();
    
    console.log(`📝 Criando novo contêiner: ${container.name}`);
    
    // Validação
    if (!container.name || !container.location) {
      return c.json({ 
        success: false, 
        error: 'Nome e localização são obrigatórios' 
      }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('containers')
      .insert([{
        name: container.name,
        location: container.location,
        capacity: container.capacity || 0,
        current: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar contêiner:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Contêiner criado: ${data.id}`);
    return c.json({ success: true, data });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao criar contêiner:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT - Atualizar contêiner existente (apenas admin)
app.put("/make-server-02726c7c/containers/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    console.log(`📝 Atualizando contêiner: ${id}`);

    const { data, error } = await supabaseAdmin
      .from('containers')
      .update({
        name: updates.name,
        location: updates.location,
        capacity: updates.capacity
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar contêiner:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!data) {
      return c.json({ success: false, error: 'Contêiner não encontrado' }, 404);
    }

    console.log(`✅ Contêiner atualizado: ${id}`);
    return c.json({ success: true, data });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao atualizar contêiner:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE - Remover contêiner (apenas admin)
app.delete("/make-server-02726c7c/containers/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    
    console.log(`🗑️ Deletando contêiner: ${id}`);
    
    // Verifica se há pneus neste contêiner
    const { data: stockEntries } = await supabaseAdmin
      .from('kv_store_18cdc61b')
      .select('value')
      .eq('key', 'stock_entries')
      .single();
    
    if (stockEntries) {
      const entries = stockEntries.value as any[];
      const hasEntries = entries.some((entry: any) => entry.containerId === id);
      
      if (hasEntries) {
        return c.json({ 
          success: false, 
          error: 'Não é possível excluir contêiner que possui pneus armazenados' 
        }, 400);
      }
    }

    const { error } = await supabaseAdmin
      .from('containers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar contêiner:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Contêiner deletado: ${id}`);
    return c.json({ success: true });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao deletar contêiner:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// STOCK ENTRIES ENDPOINTS (Protegido)
// Agora usa TABELA SQL stock_entries (não KV Store)
// ============================================

app.get("/make-server-02726c7c/stock-entries", authMiddleware, async (c) => {
  try {
    console.log('📦 Buscando entradas de estoque da tabela SQL stock_entries...');
    
    // Consulta direto na tabela stock_entries do Postgres
    const { data, error } = await supabaseAdmin
      .from('stock_entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar stock_entries:', error.message);
      
      // Se tabela não existe, retorna array vazio
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('ℹ️ Tabela stock_entries não existe. Execute SETUP_DATABASE.sql');
        return c.json({ 
          success: true, 
          data: [],
          warning: 'Tabela não configurada. Execute SETUP_DATABASE.sql'
        });
      }
      
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`✅ ${data?.length || 0} entradas de estoque encontradas`);
    return c.json({ success: true, data: data || [] });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao buscar entradas:', error);
    return c.json({ success: false, error: error?.message || 'Erro desconhecido' }, 500);
  }
});

app.post("/make-server-02726c7c/stock-entries", authMiddleware, async (c) => {
  try {
    const entry = await c.req.json();
    console.log(`📝 Salvando entrada na tabela SQL: ${entry.barcode} - ${entry.model_name}`);
    
    // Verificação de duplicação no banco SQL (segurança adicional)
    const { data: existingData, error: checkError } = await supabaseAdmin
      .from('stock_entries')
      .select('barcode')
      .eq('barcode', entry.barcode)
      .limit(1);
    
    if (checkError) {
      console.error(`❌ Erro ao verificar duplicata:`, checkError.message);
      return c.json({ success: false, error: `Erro ao verificar duplicata: ${checkError.message}` }, 500);
    }
    
    if (existingData && existingData.length > 0) {
      console.log(`⚠️ Código duplicado detectado no banco SQL: ${entry.barcode}`);
      return c.json({ success: false, error: "Código de barras já cadastrado" }, 400);
    }
    
    // Insere na tabela stock_entries do Postgres
    const { data, error } = await supabaseAdmin
      .from('stock_entries')
      .insert({
        id: entry.id,
        barcode: entry.barcode,
        model_id: entry.model_id,
        model_name: entry.model_name,
        model_type: entry.model_type,
        container_id: entry.container_id,
        container_name: entry.container_name,
        status: entry.status || 'Novo',
        created_at: entry.created_at || new Date().toISOString(),
      })
      .select();
    
    if (error) {
      console.error(`❌ Erro ao inserir na tabela stock_entries:`, error.message);
      return c.json({ success: false, error: `Erro ao salvar: ${error.message}` }, 500);
    }
    
    console.log(`✅ Entrada salva com sucesso na tabela SQL: ${entry.barcode}`);
    return c.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("❌ Erro ao salvar entrada:", error);
    return c.json({ success: false, error: error?.message || 'Erro desconhecido' }, 500);
  }
});

// GET - Verificar se código de barras já existe
// CRÍTICO: Agora consulta direto na tabela SQL stock_entries (schema public)
app.get("/make-server-02726c7c/stock-entries/check/:barcode", authMiddleware, async (c) => {
  try {
    const barcode = c.req.param("barcode");
    console.log(`🔍 Verificando código de barras na tabela SQL: ${barcode}`);
    
    // Consulta direto na tabela stock_entries do Postgres
    const { data, error } = await supabaseAdmin
      .from('stock_entries')
      .select('barcode')
      .eq('barcode', barcode)
      .limit(1);
    
    if (error) {
      // Se tabela não existe ou outro erro, loga e retorna false (permite cadastro)
      console.warn(`⚠️ Erro ao consultar stock_entries:`, error.message);
      return c.json({ success: true, exists: false });
    }
    
    const exists = data && data.length > 0;
    console.log(`${exists ? '⚠️' : '✅'} Código ${barcode}: ${exists ? 'JÁ EXISTE no banco SQL' : 'disponível para cadastro'}`);
    
    return c.json({ success: true, exists });
  } catch (error: any) {
    console.error("❌ Erro ao verificar código de barras:", error);
    // Em caso de erro, retorna false para não bloquear cadastro
    return c.json({ success: true, exists: false });
  }
});

// GET - Buscar entrada por código de barras
app.get("/make-server-02726c7c/stock-entries/barcode/:barcode", authMiddleware, async (c) => {
  try {
    const barcode = c.req.param("barcode");
    console.log(`🔍 Buscando entrada na tabela SQL por código: ${barcode}`);
    
    // Consulta direto na tabela stock_entries do Postgres
    const { data, error } = await supabaseAdmin
      .from('stock_entries')
      .select('*')
      .eq('barcode', barcode)
      .limit(1)
      .single();
    
    if (error) {
      // Se não encontrado ou erro, retorna null
      if (error.code === 'PGRST116') {
        // Código PGRST116 = nenhum resultado encontrado
        console.log(`⚠️ Entrada não encontrada no banco SQL: ${barcode}`);
      } else {
        console.error(`❌ Erro ao buscar entrada:`, error.message);
      }
      return c.json({ success: true, data: null });
    }
    
    console.log(`✅ Entrada encontrada no banco SQL: ${barcode}`);
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("❌ Erro ao buscar entrada:", error);
    return c.json({ success: true, data: null });
  }
});

// Update stock entries in bulk (NÃO MAIS USADO - manter para compatibilidade)
app.put("/make-server-02726c7c/stock-entries", authMiddleware, async (c) => {
  try {
    const entries = await c.req.json();
    
    // Validação básica
    if (!Array.isArray(entries)) {
      return c.json({ success: false, error: "Formato de dados inválido" }, 400);
    }
    
    console.log(`⚠️ Rota bulk PUT obsoleta - use rotas individuais para atualizar entradas`);
    return c.json({ 
      success: false, 
      error: "Rota obsoleta - use PUT /stock-entries/:barcode para atualizar entradas individuais" 
    }, 400);
  } catch (error) {
    console.error("Erro ao atualizar stock entries:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update single stock entry
app.put("/make-server-02726c7c/stock-entries/:barcode", authMiddleware, async (c) => {
  try {
    const barcode = c.req.param("barcode");
    const updates = await c.req.json();
    console.log(`📝 Atualizando entrada na tabela SQL por código: ${barcode}`);
    
    // Validação especial: detecta UUID e retorna erro específico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(barcode)) {
      console.error(`❌ UUID detectado no lugar de barcode: ${barcode}`);
      console.error(`⚠️ ERRO DE PROGRAMAÇÃO: Componente frontend está enviando UUID ao invés de barcode de 8 dígitos`);
      return c.json({ 
        success: false, 
        error: `ERRO: UUID detectado ("${barcode}"). Este endpoint espera um barcode de 8 dígitos numéricos. Verifique o código frontend - está passando entry.id ao invés de entry.barcode.` 
      }, 400);
    }
    
    // Validação: barcode deve ter exatamente 8 dígitos
    if (!barcode || barcode.length !== 8 || !/^\d{8}$/.test(barcode)) {
      console.error(`❌ Barcode inválido: ${barcode}`);
      return c.json({ 
        success: false, 
        error: `Barcode inválido: "${barcode}". Deve ter 8 dígitos numéricos.` 
      }, 400);
    }
    
    // IMPORTANTE: Força barcode como TEXT para evitar cast para UUID
    const { data, error } = await supabaseAdmin
      .from('stock_entries')
      .update(updates)
      .eq('barcode', String(barcode))  // Garante que é string
      .select();
    
    if (error) {
      console.error('❌ Erro ao atualizar entrada:', error.message);
      console.error('❌ Detalhes do erro:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️ Entrada não encontrada: ${barcode}`);
      return c.json({ success: false, error: "Pneu não encontrado" }, 404);
    }
    
    console.log(`✅ Entrada atualizada com sucesso: ${barcode}`);
    return c.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("❌ Erro fatal ao atualizar entrada:", error);
    return c.json({ success: false, error: error?.message || 'Erro desconhecido' }, 500);
  }
});

// Update ONLY container (não altera status)
app.put("/make-server-02726c7c/stock-entries/:barcode/container", authMiddleware, async (c) => {
  try {
    const barcode = c.req.param("barcode");
    const { containerId, containerName } = await c.req.json();
    
    // Validação especial: detecta UUID e retorna erro específico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(barcode)) {
      console.error(`❌ UUID detectado no lugar de barcode: ${barcode}`);
      console.error(`⚠️ ERRO DE PROGRAMAÇÃO: Componente frontend está enviando UUID ao invés de barcode de 8 dígitos`);
      console.error(`⚠️ COMPONENTE SUSPEITO: TireMovement ou TireStatusChange`);
      return c.json({ 
        success: false, 
        error: `ERRO: UUID detectado ("${barcode}"). Este endpoint espera um barcode de 8 dígitos numéricos. Verifique o código frontend - está passando entry.id ou tire.id ao invés de entry.barcode ou tire.barcode.` 
      }, 400);
    }
    
    // Validação: barcode deve ter exatamente 8 dígitos
    if (!barcode || barcode.length !== 8 || !/^\d{8}$/.test(barcode)) {
      console.error(`❌ Barcode inválido: ${barcode}`);
      return c.json({ 
        success: false, 
        error: `Barcode inválido: "${barcode}". Deve ter 8 dígitos numéricos.` 
      }, 400);
    }
    
    // Se containerId estiver vazio ou for null, define como null para limpar
    const finalContainerId = containerId || null;
    const finalContainerName = containerId ? containerName : null;
    
    console.log(`📦 Atualizando container do pneu ${barcode} para ${finalContainerName || 'Sem Contêiner'} (ID: ${finalContainerId || 'null'})`);
    
    // Atualiza direto na tabela stock_entries do Postgres
    // Atualiza APENAS os campos de container, mantém status
    // IMPORTANTE: Força barcode como TEXT para evitar cast para UUID
    const { data, error } = await supabaseAdmin
      .from('stock_entries')
      .update({
        container_id: finalContainerId,
        container_name: finalContainerName,
        updated_at: new Date().toISOString(),
      })
      .eq('barcode', String(barcode))  // Garante que é string
      .select();
    
    if (error) {
      console.error('❌ Erro ao atualizar container:', error.message);
      console.error('❌ Detalhes do erro:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️ Pneu não encontrado: ${barcode}`);
      return c.json({ success: false, error: "Pneu não encontrado" }, 404);
    }
    
    console.log(`✅ Container atualizado. Status permanece: ${data[0].status || 'Novo'}`);
    return c.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("❌ Erro fatal ao atualizar container do pneu:", error);
    return c.json({ success: false, error: error?.message || 'Erro desconhecido' }, 500);
  }
});

// Delete stock entry by barcode
app.delete("/make-server-02726c7c/stock-entries/:barcode", authMiddleware, async (c) => {
  try {
    const barcode = c.req.param("barcode");
    console.log(`🗑️ Deletando pneu por barcode: ${barcode}`);
    
    // Validação especial: detecta UUID e retorna erro específico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(barcode)) {
      console.error(`❌ UUID detectado no lugar de barcode: ${barcode}`);
      console.error(`⚠️ ERRO DE PROGRAMAÇÃO: Componente frontend está enviando UUID ao invés de barcode de 8 dígitos`);
      return c.json({ 
        success: false, 
        error: `ERRO: UUID detectado ("${barcode}"). Este endpoint espera um barcode de 8 dígitos numéricos. Verifique o código frontend - está passando entry.id ao invés de entry.barcode.` 
      }, 400);
    }
    
    // Validação: barcode deve ter exatamente 8 dígitos
    if (!barcode || barcode.length !== 8 || !/^\d{8}$/.test(barcode)) {
      console.error(`❌ Barcode inválido: ${barcode}`);
      return c.json({ 
        success: false, 
        error: `Barcode inválido: "${barcode}". Deve ter 8 dígitos numéricos.` 
      }, 400);
    }
    
    // IMPORTANTE: Força barcode como TEXT para evitar cast para UUID
    // Usa WHERE explícito com cast para garantir comparação correta
    const { data, error } = await supabaseAdmin
      .from('stock_entries')
      .delete()
      .eq('barcode', String(barcode))  // Garante que é string
      .select();
    
    if (error) {
      console.error('❌ Erro ao deletar pneu:', error.message);
      console.error('❌ Detalhes do erro:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️ Pneu não encontrado: ${barcode}`);
      return c.json({ success: false, error: "Pneu não encontrado" }, 404);
    }
    
    console.log(`✅ Pneu deletado com sucesso: ${barcode}`);
    return c.json({ success: true, message: "Pneu deletado com sucesso" });
  } catch (error: any) {
    console.error("❌ Erro fatal ao deletar pneu:", error);
    return c.json({ success: false, error: error?.message || 'Erro desconhecido' }, 500);
  }
});

// ============================================
// TIRE MOVEMENTS ENDPOINTS (Protegido)
// ============================================

app.get("/make-server-02726c7c/tire-movements", authMiddleware, async (c) => {
  try {
    const movements = await kv.get("tire_movements") || [];
    return c.json({ success: true, data: movements });
  } catch (error: any) {
    // Se tabela não existe, retorna array vazio silenciosamente (modo offline)
    const errorMsg = error?.message || error?.toString() || '';
    if (errorMsg.includes('kv_store') || errorMsg.includes('does not exist') || errorMsg.includes('schema cache')) {
      return c.json({ success: true, data: [] });
    }
    console.error("Error fetching tire movements:", error);
    return c.json({ success: false, error: errorMsg }, 500);
  }
});

app.post("/make-server-02726c7c/tire-movements", authMiddleware, async (c) => {
  try {
    const movement = await c.req.json();
    const movements = await kv.get("tire_movements") || [];
    
    // Add timestamp if not present
    if (!movement.timestamp) {
      movement.timestamp = new Date().toISOString();
    }
    
    movements.push(movement);
    await kv.set("tire_movements", movements);
    console.log("Tire movement saved:", movement.id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving tire movement:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Bulk save tire movements
app.put("/make-server-02726c7c/tire-movements", authMiddleware, async (c) => {
  try {
    const movements = await c.req.json();
    
    if (!Array.isArray(movements)) {
      return c.json({ success: false, error: "Invalid data format" }, 400);
    }
    
    await kv.set("tire_movements", movements);
    console.log(`Updated ${movements.length} tire movements in bulk`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating tire movements:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// TIRE CONSUMPTION ENDPOINTS (Protegido)
// ============================================

app.get("/make-server-02726c7c/tire-consumption", authMiddleware, async (c) => {
  try {
    const records = await kv.get("tire_consumption") || [];
    return c.json({ success: true, data: records });
  } catch (error: any) {
    // Se tabela não existe, retorna array vazio silenciosamente (modo offline)
    const errorMsg = error?.message || error?.toString() || '';
    if (errorMsg.includes('kv_store') || errorMsg.includes('does not exist') || errorMsg.includes('schema cache')) {
      return c.json({ success: true, data: [] });
    }
    console.error("Error fetching consumption records:", error);
    return c.json({ success: false, error: errorMsg }, 500);
  }
});

app.post("/make-server-02726c7c/tire-consumption", authMiddleware, async (c) => {
  try {
    const record = await c.req.json();
    const records = await kv.get("tire_consumption") || [];
    
    // Add timestamp if not present
    if (!record.timestamp) {
      record.timestamp = new Date().toISOString();
    }
    
    records.push(record);
    await kv.set("tire_consumption", records);
    console.log("Consumption record saved:", record.id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving consumption record:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Bulk save consumption records
app.put("/make-server-02726c7c/tire-consumption", authMiddleware, async (c) => {
  try {
    const records = await c.req.json();
    
    if (!Array.isArray(records)) {
      return c.json({ success: false, error: "Invalid data format" }, 400);
    }
    
    await kv.set("tire_consumption", records);
    console.log(`Updated ${records.length} consumption records in bulk`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating consumption records:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// DATABASE RESET ENDPOINT (Admin only)
// Limpa stock_entries, tire_movements e tire_consumption
// ============================================

/**
 * Reset Database - Remove todos os pneus, movimentações, consumos e descartes
 * POST /database/reset
 * Headers: Authorization: Bearer <token>
 * 
 * IMPORTANTE: Requer role de admin
 */
app.post("/make-server-02726c7c/database/reset", authMiddleware, adminMiddleware, async (c) => {
  try {
    console.log('🗑️ Resetando base de dados...');
    console.log('👤 Usuário:', c.get('userId'), '- Role:', c.get('userRole'));
    
    // Busca contagens antes de deletar
    const stockEntries = await kv.get("stock_entries") || [];
    const tireMovements = await kv.get("tire_movements") || [];
    const tireConsumption = await kv.get("tire_consumption") || [];
    const tireDiscards = await kv.get("tire_discards") || [];
    
    const counts = {
      stockEntries: stockEntries.length,
      tireMovements: tireMovements.length,
      tireConsumption: tireConsumption.length,
      tireDiscards: tireDiscards.length,
    };
    
    console.log(`📊 ANTES DO RESET:`);
    console.log(`   - stock_entries: ${counts.stockEntries} itens`);
    console.log(`   - tire_movements: ${counts.tireMovements} itens`);
    console.log(`   - tire_consumption: ${counts.tireConsumption} itens`);
    console.log(`   - tire_discards: ${counts.tireDiscards} itens`);
    
    // Limpa as 4 tabelas principais
    console.log('🧹 Limpando stock_entries...');
    await kv.set("stock_entries", []);
    console.log('🧹 Limpando tire_movements...');
    await kv.set("tire_movements", []);
    console.log('🧹 Limpando tire_consumption...');
    await kv.set("tire_consumption", []);
    console.log('🧹 Limpando tire_discards...');
    await kv.set("tire_discards", []);
    
    // Verifica se foi limpo
    const verifyStock = await kv.get("stock_entries") || [];
    const verifyMovements = await kv.get("tire_movements") || [];
    const verifyConsumption = await kv.get("tire_consumption") || [];
    const verifyDiscards = await kv.get("tire_discards") || [];
    
    console.log(`✅ APÓS O RESET:`);
    console.log(`   - stock_entries: ${verifyStock.length} itens`);
    console.log(`   - tire_movements: ${verifyMovements.length} itens`);
    console.log(`   - tire_consumption: ${verifyConsumption.length} itens`);
    console.log(`   - tire_discards: ${verifyDiscards.length} itens`);
    
    if (verifyStock.length > 0 || verifyMovements.length > 0 || verifyConsumption.length > 0 || verifyDiscards.length > 0) {
      console.error('⚠️ AVISO: Algumas tabelas não foram completamente limpas!');
    } else {
      console.log('✅ Base de dados resetada com sucesso - TODAS as tabelas estão vazias');
    }
    
    return c.json({ 
      success: true,
      message: 'Base de dados resetada com sucesso',
      deleted: counts,
      verified: {
        stockEntries: verifyStock.length,
        tireMovements: verifyMovements.length,
        tireConsumption: verifyConsumption.length,
        tireDiscards: verifyDiscards.length,
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao resetar base de dados:', error);
    console.error('Stack trace:', error.stack);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao resetar base de dados' 
    }, 500);
  }
});

// ============================================
// MASTER DATA ENDPOINTS (Admin only)
// Dados mestres do sistema - USA TABELA SQL
// ============================================

/**
 * GET /master-data - Retorna todos os dados mestres organizados por tipo
 * ATUALIZADO: Busca das tabelas separadas (setor, projeto, conta_contabil) + master_data para retrocompatibilidade
 */
app.get("/make-server-02726c7c/master-data", authMiddleware, async (c) => {
  try {
    const masterData: Record<string, any[]> = {};
    
    // 1. Busca dados da tabela setor
    const { data: setores, error: setorError } = await supabaseAdmin
      .from('setor')
      .select('*')
      .order('setor', { ascending: true });
    
    if (setores && !setorError) {
      masterData.setor = setores.map((item: any) => ({
        id: item.id,
        type: 'setor',
        name: item.setor || item.name, // Suporta ambos os nomes (transição)
        description: item.descricao || item.description || '',
        responsavel: item.responsavel || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
      console.log(`✅ Setores carregados: ${setores.length} registros`);
    }
    
    // 2. Busca dados da tabela projeto
    const { data: projetos, error: projetoError } = await supabaseAdmin
      .from('projeto')
      .select('*')
      .order('projeto', { ascending: true });
    
    if (projetos && !projetoError) {
      masterData.projeto = projetos.map((item: any) => ({
        id: item.id,
        type: 'projeto',
        name: item.projeto,
        description: item.descricao,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        temporada: item.temporada,
      }));
      console.log(`✅ Projetos carregados: ${projetos.length} registros`);
    }
    
    // 3. Busca dados da tabela conta_contabil
    const { data: contas, error: contaError } = await supabaseAdmin
      .from('conta_contabil')
      .select('*')
      .order('Conta Contábil', { ascending: true });
    
    if (contas && !contaError) {
      masterData.conta_contabil = contas.map((item: any) => ({
        id: item.id,
        type: 'conta_contabil',
        name: item['Conta Contábil'] || item.conta_contabil || item.name,
        description: item.descricao || item.description || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
      console.log(`✅ Contas contábeis carregadas: ${contas.length} registros`);
    }
    
    // 4. Busca dados da tabela master_data (para retrocompatibilidade com outros tipos)
    const { data: legacyData, error: legacyError } = await supabaseAdmin
      .from('master_data')
      .select('*')
      .order('name', { ascending: true });
    
    if (legacyData && !legacyError) {
      legacyData.forEach((item: any) => {
        // Pula tipos que já foram buscados nas tabelas específicas
        if (['setor', 'projeto', 'conta_contabil'].includes(item.type)) {
          return;
        }
        
        if (!masterData[item.type]) {
          masterData[item.type] = [];
        }
        
        const masterItem: any = {
          id: item.id,
          type: item.type,
          name: item.name,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
        
        // Adiciona campos opcionais se existirem
        if (item.description !== undefined && item.description !== null) masterItem.description = item.description;
        if (item.responsavel !== undefined && item.responsavel !== null) masterItem.responsavel = item.responsavel;
        if (item.address !== undefined && item.address !== null) masterItem.address = item.address;
        if (item.coordinates !== undefined && item.coordinates !== null) masterItem.coordinates = item.coordinates;
        if (item.latitude !== undefined && item.latitude !== null) masterItem.latitude = item.latitude;
        if (item.longitude !== undefined && item.longitude !== null) masterItem.longitude = item.longitude;
        
        masterData[item.type].push(masterItem);
      });
      console.log(`✅ Master data legado carregado`);
    }
    
    console.log(`✅ Master data carregado: ${Object.keys(masterData).length} tipos`);
    
    return c.json({ success: true, data: masterData });
  } catch (error: any) {
    console.error('❌ Erro ao buscar master data:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /master-data - Salva ou atualiza um item de master data
 * ATUALIZADO: Salva nas tabelas específicas (setor, projeto, conta_contabil) ou master_data
 */
app.post("/make-server-02726c7c/master-data", authMiddleware, adminMiddleware, async (c) => {
  try {
    const item = await c.req.json();
    
    if (!item.id || !item.type || !item.name) {
      return c.json({ 
        success: false, 
        error: 'Item deve conter id, type e name' 
      }, 400);
    }
    
    // Determina a tabela correta baseada no tipo
    let tableName = 'master_data';
    let dataToSave: any = {};
    
    if (item.type === 'setor') {
      tableName = 'setor';
      dataToSave = {
        id: item.id,
        setor: item.name,
        descricao: item.description || null,
        responsavel: item.responsavel || null,
        updated_at: new Date().toISOString(),
      };
    } else if (item.type === 'projeto') {
      tableName = 'projeto';
      dataToSave = {
        id: item.id,
        projeto: item.name,
        descricao: item.description || null,
        temporada: item.temporada || new Date().getFullYear(),
        updated_at: new Date().toISOString(),
      };
    } else if (item.type === 'conta_contabil') {
      tableName = 'conta_contabil';
      dataToSave = {
        id: item.id,
        'Conta Contábil': item.name,
        descricao: item.description || null,
        updated_at: new Date().toISOString(),
      };
    } else {
      // Para outros tipos, usa master_data
      dataToSave = {
        id: item.id,
        type: item.type,
        name: item.name,
        updated_at: new Date().toISOString(),
      };
      
      // Adiciona campos opcionais se existirem
      if (item.description !== undefined) dataToSave.description = item.description;
      if (item.responsavel !== undefined) dataToSave.responsavel = item.responsavel;
      if (item.address !== undefined) dataToSave.address = item.address;
      if (item.coordinates !== undefined) dataToSave.coordinates = item.coordinates;
      if (item.latitude !== undefined) dataToSave.latitude = item.latitude;
      if (item.longitude !== undefined) dataToSave.longitude = item.longitude;
    }
    
    // Verifica se já existe um item com esse ID
    const { data: existing } = await supabaseAdmin
      .from(tableName)
      .select('id')
      .eq('id', item.id)
      .single();
    
    if (existing) {
      // Update
      const { error } = await supabaseAdmin
        .from(tableName)
        .update(dataToSave)
        .eq('id', item.id);
      
      if (error) {
        console.error(`❌ Erro ao atualizar ${tableName}:`, error);
        return c.json({ success: false, error: error.message }, 500);
      }
      
      console.log(`✅ ${tableName} atualizado: ${item.name}`);
    } else {
      // Insert
      const insertData = {
        ...dataToSave,
        created_at: item.createdAt || new Date().toISOString(),
      };
      
      const { error } = await supabaseAdmin
        .from(tableName)
        .insert(insertData);
      
      if (error) {
        // Se erro for de constraint unique
        if (error.code === '23505') {
          return c.json({ 
            success: false, 
            error: 'Já existe um item com este nome nesta categoria' 
          }, 400);
        }
        
        console.error(`❌ Erro ao inserir ${tableName}:`, error);
        return c.json({ success: false, error: error.message }, 500);
      }
      
      console.log(`✅ ${tableName} criado: ${item.name}`);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro ao salvar master data:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /master-data/:id - Remove um item de master data
 * ATUALIZADO: Tenta deletar de todas as tabelas possíveis
 */
app.delete("/make-server-02726c7c/master-data/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    
    // Tenta deletar de todas as tabelas possíveis (setor, projeto, conta_contabil, master_data)
    const tables = ['setor', 'projeto', 'conta_contabil', 'master_data'];
    let deleted = false;
    
    for (const table of tables) {
      const { error, count } = await supabaseAdmin
        .from(table)
        .delete({ count: 'exact' })
        .eq('id', id);
      
      if (!error && count && count > 0) {
        deleted = true;
        console.log(`✅ Item removido de ${table}: ${id}`);
        break;
      }
    }
    
    if (!deleted) {
      console.error(`❌ Item não encontrado em nenhuma tabela: ${id}`);
      return c.json({ success: false, error: 'Item não encontrado' }, 404);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro ao deletar master data:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// TIRE STATUS ENDPOINTS
// ============================================
// NOTA: Endpoints movidos para linha ~2747 (integração Supabase direta)

// ============================================
// USER MANAGEMENT ENDPOINTS (Admin only)
// Gerenciamento completo de usuários via Supabase Auth
// ============================================

/**
 * GET /users - Lista todos os usuários do Supabase Auth
 * Requer: Admin
 */
app.get("/make-server-02726c7c/users", authMiddleware, adminMiddleware, async (c) => {
  try {
    console.log('📋 Listando usuários do Supabase Auth...');
    
    // Lista TODOS os usuários (Auth Admin API não tem paginação na listagem)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Erro ao listar usuários:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    // Formata os usuários para o formato esperado pelo frontend
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email || '',
      username: user.user_metadata?.username || user.email?.split('@')[0] || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || '',
      role: user.user_metadata?.role || 'operator',
      profileId: user.user_metadata?.profileId || user.user_metadata?.role || 'operator',
      active: true, // Supabase Auth não tem campo "active", consideramos todos ativos
      createdAt: user.created_at,
    }));
    
    console.log(`✅ ${formattedUsers.length} usuário(s) encontrado(s)`);
    
    return c.json({ 
      success: true, 
      data: formattedUsers 
    });
  } catch (error: any) {
    console.error('❌ Erro ao listar usuários:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao listar usuários' 
    }, 500);
  }
});

/**
 * GET /users/me - Retorna dados do usuário autenticado
 * Requer: Auth
 */
app.get("/make-server-02726c7c/users/me", authMiddleware, async (c) => {
  try {
    const user = c.get('user'); // Vem do authMiddleware
    
    if (!user) {
      return c.json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      }, 401);
    }
    
    return c.json({ 
      success: true, 
      data: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        role: user.user_metadata?.role || 'operator',
        profileId: user.user_metadata?.profileId || user.user_metadata?.role || 'operator',
        isAdmin: user.user_metadata?.role === 'admin',
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados do usuário:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * POST /users - Cria novo usuário
 * Requer: Admin
 */
app.post("/make-server-02726c7c/users", authMiddleware, adminMiddleware, async (c) => {
  try {
    const { email, password, name, username, role, profileId } = await c.req.json();
    
    console.log(`👤 Criando novo usuário: ${email} (${role})`);
    
    // Validações
    if (!email || !password || !name) {
      return c.json({ 
        success: false, 
        error: 'Email, senha e nome são obrigatórios' 
      }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Senha deve ter pelo menos 6 caracteres' 
      }, 400);
    }
    
    // Cria usuário via Admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirma email
      user_metadata: {
        name: name.trim(),
        username: username || email.split('@')[0],
        role: role || 'operator',
        profileId: profileId || role || 'operator', // ✅ SALVA PROFILE_ID
      },
    });
    
    if (error) {
      console.error('❌ Erro ao criar usuário:', error);
      
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return c.json({ 
          success: false, 
          error: 'Este email já está cadastrado' 
        }, 400);
      }
      
      return c.json({ 
        success: false, 
        error: error.message 
      }, 400);
    }
    
    console.log(`✅ Usuário criado: ${email} com profileId=${profileId || role}`);
    
    return c.json({ 
      success: true, 
      data: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role,
        profileId: data.user.user_metadata.profileId,
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar usuário:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao criar usuário' 
    }, 500);
  }
});

/**
 * PUT /users/:id - Atualiza usuário existente
 * Requer: Admin
 */
app.put("/make-server-02726c7c/users/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const userId = c.req.param('id');
    const requestData = await c.req.json();
    const { email, password, name, username, role, profileId } = requestData;
    
    console.log(`✏️ Atualizando usuário ${userId}`);
    console.log(`📥 Dados recebidos:`, requestData);
    console.log(`🔐 ProfileId recebido: ${profileId}`);
    
    // Prepara dados para atualização
    const updateData: any = {
      user_metadata: {
        name: name?.trim(),
        username: username || email?.split('@')[0],
        role: role || 'operator',
        profileId: profileId || role || 'operator', // ✅ ATUALIZA PROFILE_ID
      }
    };
    
    // Só atualiza email se fornecido
    if (email) {
      updateData.email = email.trim().toLowerCase();
    }
    
    // Só atualiza senha se fornecida
    if (password && password.trim()) {
      if (password.length < 6) {
        return c.json({ 
          success: false, 
          error: 'Senha deve ter pelo menos 6 caracteres' 
        }, 400);
      }
      updateData.password = password;
    }
    
    // Atualiza usuário via Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    );
    
    if (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    console.log(`✅ Usuário atualizado: ${data.user.email} com profileId=${profileId}`);
    
    return c.json({ 
      success: true, 
      data: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role,
        profileId: data.user.user_metadata.profileId,
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar usuário:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao atualizar usuário' 
    }, 500);
  }
});

/**
 * DELETE /users/:id - Remove usuário
 * Requer: Admin
 */
app.delete("/make-server-02726c7c/users/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const userId = c.req.param('id');
    
    console.log(`🗑️ Removendo usuário: ${userId}`);
    
    // Remove usuário via Admin API
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('❌ Erro ao deletar usuário:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    console.log(`✅ Usuário removido: ${userId}`);
    
    return c.json({ 
      success: true,
      message: 'Usuário removido com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao deletar usuário:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao deletar usuário' 
    }, 500);
  }
});

// ============================================
// ACCESS PROFILES ENDPOINTS (Admin only)
// Gerenciamento de perfis de acesso (RBAC)
// ============================================

/**
 * GET /access-profiles - Lista todos os perfis de acesso
 * Requer: Auth
 */
app.get("/make-server-02726c7c/access-profiles", authMiddleware, async (c) => {
  try {
    console.log('📋 Listando perfis de acesso...');
    
    // Busca todos os perfis na tabela access_profiles
    const { data: profiles, error } = await supabaseAdmin
      .from('access_profiles')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('❌ Erro ao buscar perfis:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('ℹ️ Nenhum perfil encontrado');
      return c.json({ 
        success: true, 
        data: [] 
      });
    }
    
    console.log(`✅ ${profiles.length} perfil(is) encontrado(s)`);
    
    // Formata os dados para camelCase
    const formattedProfiles = profiles.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      pages: p.pages,
      features: p.features,
      isDefault: p.is_default,
      isSystem: p.is_system,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    
    return c.json({ 
      success: true, 
      data: formattedProfiles 
    });
  } catch (error: any) {
    console.error('❌ Erro ao listar perfis:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao listar perfis' 
    }, 500);
  }
});

/**
 * POST /access-profiles - Cria novo perfil de acesso
 * Requer: Admin
 */
app.post("/make-server-02726c7c/access-profiles", authMiddleware, adminMiddleware, async (c) => {
  try {
    const { id, name, description, pages, features, isDefault, isSystem } = await c.req.json();
    
    console.log(`✨ Criando novo perfil: ${name}`);
    
    // Validações
    if (!id || !name) {
      return c.json({ 
        success: false, 
        error: 'ID e nome são obrigatórios' 
      }, 400);
    }
    
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return c.json({ 
        success: false, 
        error: 'O perfil deve ter ao menos uma página' 
      }, 400);
    }
    
    // Insere novo perfil na tabela access_profiles
    const { data, error } = await supabaseAdmin
      .from('access_profiles')
      .insert({
        id,
        name,
        description: description || '',
        pages: pages || [],
        features: features || [],
        is_default: isDefault || false,
        is_system: isSystem || false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar perfil:', error);
      
      if (error.code === '23505') { // Unique violation
        return c.json({ 
          success: false, 
          error: 'Já existe um perfil com este ID' 
        }, 400);
      }
      
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    console.log(`✅ Perfil criado: ${name}`);
    
    return c.json({ 
      success: true, 
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        pages: data.pages,
        features: data.features,
        isDefault: data.is_default,
        isSystem: data.is_system,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar perfil:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao criar perfil' 
    }, 500);
  }
});

/**
 * PUT /access-profiles/:id - Atualiza perfil existente
 * Requer: Admin
 */
app.put("/make-server-02726c7c/access-profiles/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const profileId = c.req.param('id');
    const { name, description, pages, features, isDefault, isSystem } = await c.req.json();
    
    console.log(`✏️ Atualizando perfil: ${profileId}`);
    
    // Verifica se perfil existe
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('access_profiles')
      .select('is_system, name')
      .eq('id', profileId)
      .single();
    
    if (fetchError || !existing) {
      return c.json({ 
        success: false, 
        error: 'Perfil não encontrado' 
      }, 404);
    }
    
    console.log(`📋 Editando: "${existing.name}" (is_system=${existing.is_system})`);
    
    // Atualiza perfil
    const { data, error } = await supabaseAdmin
      .from('access_profiles')
      .update({
        name,
        description: description || '',
        pages: pages || [],
        features: features || [],
        is_default: isDefault || false,
        is_system: isSystem !== undefined ? isSystem : existing.is_system,
      })
      .eq('id', profileId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    console.log(`✅ Perfil atualizado: ${name}`);
    
    return c.json({ 
      success: true, 
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        pages: data.pages,
        features: data.features,
        isDefault: data.is_default,
        isSystem: data.is_system,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar perfil:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao atualizar perfil' 
    }, 500);
  }
});

/**
 * DELETE /access-profiles/:id - Remove perfil
 * Requer: Admin
 */
app.delete("/make-server-02726c7c/access-profiles/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const profileId = c.req.param('id');
    
    console.log(`🗑️ Removendo perfil: ${profileId}`);
    
    // Verifica se perfil existe e se não é do sistema
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('access_profiles')
      .select('is_system, name')
      .eq('id', profileId)
      .single();
    
    if (fetchError || !existing) {
      return c.json({ 
        success: false, 
        error: 'Perfil não encontrado' 
      }, 404);
    }
    
    // Não permite deletar perfis de sistema
    if (existing.is_system) {
      return c.json({ 
        success: false, 
        error: 'Perfis do sistema não podem ser deletados' 
      }, 403);
    }
    
    // Remove perfil
    const { error } = await supabaseAdmin
      .from('access_profiles')
      .delete()
      .eq('id', profileId);
    
    if (error) {
      console.error('❌ Erro ao deletar perfil:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    console.log(`✅ Perfil removido: ${existing.name}`);
    
    return c.json({ 
      success: true,
      message: 'Perfil removido com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao deletar perfil:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erro ao deletar perfil' 
    }, 500);
  }
});

// ============================================
// SETUP INICIAL - Cria primeiro admin
// ============================================

app.post("/make-server-02726c7c/setup-admin", async (c) => {
  try {
    // Deleta usuário existente se houver
    try {
      await supabaseAdmin.auth.admin.deleteUser('8f5a7abd-9ec6-41b3-a418-e74844411874');
    } catch (e) {
      // Ignora erro se usuário não existir
    }
    
    // Cria novo usuário admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'rafaborgesg@gmail.com',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        name: 'Rafael Borges',
        role: 'admin'
      }
    });
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ 
      success: true, 
      message: 'Admin criado com sucesso',
      credentials: {
        email: 'rafaborgesg@gmail.com',
        password: 'Admin123!'
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// TIRE STATUS ENDPOINTS - SUPABASE DIRETO (Protegido)
// ============================================

// GET - Listar todos os status
app.get("/make-server-02726c7c/tire-status", authMiddleware, async (c) => {
  try {
    console.log('📦 Buscando status de pneus da tabela tire_status...');
    
    const { data, error } = await supabaseAdmin
      .from('tire_status')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar status:', error);
      
      // Se tabela não existe, retorna array vazio
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('ℹ️ Tabela tire_status não existe. Execute SETUP_DATABASE.sql');
        return c.json({ 
          success: true, 
          data: [],
          warning: 'Tabela não configurada. Execute SETUP_DATABASE.sql'
        });
      }
      
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ ${data?.length || 0} status encontrados`);
    return c.json({ success: true, data: data || [] });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao buscar status:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST - Criar novo status (apenas admin)
app.post("/make-server-02726c7c/tire-status", authMiddleware, adminMiddleware, async (c) => {
  try {
    const status = await c.req.json();
    
    console.log(`📝 Criando novo status: ${status.name}`);
    
    // Validação
    if (!status.name || !status.color) {
      return c.json({ 
        success: false, 
        error: 'Nome e cor são obrigatórios' 
      }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('tire_status')
      .insert([{
        name: status.name,
        color: status.color
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar status:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Status criado: ${data.id}`);
    return c.json({ success: true, data });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao criar status:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT - Atualizar status existente (apenas admin)
app.put("/make-server-02726c7c/tire-status/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    console.log(`📝 Atualizando status: ${id}`);

    const { data, error } = await supabaseAdmin
      .from('tire_status')
      .update({
        name: updates.name,
        color: updates.color
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!data) {
      return c.json({ success: false, error: 'Status não encontrado' }, 404);
    }

    console.log(`✅ Status atualizado: ${id}`);
    return c.json({ success: true, data });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao atualizar status:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE - Remover status (apenas admin)
app.delete("/make-server-02726c7c/tire-status/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    
    console.log(`🗑️ Deletando status: ${id}`);
    
    // Verifica se há pneus usando este status
    const { data: stockEntries } = await supabaseAdmin
      .from('kv_store_18cdc61b')
      .select('value')
      .eq('key', 'stock_entries')
      .single();
    
    if (stockEntries) {
      const entries = stockEntries.value as any[];
      const hasEntries = entries.some((entry: any) => entry.statusId === id);
      
      if (hasEntries) {
        return c.json({ 
          success: false, 
          error: 'Não é possível excluir status que está sendo usado por pneus' 
        }, 400);
      }
    }

    const { error } = await supabaseAdmin
      .from('tire_status')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar status:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Status deletado: ${id}`);
    return c.json({ success: true });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao deletar status:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// USER MANAGEMENT - Gerenciamento de Usuários
// ============================================
// NOTA: As rotas de usuários estão definidas nas linhas 2114-2375
// Não duplicar rotas aqui para evitar conflitos

// ============================================
// CONTAINERS ENDPOINTS - SUPABASE DIRETO (Protegido)
// ============================================

// GET - Listar todos os contêineres com ocupação real
app.get("/make-server-02726c7c/containers", authMiddleware, async (c) => {
  try {
    console.log('📦 Buscando contêineres da tabela containers...');
    
    const { data, error } = await supabaseAdmin
      .from('containers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar contêineres:', error);
      
      // Se tabela não existe, retorna vazio
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('ℹ️ Tabela containers não existe. Execute SETUP_DATABASE.sql');
        return c.json({ 
          success: true, 
          data: [],
          warning: 'Tabela não configurada. Execute SETUP_DATABASE.sql'
        });
      }
      
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ ${data?.length || 0} contêineres encontrados`);
    
    // Log da ocupação de cada container
    if (data && data.length > 0) {
      console.log('📊 Ocupação dos contêineres:');
      data.forEach((container: any) => {
        const percentage = container.capacity > 0 
          ? ((container.current_stock / container.capacity) * 100).toFixed(1) 
          : '0';
        console.log(`  - ${container.name}: ${container.current_stock}/${container.capacity} (${percentage}%)`);
      });
    }
    
    return c.json({ success: true, data: data || [] });
    
  } catch (error: any) {
    console.error('❌ Erro fatal ao buscar contêineres:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// BUSINESS RULES ENDPOINTS
// Armazenadas na tabela business_rules (estruturada)
// ============================================

// Helper: Regras padrão do sistema
function getDefaultBusinessRules() {
  return {
    wildcardRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 8 },
    ],
    tirePurchaseRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 3 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 3 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 3 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 3 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 1 },
    ],
    wetTirePurchaseRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 4 },
    ],
  };
}

// GET - Buscar regras de negócio da tabela business_rules
app.get("/make-server-02726c7c/business-rules", authMiddleware, async (c) => {
  try {
    console.log('📋 Buscando regras de negócio da tabela business_rules...');
    
    // Busca todas as regras na tabela business_rules usando SERVICE_ROLE_KEY
    const { data, error } = await supabaseAdmin
      .from('business_rules')
      .select('*')
      .order('categoria', { ascending: true })
      .order('campeonato', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar regras:', error);
      
      // Se tabela não existe, loga instruções
      if (error.code === 'PGRST116' || error.message?.includes('business_rules')) {
        console.error('');
        console.error('🚨 TABELA business_rules NÃO ENCONTRADA!');
        console.error('');
        console.error('Execute a migration:');
        console.error('1. Abra: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql');
        console.error('2. Copie o conteúdo de: MIGRATION_BUSINESS_RULES_TABLE.sql');
        console.error('3. Cole no SQL Editor e clique em RUN');
        console.error('');
      }
      
      // Retorna regras padrão
      console.log('ℹ️ Usando regras padrão');
      return c.json(getDefaultBusinessRules());
    }
    
    // Se não há dados, inicializa com regras padrão
    if (!data || data.length === 0) {
      console.log('ℹ️ Nenhuma regra encontrada, usando regras padrão');
      return c.json(getDefaultBusinessRules());
    }
    
    // Organiza as regras por tipo (usando colunas estruturadas)
    const rules: any = {
      wildcardRules: [],
      tirePurchaseRules: [],
      wetTirePurchaseRules: [],
    };
    
    data.forEach(row => {
      const ruleData = {
        categoria: row.categoria,
        campeonato: row.campeonato,
        quantidade: row.quantidade,
      };
      
      if (row.rule_type === 'curinga') {
        rules.wildcardRules.push(ruleData);
      } else if (row.rule_type === 'slick') {
        rules.tirePurchaseRules.push(ruleData);
      } else if (row.rule_type === 'wet') {
        rules.wetTirePurchaseRules.push(ruleData);
      }
    });
    
    // Se alguma lista está vazia, usa valores padrão
    const defaultRules = getDefaultBusinessRules();
    if (rules.wildcardRules.length === 0) {
      rules.wildcardRules = defaultRules.wildcardRules;
    }
    if (rules.tirePurchaseRules.length === 0) {
      rules.tirePurchaseRules = defaultRules.tirePurchaseRules;
    }
    if (rules.wetTirePurchaseRules.length === 0) {
      rules.wetTirePurchaseRules = defaultRules.wetTirePurchaseRules;
    }
    
    console.log(`✅ Regras carregadas: ${data.length} registros`);
    return c.json(rules);
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar regras:', error);
    return c.json(getDefaultBusinessRules());
  }
});

// POST - Salvar regras de negócio na tabela business_rules (apenas admin)
app.post("/make-server-02726c7c/business-rules", authMiddleware, adminMiddleware, async (c) => {
  try {
    const rules = await c.req.json();
    
    console.log('💾 Salvando regras de negócio na business_rules...');
    
    // Validação básica
    if (!rules.wildcardRules || !rules.tirePurchaseRules || !rules.wetTirePurchaseRules) {
      return c.json({ 
        success: false, 
        error: 'Estrutura de regras inválida' 
      }, 400);
    }
    
    // 1. Remove todas as regras existentes usando SERVICE_ROLE_KEY (bypass RLS)
    const { error: deleteError } = await supabaseAdmin
      .from('business_rules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo
    
    if (deleteError) {
      console.error('❌ Erro ao remover regras antigas:', deleteError);
      return c.json({ success: false, error: deleteError.message }, 500);
    }
    
    // 2. Prepara novos registros (estrutura de colunas)
    const newRecords: any[] = [];
    
    // Regras de Coringas (curinga)
    rules.wildcardRules.forEach((rule: any) => {
      newRecords.push({
        rule_type: 'curinga',
        categoria: rule.categoria,
        campeonato: rule.campeonato,
        quantidade: rule.quantidade,
      });
    });
    
    // Regras de Pneus SLICK (slick)
    rules.tirePurchaseRules.forEach((rule: any) => {
      newRecords.push({
        rule_type: 'slick',
        categoria: rule.categoria,
        campeonato: rule.campeonato,
        quantidade: rule.quantidade,
      });
    });
    
    // Regras de Pneus WET (wet)
    rules.wetTirePurchaseRules.forEach((rule: any) => {
      newRecords.push({
        rule_type: 'wet',
        categoria: rule.categoria,
        campeonato: rule.campeonato,
        quantidade: rule.quantidade,
      });
    });
    
    // 3. Insere novos registros usando SERVICE_ROLE_KEY (bypass RLS)
    // O ID será gerado automaticamente pelo DEFAULT gen_random_uuid()
    const { error: insertError } = await supabaseAdmin
      .from('business_rules')
      .insert(newRecords);
    
    if (insertError) {
      console.error('❌ Erro ao inserir novas regras:', insertError);
      return c.json({ success: false, error: insertError.message }, 500);
    }
    
    console.log(`✅ ${newRecords.length} regras salvas com sucesso`);
    return c.json({ success: true, data: rules });
    
  } catch (error: any) {
    console.error('❌ Erro ao salvar regras:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// DATABASE RESET ENDPOINT
// ============================================

/**
 * POST /make-server-02726c7c/database/reset
 * Reseta a base de dados: limpa stock_entries, tire_movements, tire_consumption e tire_discards
 * Preserva: tire_models, containers, tire_status, users
 * APENAS ADMIN
 */
app.post("/make-server-02726c7c/database/reset", authMiddleware, adminMiddleware, async (c) => {
  try {
    console.log('🗑️ Iniciando reset da base de dados...');
    
    const deleted = {
      stockEntries: 0,
      tireMovements: 0,
      tireConsumption: 0,
      tireDiscards: 0,
    };
    
    // 1. Deleta stock_entries (usa SERVICE_ROLE_KEY para bypass RLS)
    const { error: stockError, count: stockCount } = await supabaseAdmin
      .from('stock_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo
    
    if (stockError) {
      console.error('❌ Erro ao deletar stock_entries:', stockError);
      return c.json({ 
        success: false, 
        error: `Erro ao deletar pneus: ${stockError.message}` 
      }, 500);
    }
    
    deleted.stockEntries = stockCount || 0;
    console.log(`✅ ${deleted.stockEntries} registros deletados de stock_entries`);
    
    // 2. Deleta tire_movements
    const { error: movementsError, count: movementsCount } = await supabaseAdmin
      .from('tire_movements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (movementsError) {
      console.error('❌ Erro ao deletar tire_movements:', movementsError);
      // Continua mesmo com erro (tabela pode não existir)
    } else {
      deleted.tireMovements = movementsCount || 0;
      console.log(`✅ ${deleted.tireMovements} registros deletados de tire_movements`);
    }
    
    // 3. Deleta tire_consumption
    const { error: consumptionError, count: consumptionCount } = await supabaseAdmin
      .from('tire_consumption')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (consumptionError) {
      console.error('❌ Erro ao deletar tire_consumption:', consumptionError);
      // Continua mesmo com erro
    } else {
      deleted.tireConsumption = consumptionCount || 0;
      console.log(`✅ ${deleted.tireConsumption} registros deletados de tire_consumption`);
    }
    
    // 4. Deleta tire_discards
    const { error: discardsError, count: discardsCount } = await supabaseAdmin
      .from('tire_discards')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (discardsError) {
      console.error('❌ Erro ao deletar tire_discards:', discardsError);
      // Continua mesmo com erro
    } else {
      deleted.tireDiscards = discardsCount || 0;
      console.log(`✅ ${deleted.tireDiscards} registros deletados de tire_discards`);
    }
    
    // 5. Verifica se as tabelas estão realmente vazias
    const { data: stockCheck } = await supabaseAdmin
      .from('stock_entries')
      .select('id', { count: 'exact', head: true });
    
    const { data: movementsCheck } = await supabaseAdmin
      .from('tire_movements')
      .select('id', { count: 'exact', head: true });
    
    const { data: consumptionCheck } = await supabaseAdmin
      .from('tire_consumption')
      .select('id', { count: 'exact', head: true });
    
    const { data: discardsCheck } = await supabaseAdmin
      .from('tire_discards')
      .select('id', { count: 'exact', head: true });
    
    const verified = {
      stockEntries: (stockCheck as any)?.count || 0,
      tireMovements: (movementsCheck as any)?.count || 0,
      tireConsumption: (consumptionCheck as any)?.count || 0,
      tireDiscards: (discardsCheck as any)?.count || 0,
    };
    
    console.log('✅ Reset completado:', {
      deleted,
      verified,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({
      success: true,
      message: 'Base de dados resetada com sucesso',
      deleted,
      verified,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Erro fatal no reset:', error);
    return c.json({ 
      success: false, 
      error: `Erro ao resetar base: ${error.message}` 
    }, 500);
  }
});

// ============================================
// GAS PROGRAMMING ENDPOINTS
// Programação e controle de gases por etapa
// ============================================

/**
 * GET /gas-programming - Lista todas as programações de gases
 * Query params: pista, etapa, temporada
 */
app.get("/make-server-02726c7c/gas-programming", authMiddleware, async (c) => {
  try {
    const { pista, etapa, temporada } = c.req.query();
    
    let query = supabaseAdmin
      .from('gas_programming')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (pista) query = query.eq('pista', pista);
    if (etapa) query = query.eq('etapa', etapa);
    if (temporada) query = query.eq('temporada', temporada);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Erro ao buscar programação de gases:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    return c.json({ 
      success: true, 
      data: data || [] 
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar programação de gases:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * POST /gas-programming - Cria nova programação de gás
 */
app.post("/make-server-02726c7c/gas-programming", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    
    const { data, error } = await supabaseAdmin
      .from('gas_programming')
      .insert({
        ...body,
        created_by: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar programação de gás:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    return c.json({ 
      success: true, 
      data 
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar programação de gás:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * PUT /gas-programming/:id - Atualiza programação de gás
 */
app.put("/make-server-02726c7c/gas-programming/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { data, error } = await supabaseAdmin
      .from('gas_programming')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar programação de gás:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    return c.json({ 
      success: true, 
      data 
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar programação de gás:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * DELETE /gas-programming/:id - Remove programação de gás
 */
app.delete("/make-server-02726c7c/gas-programming/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    
    const { error } = await supabaseAdmin
      .from('gas_programming')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro ao deletar programação de gás:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    return c.json({ 
      success: true 
    });
  } catch (error: any) {
    console.error('❌ Erro ao deletar programação de gás:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * GET /gas-programming/stats - Estatísticas de programação de gases
 * Query params: pista, temporada
 */
app.get("/make-server-02726c7c/gas-programming/stats", authMiddleware, async (c) => {
  try {
    const { pista, temporada } = c.req.query();
    
    let query = supabaseAdmin
      .from('gas_programming')
      .select('*');
    
    if (pista) query = query.eq('pista', pista);
    if (temporada) query = query.eq('temporada', temporada);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Erro ao buscar stats de gases:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
    
    // Processar estatísticas
    const stats = {
      totalProgramado: data?.length || 0,
      porStatus: {} as Record<string, number>,
      porCategoria: {} as Record<string, number>,
      porGas: {} as Record<string, number>,
      historicoEtapas: [] as Array<{ etapa: string; pista: string; total: number }>
    };
    
    if (data) {
      data.forEach(item => {
        // Por status
        stats.porStatus[item.status] = (stats.porStatus[item.status] || 0) + 1;
        
        // Por categoria
        stats.porCategoria[item.categoria] = (stats.porCategoria[item.categoria] || 0) + 1;
        
        // Por tipo de gás
        stats.porGas[item.gas_type] = (stats.porGas[item.gas_type] || 0) + 1;
      });
      
      // Histórico por etapas
      const etapasMap = new Map<string, { etapa: string; pista: string; total: number }>();
      data.forEach(item => {
        const key = `${item.pista}-${item.etapa}`;
        if (etapasMap.has(key)) {
          etapasMap.get(key)!.total++;
        } else {
          etapasMap.set(key, {
            etapa: item.etapa,
            pista: item.pista,
            total: 1
          });
        }
      });
      stats.historicoEtapas = Array.from(etapasMap.values());
    }
    
    return c.json({ 
      success: true, 
      data: stats 
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar stats de gases:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 🔧 MIGRATION - Corrigir política RLS conference_sessions
 * POST /make-server-02726c7c/migrations/fix-rls-conference-sessions
 * 
 * Endpoint para aplicar a correção da política RLS que bloqueia
 * o UPDATE quando is_active = false
 */
app.post("/make-server-02726c7c/migrations/fix-rls-conference-sessions", async (c) => {
  try {
    console.log('🔧 Executando migration: FIX_RLS_CONFERENCE_SESSIONS_UPDATE');
    
    // Tenta executar SQL direto via query raw
    const migrationSQL = `
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (is_active = true)
  WITH CHECK (true);
    `.trim();
    
    console.log('📝 Tentando executar SQL diretamente...');
    
    try {
      // Tenta via conexão direta ao Postgres
      const dbUrl = Deno.env.get('SUPABASE_DB_URL');
      if (dbUrl) {
        const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
        const client = new Client(dbUrl);
        await client.connect();
        
        console.log('🔌 Conectado ao Postgres. Executando migration...');
        await client.queryArray(migrationSQL);
        await client.end();
        
        console.log('✅ Migration executada com sucesso via Postgres!');
        
        return c.json({ 
          success: true, 
          message: '✅ Migration executada com sucesso! O erro RLS foi corrigido.',
          details: 'A política de segurança foi atualizada para permitir desativar sessões.'
        });
      }
    } catch (dbError: any) {
      console.warn('⚠️ Não foi possível executar via Postgres:', dbError.message);
    }
    
    // Fallback: retorna SQL para execução manual
    console.log('📋 Retornando SQL para execução manual...');
    return c.json({ 
      success: false,
      needsManualExecution: true,
      message: 'Execute o SQL abaixo no Supabase SQL Editor',
      sql: migrationSQL,
      instruction: 'Copie o SQL acima e execute no SQL Editor do Supabase Dashboard'
    });
    
  } catch (error: any) {
    console.error('❌ Erro na migration:', error);
    
    const fallbackSQL = `
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (is_active = true)
  WITH CHECK (true);
    `.trim();
    
    return c.json({ 
      success: false,
      needsManualExecution: true,
      error: error?.message || 'Erro ao executar migration',
      sql: fallbackSQL,
      instruction: 'Execute o SQL acima manualmente no Supabase SQL Editor'
    }, 200);
  }
});

// ============================================
// RLS FIX ENDPOINT - Corrige políticas automaticamente
// ============================================

/**
 * FIX RLS - Corrige políticas de RLS para conference_sessions
 * POST /make-server-02726c7c/fix-rls
 */
app.post("/make-server-02726c7c/fix-rls", async (c) => {
  try {
    console.log('🔧 Correção RLS: Verificando permissões...');
    
    // Retorna sucesso e instrui execução manual
    const fixSQL = `DROP POLICY IF EXISTS "Usuários autenticados podem atualizar sessões ativas" ON public.conference_sessions;

CREATE POLICY "Usuários autenticados podem atualizar sessões ativas"
  ON public.conference_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);`;
    
    return c.json({
      success: true,
      message: 'Execute o SQL abaixo no Supabase SQL Editor',
      sql: fixSQL,
      instructions: [
        '1. Acesse: https://supabase.com/dashboard',
        '2. Menu lateral → SQL Editor',
        '3. + New query → Cole o SQL → RUN'
      ]
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// START SERVER
// ============================================

Deno.serve(app.fetch);