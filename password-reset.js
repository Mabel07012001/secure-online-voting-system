function forgotPassword(event) {
    event.preventDefault();

    var email = document.getElementById("email").value;

    if (email === "") {
        alert("Please enter your email.");
        return;
    }

    let otp = Math.floor(100000 + Math.random() * 900000);

    alert("Your OTP is: " + otp);
}

document.getElementById("forgotPasswordForm")
.addEventListener("submit", forgotPassword);