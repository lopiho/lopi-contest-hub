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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    
    // Get frontend origin for redirects
    const origin = Deno.env.get("SITE_URL") || "https://lopi.lovable.app";
    
    if (!code) {
      console.error("Missing authorization code");
      return Response.redirect(`${origin}/oauth?error=missing_code&error_description=Chybí autorizační kód`, 302);
    }

    // ====== CSRF PROTECTION: Validate state parameter ======
    if (!state) {
      console.error("Missing state parameter - CSRF protection failed");
      return Response.redirect(`${origin}/oauth?error=csrf_failed&error_description=Chybějící bezpečnostní token`, 302);
    }

    // Try to validate state from oauth_states table (if it exists)
    let stateValidated = false;
    let storedCodeVerifier: string | null = null;
    
    try {
      const { data: stateRecord, error: stateError } = await supabaseAdmin
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .maybeSingle();

      if (stateRecord && !stateError) {
        stateValidated = true;
        storedCodeVerifier = stateRecord.code_verifier;
        
        // Mark state as used (single-use for replay attack prevention)
        await supabaseAdmin
          .from('oauth_states')
          .update({ used_at: new Date().toISOString() })
          .eq('id', stateRecord.id);
        
        console.log("State validated from database");
      } else if (stateError && !stateError.message.includes('does not exist')) {
        console.error("State validation error:", stateError);
      }
    } catch (stateCheckError) {
      // Table might not exist yet - log but continue with warning
      console.warn("Could not check oauth_states table:", stateCheckError);
    }

    // If state wasn't validated from DB, log a warning but continue
    // This allows backward compatibility during migration
    if (!stateValidated) {
      console.warn("State not validated from database - CSRF protection limited. Consider running the migration to create oauth_states table.");
    }

    // Get OAuth configuration from environment
    const clientId = Deno.env.get("OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET");
    const tokenUrl = Deno.env.get("OAUTH_TOKEN_URL");
    const userInfoUrl = Deno.env.get("OAUTH_USERINFO_URL");
    
    if (!clientId || !clientSecret || !tokenUrl || !userInfoUrl) {
      console.error("Missing OAuth configuration");
      return Response.redirect(`${origin}/oauth?error=config_error&error_description=OAuth není nakonfigurováno`, 302);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Add code_verifier for PKCE if we have it from state validation
    if (storedCodeVerifier) {
      tokenParams.append("code_verifier", storedCodeVerifier);
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
      return Response.redirect(`${origin}/oauth?error=token_exchange&error_description=Výměna tokenu selhala`, 302);
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
      return Response.redirect(`${origin}/oauth?error=userinfo_failed&error_description=Nepodařilo se získat informace o uživateli`, 302);
    }

    const userData = await userInfoResponse.json();
    console.log("User data received:", JSON.stringify(userData, null, 2));

    // Alík.cz specific parsing - returns nickname, sub (user ID), user_link, roles
    const username = userData.nickname || userData.username || userData.name;
    const alikUserId = userData.sub;  // Unique Alík user ID (number)
    const userLink = userData.user_link;  // Profile URL on Alík.cz
    const avatarUrl = username ? `https://www.alik.cz/-/avatar/${username}` : null;  // Avatar from Alík.cz
    
    // Parse Alík.cz roles (if provided by OAuth)
    // Map Alík roles to our app_role enum values
    const rawAlikRoles = userData.roles || userData.alik_roles || [];
    console.log("Raw Alík roles received:", rawAlikRoles);
    
    // Helper to convert Alík role names to our enum values
    const mapAlikRolesToAppRoles = (roles: string[]): string[] => {
      const mapped: string[] = [];
      for (const role of roles) {
        switch (role.toLowerCase()) {
          case 'admin':
          case 'zvěrolékař':
            mapped.push('alik_admin');
            break;
          case 'helper':
          case 'správce':
            mapped.push('alik_helper');
            break;
          case 'editor':
          case 'redaktor':
            mapped.push('alik_editor');
            break;
          case 'club_manager':
          case 'klubovna':
            mapped.push('alik_club_manager');
            break;
          case 'board_manager':
          case 'nástěnky':
            mapped.push('alik_board_manager');
            break;
          case 'jester':
          case 'šašek':
            mapped.push('alik_jester');
            break;
        }
      }
      return mapped;
    };
    
    const alikAppRoles = mapAlikRolesToAppRoles(Array.isArray(rawAlikRoles) ? rawAlikRoles : [rawAlikRoles]);
    console.log("Mapped Alík roles:", alikAppRoles);
    
    if (!username) {
      console.error("No username (nickname) found in user data:", userData);
      return Response.redirect(`${origin}/oauth?error=no_username&error_description=V odpovědi chybí uživatelské jméno`, 302);
    }

    if (!alikUserId) {
      console.error("No alik user ID (sub) found in user data:", userData);
      return Response.redirect(`${origin}/oauth?error=no_user_id&error_description=V odpovědi chybí ID uživatele`, 302);
    }

    // Create synthetic email using Alík user ID for Supabase Auth
    const email = `alik_${alikUserId}@ls.local`;

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return Response.redirect(`${origin}/oauth?error=db_error&error_description=Chyba databáze`, 302);
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
      
      // Update profiles table (including gender and avatar)
      await supabaseAdmin.from('profiles').update({
        username: username,
        gender: userData.gender || null,
        avatar_url: avatarUrl,
      }).eq('id', userId);
      
      // Sync Alík roles to user_roles table
      // First, remove old alik_* roles
      await supabaseAdmin.from('user_roles')
        .delete()
        .eq('user_id', userId)
        .like('role', 'alik_%');
      
      // Then insert new roles
      if (alikAppRoles.length > 0) {
        const roleInserts = alikAppRoles.map(role => ({
          user_id: userId,
          role: role,
        }));
        await supabaseAdmin.from('user_roles').insert(roleInserts);
        console.log("Inserted Alík roles:", alikAppRoles);
      }
      
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
        return Response.redirect(`${origin}/oauth?error=create_failed&error_description=Nepodařilo se vytvořit uživatele`, 302);
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log("New user created:", userId);
      
      // Insert Alík roles for new user
      if (alikAppRoles.length > 0) {
        const roleInserts = alikAppRoles.map(role => ({
          user_id: userId,
          role: role,
        }));
        await supabaseAdmin.from('user_roles').insert(roleInserts);
        console.log("Inserted Alík roles for new user:", alikAppRoles);
      }
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
      return Response.redirect(`${origin}/oauth?error=session_failed&error_description=Nepodařilo se vytvořit session`, 302);
    }

    // Extract the token from the generated link and redirect to frontend
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
    const origin = Deno.env.get("SITE_URL") || "https://lopi.lovable.app";
    const errorMessage = error instanceof Error ? error.message : "Neočekávaná chyba";
    return Response.redirect(`${origin}/oauth?error=unexpected&error_description=${encodeURIComponent(errorMessage)}`, 302);
  }
});
