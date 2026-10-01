const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const dns = require("dns");
const { createClient } = require("@supabase/supabase-js");

dns.setDefaultResultOrder("ipv4first");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 1977;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    },
    tls: { servername: "smtp.gmail.com" }
});


function generateConfirmationId() {
    const year = new Date().getFullYear();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return `SV-${year}-${code}`;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function logAction(action, email = null, userId = null, details = null) {
    try {
        await supabase.from("audit_log").insert({
            action,
            user_email: email,
            user_id: userId,
            details: details
        });
        console.log(`Audit: ${action}${email ? ` (${email})` : ""}`);
    } catch (err) {
        console.error("Audit log error:", err.message);
    }
}

function otpEmailTemplate(otp, purpose = "verification", title = "Your OTP Code") {
    return {
        subject: title,
        html: `
            <div style="font-family: Arial; max-width: 500px; padding: 30px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #2563eb;">Online Voting System</h2>
                <p>Your ${purpose} code is:</p>
                <div style="background: #eff6ff; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">
                        ${otp}
                    </span>
                </div>
                <p style="color: #64748b; font-size: 13px;">This code expires in 5 minutes.</p>
                <p style="color: #dc2626; font-size: 12px;">Maximum 3 attempts allowed.</p>
            </div>
        `
    };
}


app.get("/", (req, res) => {
    res.json({
        status: "online",
        version: "2.0",
        message: "Online Voting Backend with OTP is running!",
        time: new Date().toISOString()
    });
});


app.post("/api/register", async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: "Please fill in all fields." });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name } }
        });

        if (error) return res.status(400).json({ success: false, message: error.message });

        const { error: voterError } = await supabase
            .from("voters")
            .insert({ id: data.user.id, full_name, email, has_voted: false });

        if (voterError) console.error("Voter profile error:", voterError);

        try {
            const otp = generateOTP();
            await supabase.from("pending_otps").insert({
                email,
                otp,
                purpose: "registration",
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
            });

            const tpl = otpEmailTemplate(otp, "account verification", "Verification Code");
            await transporter.sendMail({
                from: `"Online Voting System" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: tpl.subject,
                html: tpl.html
            });

            console.log("Registration OTP sent to:", email);
            await logAction("REGISTER", email, data.user.id);
        } catch (mailErr) {
            console.error("Error sending OTP:", mailErr.message);
        }

        res.json({
            success: true,
            message: "Registration successful! Check your email.",
            userId: data.user.id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please fill in all fields." });
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            await logAction("LOGIN_FAILED", email, null, { reason: error.message });
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const { data: voter } = await supabase
            .from("voters")
            .select("*")
            .eq("id", data.user.id)
            .single();

        await logAction("LOGIN_SUCCESS", email, data.user.id);

        res.json({
            success: true,
            message: "Login successful!",
            token: data.session.access_token,
            user: { id: data.user.id, email: data.user.email },
            voter
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post("/api/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required." });

        const otp = generateOTP();

        await supabase.from("pending_otps").insert({
            email,
            otp,
            purpose: "registration",
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });

        const tpl = otpEmailTemplate(otp, "verification", "Your OTP Code");
        await transporter.sendMail({
            from: `"Online Voting System" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: tpl.subject,
            html: tpl.html
        });

        await logAction("OTP_REQUESTED", email);

        res.json({ success: true, message: "OTP sent to your email." });
    } catch (err) {
        console.error("OTP error:", err);
        res.status(500).json({ success: false, message: "Error sending OTP: " + err.message });
    }
});


app.post("/api/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required." });
        }

        const { data, error } = await supabase
            .from("pending_otps")
            .select("*")
            .eq("email", email)
            .eq("otp", otp.toString())
            .eq("purpose", "registration")
            .gte("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            await logAction("OTP_FAILED", email, null, { purpose: "registration" });
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        await supabase.from("pending_otps").delete().eq("id", data[0].id);
        await logAction("OTP_VERIFIED", email, null, { purpose: "registration" });

        res.json({ success: true, message: "OTP verified successfully!" });
    } catch (err) {
        console.error("Verify OTP error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});


app.get("/api/candidates", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("candidates")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({ success: true, total: data.length, candidates: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.get("/api/candidates-with-votes", async (req, res) => {
    try {
        const { data: candidates, error: cErr } = await supabase
            .from("candidates")
            .select("*")
            .order("created_at", { ascending: false });

        if (cErr) throw cErr;

        const { data: votes, error: vErr } = await supabase
            .from("votes")
            .select("candidate_id");

        if (vErr) throw vErr;

        const result = candidates.map(c => ({
            ...c,
            votes: votes.filter(v => v.candidate_id === c.id).length
        }));

        res.json({ success: true, total: result.length, candidates: result });
    } catch (err) {
        console.error("Candidates-with-votes error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post("/api/candidates", async (req, res) => {
    try {
        const { full_name, age, gender, party, position, project, manifesto, email, photo } = req.body;

        if (!full_name || !age || !party || !position) {
            return res.status(400).json({ success: false, message: "Name, age, party and position are required." });
        }

        const { data, error } = await supabase
            .from("candidates")
            .insert({ full_name, age: Number(age), gender, party, position, project, manifesto, email, photo, votes: 0 })
            .select()
            .single();

        if (error) throw error;

        await logAction("CANDIDATE_CREATED", null, null, { candidate_id: data.id, name: full_name });

        res.status(201).json({ success: true, message: "Candidate registered!", candidate: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.put("/api/candidates/:id", async (req, res) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ success: false, message: "Token required." });
        }

        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !userData.user || userData.user.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ success: false, message: "Only admins can edit candidates." });
        }

        const { id } = req.params;
        const { data, error } = await supabase
            .from("candidates")
            .update(req.body)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        await logAction("CANDIDATE_UPDATED", userData.user.email, null, { candidate_id: id });

        res.json({ success: true, message: "Candidate updated!", candidate: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.delete("/api/candidates/:id", async (req, res) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ success: false, message: "Token required." });
        }

        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !userData.user || userData.user.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ success: false, message: "Only admins can delete candidates." });
        }

        const { id } = req.params;
        const { error } = await supabase.from("candidates").delete().eq("id", id);
        if (error) throw error;

        await logAction("CANDIDATE_DELETED", userData.user.email, null, { candidate_id: id });

        res.json({ success: true, message: "Candidate removed!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post("/api/vote/request-otp", async (req, res) => {
    try {
        const { voter_id, candidate_id } = req.body;

        if (!voter_id || !candidate_id) {
            return res.status(400).json({ success: false, message: "Missing data." });
        }

        const { data: election } = await supabase
            .from("election_settings")
            .select("status")
            .eq("id", 1)
            .single();

        if (!election || election.status !== "open") {
            return res.status(403).json({
                success: false,
                message: "The election is closed. Voting is not possible."
            });
        }

        const { data: voter } = await supabase
            .from("voters")
            .select("has_voted, email, full_name")
            .eq("id", voter_id)
            .single();

        if (!voter) {
            return res.status(404).json({ success: false, message: "Voter not found." });
        }

        if (voter.has_voted) {
            return res.status(400).json({ success: false, message: "You have already voted." });
        }

        const { data: candidate } = await supabase
            .from("candidates")
            .select("id, full_name")
            .eq("id", candidate_id)
            .single();

        if (!candidate) {
            return res.status(404).json({ success: false, message: "Candidate not found." });
        }

        const otp = generateOTP();

        await supabase
            .from("pending_otps")
            .delete()
            .eq("voter_id", voter_id)
            .eq("purpose", "vote");

        await supabase.from("pending_otps").insert({
            email: voter.email,
            otp,
            purpose: "vote",
            voter_id,
            attempts: 0,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });

        const tpl = otpEmailTemplate(
            otp,
            `vote confirmation for ${candidate.full_name}`,
            "Confirm Your Vote"
        );

        await transporter.sendMail({
            from: `"Online Voting System" <${process.env.GMAIL_USER}>`,
            to: voter.email,
            subject: tpl.subject,
            html: tpl.html
        });

        await logAction("VOTE_OTP_REQUESTED", voter.email, voter_id, {
            candidate_id, candidate_name: candidate.full_name
        });

        console.log(`Vote OTP sent to: ${voter.email}`);

        res.json({
            success: true,
            message: `Code sent to ${voter.email}. Check your email.`,
            email: voter.email,
            candidate_name: candidate.full_name
        });

    } catch (err) {
        console.error("vote/request-otp error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post("/api/vote/confirm", async (req, res) => {
    try {
        const { voter_id, candidate_id, otp } = req.body;

        if (!voter_id || !candidate_id || !otp) {
            return res.status(400).json({ success: false, message: "Missing data." });
        }

        const { data: otpRecords, error: otpErr } = await supabase
            .from("pending_otps")
            .select("*")
            .eq("voter_id", voter_id)
            .eq("purpose", "vote")
            .order("created_at", { ascending: false })
            .limit(1);

        if (otpErr) throw otpErr;

        if (!otpRecords || otpRecords.length === 0) {
            return res.status(400).json({ success: false, message: "No code found. Request a new OTP." });
        }

        const otpRecord = otpRecords[0];

        if (new Date(otpRecord.expires_at) < new Date()) {
            await supabase.from("pending_otps").delete().eq("id", otpRecord.id);
            await logAction("VOTE_OTP_EXPIRED", null, voter_id);
            return res.status(400).json({ success: false, message: "Code expired. Request a new OTP." });
        }

        if (otpRecord.attempts >= 3) {
            await supabase.from("pending_otps").delete().eq("id", otpRecord.id);
            await logAction("VOTE_OTP_BLOCKED", null, voter_id, { reason: "too many attempts" });
            return res.status(429).json({
                success: false,
                message: "Too many attempts. Request a new code."
            });
        }

        if (otpRecord.otp !== otp.toString()) {
            const newAttempts = otpRecord.attempts + 1;
            await supabase
                .from("pending_otps")
                .update({ attempts: newAttempts })
                .eq("id", otpRecord.id);

            await logAction("VOTE_OTP_FAILED", null, voter_id, { attempts: newAttempts });

            return res.status(400).json({
                success: false,
                message: `Incorrect code. Remaining attempts: ${3 - newAttempts}`
            });
        }

        const confirmationId = generateConfirmationId();

        const { data: voter } = await supabase
            .from("voters")
            .select("has_voted, email")
            .eq("id", voter_id)
            .single();

        if (!voter || voter.has_voted) {
            return res.status(400).json({ success: false, message: "You have already voted." });
        }

        const { error: voteErr } = await supabase.from("votes").insert({
            voter_id,
            candidate_id,
            confirmation_id: confirmationId
        });

        if (voteErr) {
            console.error("Vote insert error:", voteErr);
            return res.status(500).json({ success: false, message: "Error recording vote." });
        }

        await supabase
            .from("voters")
            .update({ has_voted: true })
            .eq("id", voter_id);

        await supabase.from("pending_otps").delete().eq("id", otpRecord.id);

        const { data: candidate } = await supabase
            .from("candidates")
            .select("full_name, party, position")
            .eq("id", candidate_id)
            .single();

        await logAction("VOTE_RECORDED", voter.email, voter_id, {
            candidate_id, candidate_name: candidate?.full_name, confirmation_id: confirmationId
        });

        console.log(`Vote recorded: ${confirmationId} -> ${candidate?.full_name}`);

        res.json({
            success: true,
            message: "Vote recorded successfully!",
            confirmation_id: confirmationId,
            candidate: candidate,
            voted_at: new Date().toISOString()
        });

    } catch (err) {
        console.error("vote/confirm error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});


app.get("/api/results", async (req, res) => {
    try {
        const { data: candidates } = await supabase.from("candidates").select("*");
        const { data: votes } = await supabase.from("votes").select("candidate_id");

        const totalVotes = votes.length;

        const results = candidates.map(c => {
            const count = votes.filter(v => v.candidate_id === c.id).length;
            return {
                id: c.id,
                name: c.full_name,
                party: c.party,
                position: c.position,
                votes: count,
                percentage: totalVotes > 0
                    ? ((count / totalVotes) * 100).toFixed(2) + "%"
                    : "0%"
            };
        }).sort((a, b) => b.votes - a.votes);

        res.json({
            success: true,
            totalCandidates: candidates.length,
            totalVotes: totalVotes,
            leadingCandidate: results[0] || null,
            results: results
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.get("/api/stats", async (req, res) => {
    try {
        const { count: totalVoters } = await supabase
            .from("voters").select("*", { count: "exact", head: true });

        const { count: totalCandidates } = await supabase
            .from("candidates").select("*", { count: "exact", head: true });

        const { count: totalVotes } = await supabase
            .from("votes").select("*", { count: "exact", head: true });

        const participationRate = totalVoters > 0
            ? ((totalVotes / totalVoters) * 100).toFixed(2) + "%"
            : "0%";

        res.json({
            success: true,
            totalVoters: totalVoters || 0,
            totalCandidates: totalCandidates || 0,
            totalVotes: totalVotes || 0,
            participationRate: participationRate
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post("/api/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email !== process.env.ADMIN_EMAIL) {
            await logAction("ADMIN_LOGIN_FAILED", email);
            return res.status(403).json({ success: false, message: "Access restricted." });
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            await logAction("ADMIN_LOGIN_FAILED", email, null, { reason: error.message });
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        await logAction("ADMIN_LOGIN_SUCCESS", email, data.user.id);

        res.json({ success: true, message: "Admin authenticated!", token: data.session.access_token });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.get("/api/audit-log", async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const { data, error } = await supabase
            .from("audit_log")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(Number(limit));

        if (error) throw error;

        res.json({ success: true, total: data.length, logs: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.get("/api/election/status", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("election_settings")
            .select("*")
            .eq("id", 1)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            status: data.status,
            started_at: data.started_at,
            closed_at: data.closed_at,
            start_date: data.start_date,
            end_date: data.end_date
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post("/api/admin/election/toggle", async (req, res) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        const { start_date, end_date } = req.body;

        if (!token) {
            return res.status(401).json({ success: false, message: "Token required." });
        }

        const { data: userData, error: authError } = await supabase.auth.getUser(token);

        if (authError || !userData.user) {
            return res.status(401).json({ success: false, message: "Invalid token." });
        }

        if (userData.user.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ success: false, message: "Admin access only." });
        }

        const { data: current } = await supabase
            .from("election_settings")
            .select("status")
            .eq("id", 1)
            .single();

        const newStatus = current?.status === "open" ? "closed" : "open";

        const updateData = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };

        if (newStatus === "closed") {
            updateData.closed_at = new Date().toISOString();
        } else {
            if (!start_date || !end_date) {
                return res.status(400).json({
                    success: false,
                    message: "Start date and end date are required."
                });
            }

            if (new Date(end_date) <= new Date(start_date)) {
                return res.status(400).json({
                    success: false,
                    message: "End date must be after start date."
                });
            }

            updateData.closed_at = null;
            updateData.started_at = new Date().toISOString();
            updateData.start_date = start_date;
            updateData.end_date = end_date;
        }

        await supabase
            .from("election_settings")
            .update(updateData)
            .eq("id", 1);

        await logAction(
            newStatus === "open" ? "ELECTION_OPENED" : "ELECTION_CLOSED",
            userData.user.email,
            null,
            { start_date, end_date }
        );

        res.json({
            success: true,
            message: `Election ${newStatus === "open" ? "opened" : "closed"} successfully.`,
            status: newStatus
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.get("/api/voter/my-vote/:voter_id", async (req, res) => {
    try {
        const { voter_id } = req.params;

        const { data: votes, error } = await supabase
            .from("votes")
            .select("confirmation_id, voted_at, candidate_id")
            .eq("voter_id", voter_id)
            .order("voted_at", { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!votes || votes.length === 0) {
            return res.json({ success: true, has_voted: false, vote: null });
        }

        const { data: candidate } = await supabase
            .from("candidates")
            .select("id, full_name, party, position, photo")
            .eq("id", votes[0].candidate_id)
            .single();

        res.json({
            success: true,
            has_voted: true,
            vote: {
                confirmation_id: votes[0].confirmation_id,
                voted_at: votes[0].voted_at,
                candidate: candidate
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found." });
});


app.listen(PORT, () => {
    console.log("========================================");
    console.log("ONLINE VOTING BACKEND v2.0");
    console.log("========================================");
    console.log("Server:  http://localhost:" + PORT);
    console.log("Supabase: connected");
    console.log("Nodemailer: ready");
    console.log("OTP before vote: ACTIVE");
    console.log("Audit log: ACTIVE");
    console.log("========================================");
    console.log("Endpoints:");
    console.log("   POST   /api/register");
    console.log("   POST   /api/login");
    console.log("   POST   /api/send-otp");
    console.log("   POST   /api/verify-otp");
    console.log("   GET    /api/candidates");
    console.log("   GET    /api/candidates-with-votes");
    console.log("   POST   /api/candidates");
    console.log("   PUT    /api/candidates/:id");
    console.log("   DELETE /api/candidates/:id");
    console.log("   POST   /api/vote/request-otp");
    console.log("   POST   /api/vote/confirm");
    console.log("   GET    /api/results");
    console.log("   GET    /api/stats");
    console.log("   POST   /api/admin/login");
    console.log("   GET    /api/audit-log");
    console.log("   GET    /api/election/status");
    console.log("   POST   /api/admin/election/toggle");
    console.log("   GET    /api/voter/my-vote/:voter_id");
    console.log("========================================");
});