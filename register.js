function register(event) {

    event.preventDefault();

    let username = document.getElementById("username").value.trim();
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value;
    let confirmPassword =
        document.getElementById("confirmPassword").value;


    if (username === "" || email === "" ||
        password === "" || confirmPassword === "") {

        alert("Please fill in all fields.");
        return;
    }


    if (password !== confirmPassword) {

        alert("Passwords do not match.");
        return;
    }


    // Get all registered voters
    let voters =
        JSON.parse(localStorage.getItem("voters")) || [];


    // Check if email already exists
    let existingVoter =
        voters.find(voter => voter.email === email);


    if (existingVoter) {

        alert("This email is already registered.");
        return;
    }


    // Generate OTP
    let otp =
        Math.floor(100000 + Math.random() * 900000);


    alert("Your OTP is: " + otp);


    let userOtp =
        prompt("Please enter the OTP sent to your email:");


    if (userOtp == otp) {

        // Create voter object
        let voter = {

            name: username,
            email: email,
            password: password,
            hasVoted: false

        };


        // Add voter
        voters.push(voter);


        // Save all voters
        localStorage.setItem(
            "voters",
            JSON.stringify(voters)
        );


        alert("Registration successful!");


        // Go to login
        window.location.href = "login.html";

    } else {

        alert("Invalid OTP. Registration failed.");

    }

}


document
    .getElementById("registerForm")
    .addEventListener("submit", register);