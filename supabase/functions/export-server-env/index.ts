import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Chybí autorizace" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Neplatný token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Pouze pro adminy" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build .env content
    const env = {
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      OAUTH_CLIENT_ID: Deno.env.get("OAUTH_CLIENT_ID") ?? "",
      OAUTH_CLIENT_SECRET: Deno.env.get("OAUTH_CLIENT_SECRET") ?? "",
      OAUTH_AUTHORIZATION_URL: Deno.env.get("OAUTH_AUTHORIZATION_URL") ?? "",
      OAUTH_TOKEN_URL: Deno.env.get("OAUTH_TOKEN_URL") ?? "",
      OAUTH_USERINFO_URL: Deno.env.get("OAUTH_USERINFO_URL") ?? "",
      PORT: "3000",
      PUBLIC_URL: "",
    };

    const envText = Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    return new Response(envText, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename=".env"',
      },
    });
  } catch (err) {
    console.error("export-server-env error:", err);
    return new Response(JSON.stringify({ error: "Interní chyba" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});