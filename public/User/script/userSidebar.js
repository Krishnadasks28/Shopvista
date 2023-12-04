
    document.addEventListener("DOMContentLoaded", () => {
        const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
        const sidebarMenu = document.getElementById("sidebarMenu");
        const sidebarClose = document.getElementById("sidebarClose")
        const main = document.getElementById('main')
        toggleSidebarBtn.addEventListener("click", function () {
            sidebarMenu.style.left = "0";
            toggleSidebarBtn.style.display = 'none'
        });

        sidebarClose.addEventListener('click', (e) => {
            sidebarMenu.style.left = "-350px";
            toggleSidebarBtn.style.display = 'block'
            toggleSidebarBtn.classList.remove('d-lg-none')
        })


        if (window.innerWidth < 768) {
            main.addEventListener('click',(e)=>{
                sidebarMenu.style.left = "-350px";
                toggleSidebarBtn.style.display = 'block'
            })
        }
        
    });
