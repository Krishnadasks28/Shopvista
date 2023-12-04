var form = document.getElementById('admin_login')
var errMsg = document.getElementById('errP')
var btn = document.getElementById('admin_btn')

if(window.location.pathname === "/admin/login"){
    console.log("Script executed...")

    btn.addEventListener('click',(e)=>{
        if(!form.checkValidity()){
            e.preventDefault()
            form.classList.add('was-validated')
            errMsg.innerHTML = "Input field should not be empty"
        }
    })
}