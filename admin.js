

function openRegistration() {

```
window.location.href = "register.html";
```

}

/*
Open Manage Candidates
Actual file:
manage_candidate.html
*/

function manageCandidates() {

```
window.location.href = "manage_candidate.html";
```

}

/*
Open Election Results
Actual file:
result.html
*/

function viewResults() {

```
window.location.href = "result.html";
```

}

/* =========================================
ADMIN LOGOUT
========================================= */

function logoutAdmin() {

```
sessionStorage.removeItem("adminLoggedIn");

window.location.href = "admin-login.html";
```

}

/* =========================================
PROTECT ADMIN DASHBOARD
========================================= */

if (
window.location.pathname.includes(
"admin-dashboard.html"
)
) {

```
const loggedIn =
    sessionStorage.getItem("adminLoggedIn");


if (loggedIn !== "true") {

    window.location.href =
        "admin-login.html";

}
```

}

/* =========================================
LOAD DASHBOARD STATISTICS
========================================= */

function loadDashboardStatistics() {

```
/*
   Get registered voters.

   This assumes your register.html
   saves voters in localStorage using:

   localStorage.setItem("voters", ...)
*/

const voters =
    JSON.parse(
        localStorage.getItem("voters")
    ) || [];


/*
   Get candidates.

   This assumes your
   manage_candidate.html saves candidates
   using:

   localStorage.setItem("candidates", ...)
*/

const candidates =
    JSON.parse(
        localStorage.getItem("candidates")
    ) || [];


/*
   Get votes.

   This assumes your voting page saves
   votes using:

   localStorage.setItem("votes", ...)
*/

const votes =
    JSON.parse(
        localStorage.getItem("votes")
    ) || [];


/* Calculate totals */

const totalVoters =
    voters.length;


const totalCandidates =
    candidates.length;


const totalVotes =
    votes.length;


/* Calculate participation */

let participationRate = 0;


if (totalVoters > 0) {

    participationRate =
        (totalVotes / totalVoters) * 100;

}


/* Get HTML elements */

const votersElement =
    document.getElementById(
        "totalVoters"
    );


const candidatesElement =
    document.getElementById(
        "totalCandidates"
    );


const votesElement =
    document.getElementById(
        "totalVotes"
    );


const participationElement =
    document.getElementById(
        "participationRate"
    );


/* Display statistics */

if (votersElement) {

    votersElement.textContent =
        totalVoters;

}


if (candidatesElement) {

    candidatesElement.textContent =
        totalCandidates;

}


if (votesElement) {

    votesElement.textContent =
        totalVotes;

}


if (participationElement) {

    participationElement.textContent =
        participationRate.toFixed(1) + "%";

}
```

}

/* =========================================
RUN DASHBOARD STATISTICS
========================================= */

if (
window.location.pathname.includes(
"admin-dashboard.html"
)
) {

```
loadDashboardStatistics();
```

}
