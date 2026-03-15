import { supabase } from "./supabaseClient.js";

// LOGIN
export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Errore di accesso: " + error.message);
    return;
  }

  window.location.href = "./profile.html";
}

// REGISTRAZIONE
export async function signUpWithEmail(email, password) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert("Errore di registrazione: " + error.message);
    return;
  }

  alert("Registrazione completata! Ora puoi accedere 🔑");
  window.location.href = "./login.html";
}

// LOGOUT
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "./login.html";
}
