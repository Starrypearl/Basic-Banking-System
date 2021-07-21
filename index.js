const express = require("express");
const app = express();

const mongoose = require("mongoose");
const ejsLayots=require("express-ejs-layouts")
const Customer = require("./models/User");
const Transaction = require("./models/Transaction");
const Datab = require("./models/AllDatabs");
const AppError = require("./views/AppError");

const PORT = process.env.PORT || 3000;
connection link

//database connnection
mongoose.connect( dbURL, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false })
    .then(() => {
        console.log("connected");
    })
    .catch((err) => {
        console.log("error", err);
    })

/// customers data inserting into data base
/*
Customer.insertMany([
        {
            username: "Customer1", email: "cus1@gmail.com", Balance: 1200 
        },
        {
            username: "Customer2", email: "cus2@gmail.com", Balance: 1200 
        }, 
        {
            username: "Customer3", email: "cus3@gmail.com", Balance: 1200 
        },
        {
            username: "Customer4", email: "cus4@gmail.com", Balance: 1200 
        },

        {
            username: "Customer5", email: "cus5@gmail.com", Balance: 1200 
        },
        {
            username: "Customer6", email: "cus6@gmail.com", Balance: 1200 
        },  {
            username: "Customer7", email: "cus7@gmail.com", Balance: 1200 
        },  {
            username: "Customer8", email: "cus8@gmail.com", Balance: 1200 
        },  {
            username: "Customer9", email: "cus9@gmail.com", Balance: 1200 
        },  {
            username: "Customer10", email: "cus10@gmail.com", Balance: 1200 
        },

    ]).then(function(){
        console.log("Data inserted")  
    }).catch(function(error){
        console.log(error)      
    });


   Customer.deleteMany();
*/

// view engine set up

app.use(ejsLayots)
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");



function wrapAsync(fn) {
    return function(req, res, next) {
        fn(req, res, next).catch(e => next(e));
    }
};





app.get("/", (req, res) => {
    res.render("home");
});


app.get("/customer", wrapAsync(async(req, res, next) => {
    const customer = await Customer.find({});
    if (!customer) {
        throw new AppError("No users exist", 401);
    }
   
    res.render("customers", { customer });
}));

app.get("/customer/:id/transfer", wrapAsync(async(req, res, next) => {
    const { id } = req.params;
    const cs = await Customer.findById(id);
    const cus = await Customer.find({});
    if (!cs || !cus) {
        throw new AppError("User Not Found", 401);
    }
    res.render("transfer", { cus, cs });
}));

app.get("/customer/:id/history", wrapAsync(async(req, res, next) => {
    const { id } = req.params;
    const c = await Customer.findById(id);
    const v = c.username;
    if (!v) {
        throw new AppError("User Not Found", 401);
    }
    await Customer.findOne({ username: v })
        .populate("transactions")
        .exec(function(err, t) {
            t.toObject({ getters: true });
            res.render("history", { t });
        });
}));


app.post("/customer", wrapAsync(async(req, res, next) => {
    const { username, Amount, From, comment } = req.body;
    const cus = await Customer.findOne({ username: username }); 
    const b = await Customer.findOne({ username: From });
    if (!cus || !b) {
        throw new AppError("User Not Found", 401);
    }
    if (b.Balance > 0 && Amount < b.Balance && Amount > 0) {
        const f = new Transaction({ Date: Date(), amount: Amount, Description: `Recieved $${Amount} from ${b.username}`, comment: `${comment}` });
        await f.save();
        const t = new Transaction({ Date: Date(), amount: Amount, Description: `Paid $${Amount} to ${cus.username}`, comment: `${comment}` });
        await t.save() 
        cus.transactions.push(f);
        await cus.save();
        const d = new Datab({ Date: Date(), payment: `${b.username} sends $${Amount} to ${cus.username}` });
        await d.save();
        b.transactions.push(t);
        await b.save();
        const am = parseInt(cus.Balance) + parseInt(Amount);
        await Customer.findOneAndUpdate({ username: From }, { Balance: parseInt(b.Balance) - parseInt(Amount) });
        await Customer.findOneAndUpdate({ username: username }, { Balance: am });
        res.redirect("/customer");
    } else if (Amount > b.Balance) {
        throw new AppError("You Haven't enough Balance to make payment", 500);
    } else {
        throw new AppError("Amount should be positive", 500);
    }
}));

app.get("/transactions", async(req, res) => {
    const a = await Datab.find({});
    res.render("transactions", { a });
});

app.all("*", (req, res, next) => {
    next(new AppError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
    const { status = 401, message = "Something wrong Occured" } = err;
    if (!err.message)
        err.message = "Something Wrong";
    res.status(status).render("error", { err });
});

app.listen(PORT, (req, res) => {
    console.log("Welcome to the Server")
});
