const mongoose = require('mongoose')

const bannerSchema = mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    image:{
        name:{
            type:String, 
            required:true
        },
        path:{
            type:String, 
            required:true
        } 
    },
    bannerUrl:{
        type:String,
        required:true
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
    status:{
        type:String,
        default:function(){
            return Date.now() <= this.endDate && Date.now() >= this.startDate ? 'Active':'Inactive';
        }
    }
},{timestamps:true})

module.exports = bannerSchema