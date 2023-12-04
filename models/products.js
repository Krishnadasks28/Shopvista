const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true, 
    },
    description: {
        type: String,
        required: true,
        
    },
    brand:{
        type:String,
        required:true,
    },
    color: {
        type: String,
        required:true 
    },
    size:[{
        type:String,
        required:false
    }],
    productPrice: { 
        type: Number,
        required: true
    },
    salePrice: { 
        type: Number, 
        required: true
    },
    categoryName:{  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category' 
    },
    
    quantity: {
        type: Number,
        required: true
    },
    primaryImage:[{
        name:{
            type:String, 
            required:true
        },
        path:{
            type:String, 
            required:true
        } 
    }], 
    secondaryImages:[{
        name:{
            type:String,
            required:true, 
        },
        path:{
            type:String,
            required:true, 
        }
    }],
       ratings: [{ 
        star: Number,
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'userdatas'
        }
    }],
    isListed:{
        type:Boolean,
        default:true
    },
    sold:{
        type:Number,
        default:0
    },
    totalSale:{
        type:Number,
        default:0
    }
}, { timestamps: true });


productSchema.index({title:"text",brand:"text",description:"text"})


module.exports = productSchema



