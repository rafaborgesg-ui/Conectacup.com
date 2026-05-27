// ============================================
// EDGE FUNCTION: NOTIFICAÇÃO DE AVARIAS DE RODAS
// ============================================
// Esta função envia e-mail ao gestor quando uma nova avaria é cadastrada
// Provedor: Resend (https://resend.com)
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'notificacoes@conectacup.com.br'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://app.conectacup.com.br'

interface WheelDamageNotification {
  occurrence_id: string
  sequential_code: string
  pilot: string
  category: string
  stage: string
  damage_type: string
  destination: string
  description?: string
  created_at: string
  created_by_email?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Parse request body
    const { occurrence_id } = await req.json()
    
    if (!occurrence_id) {
      throw new Error('occurrence_id é obrigatório')
    }

    console.log('🔍 Buscando dados da avaria:', occurrence_id)

    // Buscar dados da avaria
    const { data: occurrence, error: occurrenceError } = await supabase
      .from('wheel_damage_occurrences')
      .select('*')
      .eq('id', occurrence_id)
      .single()

    if (occurrenceError || !occurrence) {
      throw new Error(`Avaria não encontrada: ${occurrenceError?.message}`)
    }

    console.log('✅ Avaria encontrada:', occurrence.sequential_code)

    // Buscar e-mail do gestor
    const { data: managerData, error: managerError } = await supabase
      .rpc('get_wheel_damage_manager_info')

    if (managerError || !managerData || managerData.length === 0) {
      console.warn('⚠️ Nenhum gestor de rodas configurado')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum gestor de rodas configurado para receber notificações' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const manager = managerData[0]
    console.log('📧 Enviando e-mail para:', manager.email)

    // Montar dados para o e-mail
    const notificationData: WheelDamageNotification = {
      occurrence_id: occurrence.id,
      sequential_code: occurrence.sequential_code,
      pilot: occurrence.pilot,
      category: occurrence.category,
      stage: occurrence.stage,
      damage_type: occurrence.damage_type,
      destination: occurrence.destination,
      description: occurrence.description,
      created_at: occurrence.created_at,
    }

    // Template do e-mail
    const emailHtml = generateEmailTemplate(notificationData)

    // Enviar e-mail via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [manager.email],
        subject: `⚠️ Nova Avaria de Roda - ${notificationData.sequential_code}`,
        html: emailHtml,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(`Erro ao enviar e-mail: ${JSON.stringify(resendData)}`)
    }

    console.log('✅ E-mail enviado com sucesso:', resendData.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notificação enviada com sucesso',
        email_id: resendData.id,
        sent_to: manager.email
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// ============================================
// TEMPLATE DE E-MAIL
// ============================================
function generateEmailTemplate(data: WheelDamageNotification): string {
  const damageUrl = `${APP_URL}/avarias`
  const formattedDate = new Date(data.created_at).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  })

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova Avaria de Roda</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC0000 0%, #8B0000 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ⚠️ Nova Avaria de Roda
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Alert Box -->
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; color: #92400E; font-weight: 500;">
                  Uma nova avaria de roda foi cadastrada e está <strong>pendente de aprovação</strong>.
                </p>
              </div>

              <!-- Código da Avaria -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background-color: #1F2937; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-size: 18px; font-weight: 600; letter-spacing: 1px;">
                  ${data.sequential_code}
                </div>
              </div>

              <!-- Detalhes -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td colspan="2" style="padding-bottom: 16px;">
                    <h2 style="margin: 0; font-size: 16px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">
                      Detalhes da Avaria
                    </h2>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; font-weight: 600; color: #374151; width: 140px;">
                    Piloto:
                  </td>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; color: #1F2937;">
                    ${data.pilot}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; font-weight: 600; color: #374151;">
                    Categoria:
                  </td>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; color: #1F2937;">
                    ${data.category}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; font-weight: 600; color: #374151;">
                    Etapa:
                  </td>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; color: #1F2937;">
                    ${data.stage}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; font-weight: 600; color: #374151;">
                    Tipo de Avaria:
                  </td>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; color: #1F2937;">
                    ${data.damage_type}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; font-weight: 600; color: #374151;">
                    Destino:
                  </td>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; color: #1F2937;">
                    ${data.destination}
                  </td>
                </tr>

                ${data.description ? `
                <tr>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; font-weight: 600; color: #374151; vertical-align: top;">
                    Descrição:
                  </td>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; color: #1F2937;">
                    ${data.description}
                  </td>
                </tr>
                ` : ''}

                <tr>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; font-weight: 600; color: #374151;">
                    Cadastrado em:
                  </td>
                  <td style="padding: 12px 0; border-top: 1px solid #E5E7EB; color: #1F2937;">
                    ${formattedDate}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${damageUrl}" style="display: inline-block; background-color: #DC0000; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Visualizar e Aprovar Avaria
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
                <strong>Conecta Cup</strong> - Sistema de Gestão
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                Este é um e-mail automático. Por favor, não responda.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
