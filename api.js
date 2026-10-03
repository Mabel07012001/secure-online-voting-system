const API_URL = "http://localhost:1977";


export async function apiRegister(full_name, email, password) {
    const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, password })
    });
    return await res.json();
}

export async function apiLogin(email, password) {
    const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

export async function apiSendOTP(email) {
    const res = await fetch(`${API_URL}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    return await res.json();
}

export async function apiVerifyOTP(email, otp) {
    const res = await fetch(`${API_URL}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
    });
    return await res.json();
}

export async function apiGetCandidates() {
    const res = await fetch(`${API_URL}/api/candidates`);
    return await res.json();
}

export async function apiGetCandidatesWithVotes() {
    const res = await fetch(`${API_URL}/api/candidates-with-votes`);
    return await res.json();
}

export async function apiCreateCandidate(data) {
    const res = await fetch(`${API_URL}/api/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return await res.json();
}

export async function apiUpdateCandidate(id, data) {
    const res = await fetch(`${API_URL}/api/candidates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return await res.json();
}

export async function apiDeleteCandidate(id) {
    const res = await fetch(`${API_URL}/api/candidates/${id}`, {
        method: "DELETE"
    });
    return await res.json();
}

export async function apiVote(voter_id, candidate_id) {
    const res = await fetch(`${API_URL}/api/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter_id, candidate_id })
    });
    return await res.json();
}

export async function apiRequestVoteOTP(voter_id, candidate_id) {
    const res = await fetch(`${API_URL}/api/vote/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter_id, candidate_id })
    });
    return await res.json();
}

export async function apiConfirmVote(voter_id, candidate_id, otp) {
    const res = await fetch(`${API_URL}/api/vote/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter_id, candidate_id, otp })
    });
    return await res.json();
}

export async function apiGetResults() {
    const res = await fetch(`${API_URL}/api/results`);
    return await res.json();
}

export async function apiGetStats() {
    const res = await fetch(`${API_URL}/api/stats`);
    return await res.json();
}

export async function apiAdminLogin(email, password) {
    const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

export async function apiGetAuditLog(limit = 50) {
    const res = await fetch(`${API_URL}/api/audit-log?limit=${limit}`);
    return await res.json();
}

export async function apiGetElectionStatus() {
    const res = await fetch(`${API_URL}/api/election/status`);
    return await res.json();
}

export async function apiToggleElection(token, start_date, end_date) {
    const body = {};
    if (start_date) body.start_date = start_date;
    if (end_date) body.end_date = end_date;

    const res = await fetch(`${API_URL}/api/admin/election/toggle`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    return await res.json();
}

export async function apiGetMyVote(voter_id) {
    const res = await fetch(`${API_URL}/api/voter/my-vote/${voter_id}`);
    return await res.json();
}

export async function apiUpdateCandidateAdmin(id, data, token) {
    const res = await fetch(`${API_URL}/api/candidates/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    return await res.json();
}

export async function apiDeleteCandidateAdmin(id, token) {
    const res = await fetch(`${API_URL}/api/candidates/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    return await res.json();
}
