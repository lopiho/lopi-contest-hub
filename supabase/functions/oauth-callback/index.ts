import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const codeVerifier = url.searchParams.get("code_verifier");
    
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing authorization code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OAuth configuration from environment
    const clientId = Deno.env.get("OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET");
    const tokenUrl = Deno.env.get("OAUTH_TOKEN_URL");
    const userInfoUrl = Deno.env.get("OAUTH_USERINFO_URL");
    
    if (!clientId || !clientSecret || !tokenUrl || !userInfoUrl) {
      console.error("Missing OAuth configuration");
      return new Response(JSON.stringify({ error: "OAuth not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the redirect URI from the request origin
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://lopi.lovable.app";
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Add code_verifier for PKCE if provided
    if (codeVerifier) {
      tokenParams.append("code_verifier", codeVerifier);
    }

    console.log("Exchanging code for token at:", tokenUrl);

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Token exchange failed", details: errorText }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenResponse.json();
    console.log("Token received successfully");

    // Fetch user info
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error("User info fetch failed:", userInfoResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch user info" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = await userInfoResponse.json();
    console.log("User data received:", JSON.stringify(userData, null, 2));

    // Alík.cz specific parsing - returns nickname, sub (user ID), user_link
    const username = userData.nickname || userData.username || userData.name;
    const alikUserId = userData.sub;  // Unique Alík user ID (number)
    const userLink = userData.user_link;  // Profile URL on Alík.cz
    const avatarUrl = username ? `https://www.alik.cz/-/avatar/${username}` : null;  // Avatar from Alík.cz
    
    if (!username) {
      console.error("No username (nickname) found in user data:", userData);
      return new Response(JSON.stringify({ error: "No username in OAuth response" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!alikUserId) {
      console.error("No alik user ID (sub) found in user data:", userData);
      return new Response(JSON.stringify({ error: "No user ID in OAuth response" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create synthetic email using Alík user ID for Supabase Auth
    const email = `alik_${alikUserId}@ls.local`;
    
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string;
    let isNewUser = false;
    
    // Find existing user by alik_user_id in metadata (not by email)
    const existingUser = existingUsers.users.find(
      u => u.user_metadata?.alik_user_id === alikUserId
    );

    if (existingUser) {
      userId = existingUser.id;
      console.log("Existing user found:", userId);
      
      // Update metadata (nickname may have changed on Alík.cz)
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          username,
          user_link: userLink,
          gender: userData.gender,
          avatar_url: avatarUrl,
        },
      });
      
      // Also update profiles table (including gender and avatar)
      await supabaseAdmin.from('profiles').update({
        username: username,
        gender: userData.gender || null,
        avatar_url: avatarUrl,
      }).eq('id', userId);
      
      console.log("Updated user metadata and profile for:", userId);
    } else {
      // Create new user with random password (they'll use OAuth)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          username,
          alik_user_id: alikUserId,
          user_link: userLink,
          gender: userData.gender,
          avatar_url: avatarUrl,
          oauth_provider: "alik",
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(JSON.stringify({ error: "Failed to create user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log("New user created:", userId);
    }

    // Generate a session for the user
    // We'll use a magic link approach - generate a one-time token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: origin,
      },
    });

    if (sessionError) {
      console.error("Error generating session link:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the token from the generated link
    const linkUrl = new URL(sessionData.properties.hashed_token ? 
      `${origin}/auth/callback?token_hash=${sessionData.properties.hashed_token}&type=magiclink` :
      sessionData.properties.action_link);

    // Redirect to the frontend with the auth parameters
    const redirectUrl = sessionData.properties.action_link;
    
    console.log("Redirecting user to:", redirectUrl);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
      },
    });

  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
