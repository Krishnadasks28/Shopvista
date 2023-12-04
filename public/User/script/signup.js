import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-analytics.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDC0Snbg0t7fxGyeEpCffig0txbw6xXwVY",
    authDomain: "shopvista-255f2.firebaseapp.com",
    projectId: "shopvista-255f2",
    storageBucket: "shopvista-255f2.appspot.com",
    messagingSenderId: "368127605210",
    appId: "1:368127605210:web:e3df6ff3c26279cf9468e3",
    measurementId: "G-ND4GR6W0PT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app)

var form = document.querySelector('#signup')
var usernameErr = document.querySelector('#username-err')
var mobileErr = document.querySelector('#mobile-err')
var emailErr = document.querySelector('#email-err')
var passwordErr = document.querySelector('#password-err')
var validregex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

//input fields
var username = document.getElementById('username')
var phoneNumber = document.getElementById('mobile')
var email = document.getElementById('email')
var password = document.getElementById('password')

var otpForm = document.getElementById('otpForm')
var otpBtn = document.getElementById('otpSubmit')
let countDown = document.getElementById('countDown')
let userData

console.log("Script executing...")
if (window.location.pathname == '/user/signup') {

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'signup-btn', {
        'size': 'invisible',
        'callback': (response) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
    });
    var appVerifier = window.recaptchaVerifier
    var mobilenumber

    form.addEventListener('submit', async (e) => {

        userData = {
            username: username.value,
            phoneNumber: phoneNumber.value,
            email: email.value,
            password: password.value
        }

        e.preventDefault()

        //validaion
        var valid = true

        if (userData.username.trim() === "") {
            usernameErr.innerText = "Please enter your name"
            username.classList.add('not-valid')
            valid = false
        }

        if (userData.phoneNumber === "") {
            mobileErr.innerText = "Please Enter your mobile number"
            mobile.classList.add('not-valid')
            valid = false
        }
        else if (userData.phoneNumber.length !== 10) {
            mobileErr.innerText = "Please Enter a valid mobile number"
            mobile.classList.add('not-valid')
            valid = false
        }

        if (userData.email.trim() !== "") {
            if (!userData.email.match(validregex)) {

                email.classList.add('not-valid')
                emailErr.innerText = "Please enter a valid email."
                valid = false
            }
        }

        if (userData.password.trim() === "") {
            password.classList.add('not-valid')
            passwordErr.innerText = "Please enter a password."
            valid = false
        } else if (userData.password.trim().length < 6) {
            password.classList.add('not-valid')
            passwordErr.innerText = "Password should not be less than 6 characters."
            valid = false
        }

        if (valid) {
            mobilenumber = '+91' + userData.phoneNumber
            await fetch('/user/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userData })
            })
                .then((response) => {
                    console.log(response, response.status)
                    if (response.status === 400) {
                        window.alert("The user already exists, Please login to continue.")
                        window.location.href = '/user/login'
                    }
                    else if (response.status === 200) {
                        signInWithPhoneNumber(auth, mobilenumber, appVerifier)
                            .then((confirmationResult) => {
                                window.confirmationResult = confirmationResult;
                                window.alert("OTP send successfully")
                                form.classList.add('d-none')
                                otpForm.classList.remove('d-none')
                                let duration = 120
                                startCountdown(duration, countDown, otpBtn)

                                // ...
                            }).catch((error) => {
                                // Error; SMS not sent

                                window.alert(error, "Failed to send OTP")
                                setTimeout(() => {
                                    window.location.reload()
                                }, 1000)
                            });
                    }
                })
        }
    })



    form.addEventListener('input', e => {
        if (username.value.trim().length > 4) {
            clearErr(username, usernameErr)
        }
        if (phoneNumber.value.length === 10) {
            clearErr(phoneNumber, mobileErr)
        }
        if (email.value.match(validregex)) {
            clearErr(email, emailErr)
        }
        if (password.value.trim().length > 6) {
            clearErr(password, passwordErr)
        }
    })

    function clearErr(errField, errMsg) {
        errField.classList.remove('not-valid')
        errField.classList.add('valid')
        errMsg.innerText = ""
    }

    //otp verification
    let otpErr = document.getElementById('otpError')
    let submitCount = 0
    otpForm.addEventListener('submit', (e) => {
        e.preventDefault()
        submitCount++
        if (submitCount > 3) {
            otpBtn.disabled = true
            otpErr.innerHTML = "Too many failed OTP attempts. Please try again later."
            countDown.style.display = "none"
        }
        else {
            console.log(userData, "userdata")
            let otp_number = otpForm.otp.value
            confirmationResult.confirm(otp_number)
                .then(async (result) => {
                    const user = result
                    await fetch('/user/createUser', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ userData })
                    })
                        .then(() => {
                            otpForm.otp.value = "";
                            window.location.href = '/'
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                })
                .catch((error) => {
                    console.log(error)
                    form.classList.add('d-none')
                    otpForm.classList.remove('d-none')
                    otpErr.innerHTML = "OTP number you entered is incorrect."
                })
        }
    })

    //Resend OTP
    let resendBtn = document.getElementById('resendOTP')

    resendBtn.addEventListener('click', (e) => {
        signInWithPhoneNumber(auth, mobilenumber, appVerifier)
            .then((confirmationResult) => {
                window.confirmationResult = confirmationResult;
                window.alert("OTP send successfully")
                form.classList.add('d-none')
                otpForm.classList.remove('d-none')
                otpBtn.disabled = false
                let duration = 120
                startCountdown(duration, countDown, otpBtn)
                // ...
            }).catch((error) => {
                // Error; SMS not sent

                window.alert(error, "Failed to send OTP")
                setTimeout(() => {
                    window.location.reload()
                }, 1000)
            });

    })

}



function startCountdown(duration, display, button) {
    var timer = duration, hours, minutes, seconds;
    setInterval(function () {
        hours = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt(timer % 60, 10);

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;


        if (timer > 0) {
            display.textContent = "OTP is valid for " + minutes + ":" + seconds;
            if (--timer === 0) {
                button.disabled = true
                display.style.color = "red"
                display.textContent = "OTP expired.Click resend to send again."
            }
        }
    }, 1000);
}



