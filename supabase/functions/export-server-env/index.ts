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
    const expectedPassword = Deno.env.get("OAUTH_CLIENT_SECRET")!;

    // Password check (sent via X-Export-Password header or ?password= query)
    const url = new URL(req.url);
    const provided =
      req.headers.get("x-export-password") ?? url.searchParams.get("password");

    if (!provided || provided !== expectedPassword) {
      return new Response(JSON.stringify({ error: "Neplatné heslo" }), {
        status: 401,
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