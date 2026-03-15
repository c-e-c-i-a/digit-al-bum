import { supabase } from "./supabaseClient.js";

// LOGIN
export async function signInWithEmail(email, password) {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Errore di accesso: " + error.message);
      return;
    }

    window.location.href = "./profile.html";
  } catch (err) {
    console.error("Errore imprevisto nel login:", err);
    alert("Si è verificato un errore inatteso.");
  }
}

// REGISTRAZIONE
export async function signUpWithEmail(email, password) {
  try {
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
  } catch (err) {
    console.error("Errore imprevisto nella registrazione:", err);
    alert("Si è verificato un errore inatteso.");
  }
}

// LOGOUT
export async function logout() {
  try {
    await supabase.auth.signOut();
    window.location.href = "./login.html";
  } catch (err) {
    console.error("Errore durante il logout:", err);
    alert("Si è verificato un errore inatteso.");
  }
}
