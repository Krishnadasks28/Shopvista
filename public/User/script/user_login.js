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


if (window.location.pathname === '/user/login') {
    console.log("Route login")
    var form = document.getElementById('user_login')

    let phoneNumber
    let password
    let errMsg

    form.addEventListener('submit', (e) => {

        if (!isValid()) {
            e.preventDefault()
        }

        function isValid() {
            phoneNumber = document.getElementById('login_mobile')
            password = document.getElementById('login_password')
            errMsg = document.getElementById('errorP')

            let valid = true
            if (phoneNumber.value.trim() === "") {
                errMsg.innerHTML = "Input field should not be empty."
                phoneNumber.classList.add('not-valid')
                valid = false
            }
            else if (phoneNumber.value.trim().length !== 10) {
                errMsg.innerHTML = "Enter a valid mobile number."
                phoneNumber.classList.add('not-valid')
                valid = false
            }

            if (password.value.trim() === "") {
                errMsg.innerHTML = "Input field should not be empty."
                password.classList.add('not-valid')
                valid = false
            }

            return valid;
        }
    })

    form.addEventListener('input', (e) => {

        if (phoneNumber.value.trim().length === 10) {
            phoneNumber.classList.remove('not-valid')
            phoneNumber.classList.add('valid')
        }

        if (password.value.trim().length > 6) {
            password.classList.remove('not-valid')
            password.classList.add('valid')
        }

        if (phoneNumber.classList.contains('valid') && password.classList.contains('valid')) {
            errMsg.innerHTML = ""
        }
    })
}


// User login with OTP
if (window.location.pathname === '/user/otp_login') {
    console.log("LOGIN WITH OTP")

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'send_otp', {
        'size': 'invisible',
        'callback': (response) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
    });
    var appVerifier = window.recaptchaVerifier

    let resendDiv = document.getElementById('resend_div')
    let resendLink = document.getElementById('resend_link')
    let sendOTP = document.getElementById('send_otp')
    let submitOTP = document.getElementById('otp_submit')
    let errorMsg
    let phoneNumber
    let otpCountdown = document.getElementById('otpCountdown')
    sendOTP.addEventListener('click', async (e) => {
        console.log("button clicked")
        errorMsg = document.getElementById('otp_error')
        phoneNumber = document.getElementById('otp_mobile')
        let phone = phoneNumber.value
        if (phone.trim() === "") {
            errorMsg.innerHTML = "Please enter your mobile number to send OTP."
        }
        else if (phone.trim().length !== 10) {
            errorMsg.innerHTML = "Please enter a valid mobile number."
        }
        else if (phone.trim().length === 10) {

            await fetch('/user/checkNumber', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone })
            })
                .then((response) => {
                    if (response.status == 200) {
                        let phone = "+91" + phoneNumber.value

                        signInWithPhoneNumber(auth, phone, appVerifier)
                            .then((confirmationResult) => {
                                window.confirmationResult = confirmationResult
                                window.alert("OTP send successfully.")
                                sendOTP.classList.add('d-none')
                                submitOTP.classList.remove('d-none')
                                resendDiv.classList.remove('d-none')
                                let duration = 120
                                startCountdown(duration, otpCountdown, submitOTP)

                            })
                            .catch((error) => {
                                alert(error, "Failed to send OTP")
                                setTimeout(() => {
                                    window.location.reload()
                                }, 1000)
                            })
                    }
                    else if(response.status == 400 ){
                        errorMsg.innerHTML = "User does not exist!!!"
                    }   
                })


        }
    })

    let submitCount = 0
    submitOTP.addEventListener('click', (e) => {
        e.preventDefault()
        submitCount++
        if (submitCount > 3) {
            submitOTP.disabled = true
            errorMsg.innerHTML = "Too many failed OTP attempts. Please try again later."
            otpCountdown.style.display = "none"
        }
        else {
            let otp_field = document.getElementById('otp_field')
            let phone = phoneNumber.value
            let otp_number = otp_field.value
            console.log("Else field worked")
            confirmationResult.confirm(otp_number)
                .then(async (result) => {

                    await fetch('/user/createSession', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ phone })
                    })
                        .then((response) => {
                            if (response.status === 200) {
                                console.log("Login successful.")
                                window.location.href = '/'
                            }
                            else if (response.status === 400) {
                                window.alert("The user is restricted from entering the shop")
                                window.location.href = '/user/login'
                            }
                            else if (response.status === 404) {
                                window.alert("User does not exist").
                                    window.location.href = '/user/login'
                            }
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                })
                .catch((error) => {
                    console.log(error)
                    errorMsg.innerHTML = "The OTP number you entered is incorrect."
                })
        }
    })


    // resend OTP
    resendLink.addEventListener('click', (e) => {
        let phone = "+91" + phoneNumber.value

        signInWithPhoneNumber(auth, phone, appVerifier)
            .then((confirmationResult) => {
                window.confirmationResult = confirmationResult
                window.alert("OTP sended again.")
                let duration = 120
                startCountdown(duration, otpCountdown, submitOTP)
                submitOTP.disabled = false
            })
            .catch((error) => {
                window.alert("Failed to send OTP", error)

                setTimeout(() => {
                    window.location.reload()
                }, 1000)
            })

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


