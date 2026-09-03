function login(event) {

    event.preventDefault();


    // Get values from login form

    let email =
        document.getElementById("email").value.trim();

    let password =
        document.getElementById("password").value;


    // Get registered voters

    let voters =
        JSON.parse(localStorage.getItem("voters")) || [];


    // Find voter

    let voter =
        voters.find(function(user) {

            return (
                user.email === email &&
                user.password === password
            );

        });


    // Check if voter exists

    if (voter) {

        // Save currently logged-in voter

        localStorage.setItem(
            "loggedInVoter",
            JSON.stringify(voter)
        );


        alert("Login successful!");


        // Go to dashboard

        window.location.href =
            "dashboard.html";

    }

    else {

        alert(
            "Invalid email or password. Please register first."
        );

    }

}


// Listen for form submission

document
    .getElementById("loginForm")
    .addEventListener("submit", login);