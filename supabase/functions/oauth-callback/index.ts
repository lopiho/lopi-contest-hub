import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tokenUrl = Deno.env.get("OAUTH_TOKEN_URL")!;
    const userinfoUrl = Deno.env.get("OAUTH_USERINFO_URL")!;
    const clientId = Deno.env.get("OAUTH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET")!;

    // Determine the app origin for redirects
    const referer = req.headers.get("referer");
    const appOrigin = referer
      ? new URL(referer).origin
      : url.origin.replace(/\/functions\/v1.*/, "");

    const redirectWithError = (msg: string) =>
      new Response(null, {
        status: 302,
        headers: { Location: `${appOrigin}/auth?error=${encodeURIComponent(msg)}` },
      });

    if (error) {
      return redirectWithError(error);
    }

    if (!code || !state) {
      return redirectWithError("Chybí parametry code nebo state");
    }

    // Rate limiting by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check rate limit (10 requests per minute per IP)
    const { count } = await supabaseAdmin
      .from("security_logs")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "oauth_callback")
      .eq("ip_address", ip)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString());

    if ((count ?? 0) >= 10) {
      return redirectWithError("Příliš mnoho požadavků, zkuste to později");
    }

    // Log the attempt
    await supabaseAdmin.from("security_logs").insert({
      event_type: "oauth_callback",
      ip_address: ip,
      endpoint: "/oauth-callback",
      details: { state: state.substring(0, 8) + "..." },
    });

    // Validate state and get code_verifier
    const { data: oauthState, error: stateError } = await supabaseAdmin
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (stateError || !oauthState) {
      return redirectWithError("Neplatný nebo expirovaný OAuth state");
    }

    // Mark state as used
    await supabaseAdmin
      .from("oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("id", oauthState.id);

    // Build callback URL (same as what was used in initiate)
    const callbackUrl = `${supabaseUrl}/functions/v1/oauth-callback`;

    // Exchange code for token
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "LopihoSoutez/1.0",
        Connection: "close",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: oauthState.code_verifier,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token exchange failed:", errText);
      return redirectWithError("Nepodařilo se vyměnit kód za token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return redirectWithError("Chybí access_token v odpovědi");
    }

    // Get user info
    const userinfoResponse = await fetch(userinfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "LopihoSoutez/1.0",
        Connection: "close",
      },
    });

    if (!userinfoResponse.ok) {
      const errText = await userinfoResponse.text();
      console.error("Userinfo failed:", errText);
      return redirectWithError("Nepodařilo se získat informace o uživateli");
    }

    const userInfo = await userinfoResponse.json();
    // The OAuth server provides a username (e.g. sub or username field)
    const username = userInfo.username || userInfo.preferred_username || userInfo.name || userInfo.sub;
    const alikUserId = userInfo.sub || userInfo.id;

    if (!username || !alikUserId) {
      return redirectWithError("Chybí uživatelské jméno v odpovědi OAuth serveru");
    }

    // Create synthetic email from username
    const syntheticEmail = `alik_${alikUserId}@ls.local`;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) =>
        u.email === syntheticEmail ||
        u.user_metadata?.alik_user_id === String(alikUserId)
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update username in case it changed
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { username, alik_user_id: String(alikUserId) },
      });
      // Update profile username
      await supabaseAdmin
        .from("profiles")
        .update({ username })
        .eq("id", userId);
    } else {
      // Create new user with random password
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { username, alik_user_id: String(alikUserId) },
      });

      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return redirectWithError("Nepodařilo se vytvořit účet");
      }

      userId = newUser.user.id;
    }

    // Generate a session for the user
    // Use admin to generate a magic link, then extract the token
    // Alternative: sign in with password (but we set random password)
    // Best approach: generate access/refresh tokens directly
    const { data: sessionData, error: sessionError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: syntheticEmail,
      });

    if (sessionError || !sessionData) {
      console.error("Session generation failed:", sessionError);
      return redirectWithError("Nepodařilo se vytvořit relaci");
    }

    // The hashed_token from generateLink can be used to verify OTP
    const hashedToken = sessionData.properties?.hashed_token;

    if (!hashedToken) {
      console.error("No hashed_token in response");
      return redirectWithError("Nepodařilo se vytvořit přihlašovací token");
    }

    // Redirect to app with token verification
    // Supabase will verify this token and create a session
    const redirectUrl = `${supabaseUrl}/auth/v1/verify?token=${hashedToken}&type=magiclink&redirect_to=${encodeURIComponent(appOrigin + "/")}`;

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    const appOrigin = new URL(req.url).origin;
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appOrigin}/auth?error=${encodeURIComponent("Interní chyba serveru")}`,
      },
    });
  }
});
