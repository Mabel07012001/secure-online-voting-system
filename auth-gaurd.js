// ============================================================
// auth-guard.js
// Verificação centralizada de autenticação.
// Usar nas páginas protegidas (dashboard, cast_vote, etc.).
// ============================================================

/**
 * Verifica se o votante está autenticado.
 * Se sim, devolve o objeto voter.
 * Se não, redireciona para login.html e devolve null.
 */
export function requireLogin() {
    const voterData = localStorage.getItem("loggedInVoter");

    if (!voterData) {
        alert("Please login first to access this page.");
        window.location.href = "login.html";
        return null;
    }

    let voter;
    try {
        voter = JSON.parse(voterData);
    } catch (e) {
        console.error("Error reading localStorage:", e);
        localStorage.removeItem("loggedInVoter");
        alert("Invalid session. Please login again.");
        window.location.href = "login.html";
        return null;
    }

    if (!voter || !voter.id) {
        localStorage.removeItem("loggedInVoter");
        alert("Invalid session. Please login again.");
        window.location.href = "login.html";
        return null;
    }

    return voter;
}

/**
 * Verifica se existe um votante autenticado (boolean).
 * Útil para lógica condicional sem redirecionamento.
 */
export function isLoggedIn() {
    return !!localStorage.getItem("loggedInVoter");
}

/**
 * Termina a sessão do votante e redireciona.
 */
export function logout() {
    localStorage.removeItem("loggedInVoter");
    localStorage.removeItem("authToken");
    sessionStorage.clear();
    window.location.href = "login.html";
}