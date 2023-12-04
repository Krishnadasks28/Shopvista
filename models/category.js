const mongoose = require('mongoose')



const categorySchema = mongoose.Schema({
    category_name:{
        type:String,
        required:true
    },
    category_description:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    }
},{timestamps:true})

categorySchema.index({category_name:"text"})


module.exports = categorySchema