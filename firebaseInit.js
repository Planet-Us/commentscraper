const firebase = require("firebase/compat/app");
require("firebase/compat/auth");
require("firebase/compat/firestore")
const firebaseConfig = {
    apiKey: "AIzaSyCaDaG237NvlNIJdpDGUbRcqSmL8LWmAZ4",
    authDomain: "ytscraper-41b2e.firebaseapp.com",
    projectId: "ytscraper-41b2e",
    storageBucket: "ytscraper-41b2e.appspot.com",
    messagingSenderId: "488512811338",
    appId: "1:488512811338:web:52f2b316c9c7c56a3711b3",
    measurementId: "G-470Z7JEB9W"
  };
const firebaseApp = firebase.initializeApp(firebaseConfig);
firebaseApp.firestore();