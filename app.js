const express = require('express')
const dotenv = require('dotenv')
dotenv.config()
const path = require('path')
const app = express()
const session = require('express-session')
const { v4: uuidv4 } = require('uuid')
const userRoute = require('./routes/userRoute')
const adminRoute = require('./routes/adminRoute')
const { loadHome } = require('./controller/userController')
const {user} = require('./database/mongodb')

const PORT = process.env.PORT || 8000
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }))


app.use(express.static('/'));
app.use("/user", express.static(path.join(__dirname, 'public/User')))
app.use("/admin", express.static(path.join(__dirname, 'public/admin')))
app.use("/admin/css", (req, res, next) => {
    res.type("text/css");
    next();
});

app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: false
}))

app.use((req, res, next) => {
    if (req.session) {
        req.session.previousRoute = req.session.currentRoute || null;
        req.session.currentRoute = req.path
    }
    next();
})
app.use((req,res,next)=>{
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    next()
})



app.use('/user', userRoute)
app.use('/admin', adminRoute)

app.get('/', loadHome)

app.use((req, res, next) => {
    res.render('./User/error404',{title:"Page Not Found!"})
})


app.use((err, req, res, next) => {
    console.log(err)
    res.render('./User/error404',{title:"Page Not Found!"})
    res.end()
})


app.listen(PORT, () => console.log("Server Started at port ",PORT))

