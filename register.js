function register(event) {
    event.preventDefault();

    var username = document.getElementById("username").value;
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;
    var confirmPassword = document.getElementById("confirmPassword").value;

    if (username === "" || email === "" || password === "" || confirmPassword === "") {
        alert("Please fill in all fields.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    let otp = Math.floor(100000 + Math.random() * 900000);

    alert("Your OTP is: " + otp);

    var userOtp = prompt("Please enter the OTP sent to your email:");

    if (userOtp == otp) {
        alert("Registration successful!");
        window.location.href = "OTP.html";
    } else {
        alert("Invalid OTP. Registration failed.");
        window.location.href = "register.html";
    }
}

document.getElementById("registerForm")
.addEventListener("submit", register);