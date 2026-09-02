function login(){
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

 if (username === "" || password === "") {
    alert("Please fill in all fields.");
 } else {
    alert("Login successful!");
    window.location.href = "home.html";
  }
  document.getElementById("loginForm").addEventListener("submit", function(event){
    event.preventDefault();
    login();
  });

}
