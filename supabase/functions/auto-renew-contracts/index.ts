import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use São Paulo timezone for date calculations
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const today = nowSP.toISOString().split('T')[0];

    const { data: contracts, error: fetchError } = await supabase
      .from('contracts')
      .select('id, vehicle_id, client_id, end_date, payment_status')
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lt('end_date', today);

    if (fetchError) {
      throw fetchError;
    }

    if (!contracts || contracts.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'Nenhum contrato para renovar',
          renewed: 0
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const renewedContracts = [];
    const errors = [];

    // Processar cada contrato
    for (const contract of contracts) {
      try {
        // Only renew if the current period was paid
        // If payment_status is still pending/overdue, the client hasn't paid yet - don't renew
        if (contract.payment_status !== 'paid') {
          continue;
        }

        // Reuse the exact same logic as the manual "Forçar Renovação" action:
        // it finalizes this contract (status = 'finished') and opens a new
        // one for the next period, instead of just changing this row's dates.
        const { error: renewError } = await supabase.rpc('force_contract_renewal', {
          p_contract_id: contract.id
        });

        if (renewError) {
          errors.push({ contract_id: contract.id, error: renewError.message });
        } else {
          renewedContracts.push({
            id: contract.id,
            vehicle_id: contract.vehicle_id,
            client_id: contract.client_id,
            old_end_date: contract.end_date
          });
        }
      } catch (err) {
        errors.push({ contract_id: contract.id, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Renovação automática concluída',
        renewed: renewedContracts.length,
        contracts: renewedContracts,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erro na renovação automática:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
