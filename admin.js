import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://ddulggqcycgmfzoqloel.supabase.co";
const supabaseKey = "sb_publishable_2ZpI-GGlANTvfstz4OxceA_MYkwRACs";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("admin.js loaded");

const adminLoginForm = document.getElementById("adminLoginForm");

if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPassword").value;
        const loginMessage = document.getElementById("loginMessage");

        loginMessage.textContent = "";

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error("Supabase login error:", error);
            loginMessage.textContent = error.message;
            loginMessage.style.color = "red";
            return;
        }

        console.log("Admin login successful:", data.user.email);

        localStorage.setItem("adminToken", data.session.access_token);

        window.location.href = "admin_dashboard.html";
    });
}

function togglePassword() {
    const passwordInput = document.getElementById("adminPassword");

    if (!passwordInput) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
}

window.togglePassword = togglePassword;

async function logoutAdmin() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Logout error:", error.message);
    }

    localStorage.removeItem("adminToken");
    window.location.href = "admin_login.html";
}

window.logoutAdmin = logoutAdmin;