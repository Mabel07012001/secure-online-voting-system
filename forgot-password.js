function forgotPassword() {
    var email = document.getElementById("email").value;

if (email === "") {
    alert("Please enter your email.");
    return;
} 
let otp = Math.floor(100000 + Math.random() * 900000);

alert("Your OTP is: " + otp);
var userOtp = prompt("Please enter the OTP sent to your email:");

if (userOtp == otp) {
    alert("OTP verified successfully.");
    window.location.href = "reset-password.html";
} else {
    alert("Invalid OTP. Please try again.");
}
}
document.getElementById("forgotPasswordForm").addEventListener("submit", function(event){
    event.preventDefault();
    forgotPassword();
});
