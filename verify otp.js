function verifyOTP(otp) {
    var userOtp = prompt("Please enter the OTP sent to your email:");

if (userOtp == otp) {
    alert("OTP verified successfully!");
    window.location.href = "home.html";
} else {
    alert("Invalid OTP. Please try again.");
    window.location.href = "OTP.html";
}
document.getElementById("verifyOTPForm").addEventListener("submit", function(event){
    event.preventDefault();
    verifyOTP(otp);
});
}