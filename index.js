const axios = require('axios');
const {scrapeComments, scrapeCommentsOnlyTen} = require('./server.js');
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");

const schedule = require('node-schedule');
if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const db = admin.firestore();
const regularExec = schedule.scheduleJob('0 * * * * *', async ()=>{ 
    getDB();
});

async function getDB() {
    
    const requestTime = new Date().getTime().toString();
    var requestDB = await db.collection('request');
    var temp = await requestDB.get();
    temp.docs.map(async (doc) => {
        if(parseInt(doc.id) > parseInt(requestTime) - 200000){
            console.log(doc.id);
            if(doc.data().result == false){
                if(doc.data().category == "free"){
                    let result = await scrapeCommentsOnlyTen(doc.data().link, doc.data().email);
                    console.log(result);
                    await requestDB.doc(doc.id).set({
                        result: true
                    }, {merge: true})
                }else if(doc.data().category == "credit"){
                    let result = await scrapeComments(doc.data().link, doc.data().email);
                    console.log(result);
                    await requestDB.doc(doc.id).set({
                        result: true
                    }, {merge: true})
                }
            }
        }
    });
}