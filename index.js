const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const puppeteer = require('puppeteer');
const express = require('express');
const functions = require('firebase-functions');
const cors = require('cors');
// const {ipfsUploadMetadata} = require("./ipfsUpload.js");
const converter = require('json-2-csv');
const { appendFileSync, fstat, createReadStream, writeFileSync } = require('fs');
const { NFTStorage, Blob } = require("nft.storage");
const keccak256 = require('keccak256');
const nodemailer = require('nodemailer');
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");
require('dotenv').config();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();

const app = express();
app.use(cors());

app.get('/getComments', async (req, res) => {
    console.log(req.query);
    const result = await getYTComment(req.query.searchText);
    res.send(result);
});

app.post('/getComment', async (req, res) => {
    console.log(req.query);
    // console.log(req);
    const result = scrapeComments(req.query.searchText, req.query.userName);
    
    res.send(true);
});

app.get('/getCommentTemp', async (req, res) => {
    console.log(req.query);
    const result = await scrapeCommentsOnlyTen(req.query.searchText);
    res.send(result);
});

app.get('/sendNewPass', async (req, res) => {
    console.log(req.query);
    const result = await sendNewPassword(req.query.email);
    res.send(result);
});

app.get('/', async (req, res) => {
    res.send("hello");
});

const server = app.listen(process.env.PORT || '3001', () => {
    console.log('server listening on port %s', server.address().port);
});

const getYTComment = async (ytSearch) =>{
    let tempComments = new Array();
    let videoIds = new Array();
    // youtube data api 안쓰고 채널명으로 검색해서 채널 id를 가져온 후, 비디오 링크 가져오기
    await getTopYouTubeChannel(ytSearch).then(async (channelId) => {
        console.log(channelId);
        if (channelId) {
            console.log(`Channel ID: ${channelId}`);
            await getChannelVideos(channelId).then(videoLinks => {
                console.log(videoLinks);
                videoIds = videoLinks;
            });
        }
    });
    // const videoIds = await extractVideoIds(tempVideoURLs);
    for(let i = 0;i<videoIds.length;i++){
        tempComments = await scrapeComments(videoIds[i]);
        let headers = {"Authorization": "Bearer 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",
                        'Content-Type': 'application/json'}
    
        // axios.post('http://127.0.0.1:5000/analyze', {
        axios.post('https://api-inference.huggingface.co/models/nlp04/korean_sentiment_analysis_kcelectra', {
            comments: tempComments
        }, {            
            headers: headers
        }).then(response => {
            // console.log(response.data); // 여기에서 감정 분석 결과 처리
            
            let worstComment = new Array();
            let bestComment = new Array();
            let worstScore = new Array(0,0,0,0,0,0,0,0,0,0);
            let bestScore = new Array(0,0,0,0,0,0,0,0,0,0);
            let totalScore = 0;
            let singleScore = 0;
            console.log(worstScore);
            for(let j = 0;j<response.data.length;j++){
            // console.log(response.data[j][0][1])
            singleScore = 0;
            totalScore += response.data[j][0][0]; //기쁨(행복한)
            totalScore += response.data[j][0][1]; //고마운
            totalScore += response.data[j][0][2]; //설레는(기대하는)
            totalScore += response.data[j][0][3]; //사랑하는
            totalScore += response.data[j][0][4]; //즐거운(신나는)
            totalScore += response.data[j][0][5]; //일상적인
            totalScore += response.data[j][0][6]; //생각이 많은
            totalScore -= response.data[j][0][7]; //슬픔
            totalScore -= response.data[j][0][8]; //힘듦
            totalScore -= response.data[j][0][9]; //짜증남
            totalScore -= response.data[j][0][10]; //걱정스러운

            
            singleScore += response.data[j][0][0]; //기쁨(행복한)
            singleScore += response.data[j][0][1]; //고마운
            singleScore += response.data[j][0][2]; //설레는(기대하는)
            singleScore += response.data[j][0][3]; //사랑하는
            singleScore += response.data[j][0][4]; //즐거운(신나는)
            singleScore += response.data[j][0][5]; //일상적인
            singleScore += response.data[j][0][6]; //생각이 많은
            singleScore -= response.data[j][0][7]; //슬픔
            singleScore -= response.data[j][0][8]; //힘듦
            singleScore -= response.data[j][0][9]; //짜증남
            singleScore -= response.data[j][0][10]; //걱정스러운
            if(singleScore > bestScore[9]){
                for(let bi = 9;bi>=0;bi--){
                if(singleScore < bestScore[bi-1] || bi == 0){
                    for(let bi2 = 9; bi2>bi;bi2--){
                    bestScore[bi2] = bestScore[bi2-1];
                    bestComment[bi2] = bestComment[bi2-1];
                    }
                    bestScore[bi] = singleScore;
                    bestComment[bi] = tempComments[j];
                    break;
                }
                }
            }
            if(singleScore < worstScore[9]){
                for(let bi = 9;bi>=0;bi--){
                if(singleScore > worstScore[bi-1] || bi == 0){
                    for(let bi2 = 9; bi2>bi;bi2--){
                    worstScore[bi2] = worstScore[bi2-1];
                    worstComment[bi2] = worstComment[bi2-1];
                    }
                    worstScore[bi] = singleScore;
                    worstComment[bi] = tempComments[j];
                    break;
                }
                }
            }
            }
            totalScore = totalScore/response.data.length;
            // console.log(tempVideoURLs[i].title)
            console.log(totalScore);
            console.log(bestComment);
            console.log(worstComment);
            if(totalScore > 0.6){console.log("아주긍정적")}
            else if(totalScore > 0.2){console.log("긍정적")}
            else if(totalScore > -0.2){console.log("중립적")}
            else if(totalScore > -0.6){console.log("부정적")}
            else if(totalScore > -1){console.log("아주부정적")}

        }).catch(error => {
            console.error('Error:', error);
        });
    }
}


async function getTopYouTubeChannel(channelName) {
const browser = await puppeteer.launch();
const page = await browser.newPage();

// YouTube 검색 URL
const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}`;
await page.goto(searchUrl);

try {
    // 검색 결과에서 첫 번째 채널 링크 찾기
    const channelLink = await page.evaluate(() => {
        const anchor = document.querySelector('a#main-link');
        return anchor ? anchor.href : null;
    });
    console.log(channelLink);

    await browser.close();
    return channelLink;
} catch (error) {
    console.error(error);
    await browser.close();
    return null;
}
}

async function getChannelVideos(channelUrl) {
const browser = await puppeteer.launch();
const page = await browser.newPage();

await page.goto(channelUrl, { waitUntil: 'networkidle2' });

// 스크롤 다운 함수 정의
async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

// 페이지를 스크롤하여 더 많은 동영상을 로드
await autoScroll(page);

// 동영상 링크 추출
const videoLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a#video-title'));
    return links.map(link => link.href);
});

await browser.close();
return videoLinks;
}

const CsvFile = (author, comment, userName) => {
    const csv = `${author},${comment}\n`; // Construct a CSV row
    try {
        appendFileSync('./result_' + userName  + getToday().toString() + '.csv', csv); // Append the CSV row to the file
    } catch (error) {
        console.log(error);
    }
};

async function scrapeComments(videoUrl, userName) {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().headless())
        .build();

    let results = [];
    var json_data = '[';
    try {
        await driver.get(videoUrl);
        await driver.wait(until.elementLocated(By.tagName('body')), 10000);
        // 시간 제한을 위한 시작 시간
        const startTime = new Date().getTime();
        // 최대 대기 시간 (예: 30초)
        const maxWaitTime = 900000;

        let lastHeight = await driver.executeScript('return document.documentElement.scrollHeight');
        console.log("lastHeight is " + lastHeight);
        while (true) {
            await driver.executeScript('window.scrollTo(0, document.documentElement.scrollHeight);');
            await driver.sleep(1000);
            let newHeight = await driver.executeScript('return document.documentElement.scrollHeight');
            console.log("newHeight is " + newHeight);
            // 시간 제한 확인
            if (new Date().getTime() - startTime > maxWaitTime) {
                console.log("시간 제한 도달");
                break;
            }
            if (newHeight === lastHeight) {
                break;
            }
            lastHeight = newHeight;
        }

        // 'ytd-comment-thread-renderer'를 기준으로 댓글 정보 추출
        let comments = await driver.findElements(By.id('content-text'));
        let authorNames = await driver.findElements(By.id('author-text'));
        console.log(comments.length);
        console.log(authorNames.length); 
        for (let i = 0;i<comments.length;i++) {
            let commentText = await comments[i].getText();
            let author = await authorNames[i].getText();
            // console.log(author);
            if(commentText.search('\\n') != -1){
                let tempComment = await commentText.split("\n").join("");
                commentText = tempComment;
            }
            if(commentText.search("\"") != -1){
                let tempComment = await commentText.replaceAll("\"","");
                commentText = tempComment;
            }
            results.push({"author": author, "comment": commentText});
            json_data = json_data + '{"author" : "' + author + '", "comment" : "' + commentText + '"}';
            if(i != comments.length -1){
                json_data = json_data + ',';
            }
            // console.log(results.length);
            // console.log(commentText);
        }
        json_data = json_data + ']';
    } finally {
        console.log(`Extracted ${results.length} comments.`);
        await driver.quit();
        try {
            let csvData = "`Author, Comment\\n`";
            
            JSON.parse(json_data).forEach((data, index) => {
                const { author, comment } = data; // Destructure contact properties
                csvData = csvData + `${author},${comment}\n`
            });
            writeFileSync('./result_' + userName + '_' + getToday().toString() + '.csv', '\uFEFF' + csvData); 

            // const uploadFile = createReadStream('./result_' + userName  + getToday().toString() + '.csv',{encoding: 'utf-8'});
            // const tokenURI = await ipfsUploadFile(uploadFile);
            // console.log(tokenURI);
            const mailText = "<h3>hello, " + userName + "!</h3><br/><br/>" + "<h3>This mail sent from YTScrape and your request file is attached below. </h3><br/><br/> <h3>Thank you for using our service.</h3><br/><br/> YTScrape"
            console.log(process.env.GMAIL_MAIL);
            var mailOptions = {
                from: process.env.GMAIL_MAIL,
                to: userName,
                subject: '[YTScrape]Your comment file',
                html: mailText,
                attachments: [{
                    filename: 'result_' + userName  + '_' +  getToday().toString() + '.csv', // file name
                    path: './result_' + userName  + '_' +  getToday().toString() + '.csv' // file path
                }]
            };
            
            transporter.sendMail(mailOptions, async function(error, info){
                if(error){
                    console.log(error);
                }
                
                var accountDB = await db.collection('account');
                var temp = await accountDB.doc(userName).get().then(async function(res) {
                    await accountDB.doc(userName).set({
                        credit: parseInt(res.data().credit)-1
                    }, {merge: true})
                });
            });
            
            console.log('CSV creation successful!');
        } catch (error) {
            console.log('Error fetching or processing data:', error);
        }
        // await converter.json2csv(JSON.parse(json_data), async (err, csv) => {
        //     console.log("0");
        //     if (err) {
        //         throw err;
        //     }
        //     console.log("1");
        //     await fs.writeFileSync('./result_' + userName  + getToday().toString() + '.csv', csv);
        //     await fs.writeFileSync('./result.csv', csv);
        //     console.log('./result_' + userName  + getToday().toString() + '.csv');
        // });        
        return results;
    }
}



async function sendNewPassword(userName) {
    var variable = "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z".split(",");
    var randomPassword = await createRandomPassword(variable, 8);
    
    const emailOptions = { // 옵션값 설정
        from: process.env.GMAIL_MAIL,
        to: userName,
        subject: '[YTScrape]Your temporary password',
          html: 
          "<h1 >Hello, " + userName + "!" + "</h1> <h2> Your New Password : " + randomPassword + "</h2>"
          +'<h3 style="color: crimson;">Once you sign in, you may change your password</h3>'
          ,
        };
    transporter.sendMail(emailOptions, function(error, info){
        if(error){
            console.log(error);
        }
        console.log(info.response);
    });
    var accountDB = await db.collection('account');
      var temp = await accountDB.doc(userName).get().then(async function(data) {
        await accountDB.doc(userName).set({
            password: randomPassword
        }, {merge: true})
        
      });
    return randomPassword;

    //비밀번호 랜덤 함수
    function createRandomPassword(variable, passwordLength) {
        var randomString = "";
        for (var j=0; j<passwordLength; j++) 
        {
            randomString += variable[Math.floor(Math.random()*variable.length)];
        }
        return randomString
    }
}

async function scrapeCommentsOnlyTen(videoUrl) {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().headless())
        .build();

    let results = [];
    try {
        await driver.get(videoUrl);
        await driver.wait(until.elementLocated(By.tagName('body')), 10000);
        // 시간 제한을 위한 시작 시간
        const startTime = new Date().getTime();
        // 최대 대기 시간 (예: 30초)
        const maxWaitTime = 20000;

        let lastHeight = await driver.executeScript('return document.documentElement.scrollHeight');
        console.log("lastHeight is " + lastHeight);
        while (true) {
            await driver.executeScript('window.scrollTo(0, document.documentElement.scrollHeight);');
            await driver.sleep(1000);
            let newHeight = await driver.executeScript('return document.documentElement.scrollHeight');
            console.log("newHeight is " + newHeight);
            // 시간 제한 확인
            if (new Date().getTime() - startTime > maxWaitTime) {
                console.log("시간 제한 도달");
                break;
            }
            if (newHeight === lastHeight) {
                break;
            }
            lastHeight = newHeight;
        }

        // 'ytd-comment-thread-renderer'를 기준으로 댓글 정보 추출
        let comments = await driver.findElements(By.id('content-text'));
        let authorNames = await driver.findElements(By.id('author-text'));
        console.log(comments.length);
        console.log(authorNames.length);
        let count = 0;
        for (let i = 0;i<comments.length;i++) {
            let commentText = await comments[i].getText();
            let author = await authorNames[i].getText();
            console.log(commentText);
            console.log(author);
            results.push({author: author, comment: commentText});
            console.log(results.length);
            count++;
            if(count >= 100) {break;}
            console.log(commentText);
        }
    } finally {
        console.log(`Extracted ${results.length} comments.`);
        await driver.quit();
        return results;
    }
}
function getToday(){
    var date = new Date();
    var year = date.getFullYear();
    var month = ("0" + (1 + date.getMonth())).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);

    return year + month + day;
}


async function ipfsUploadFile(files) {

    // console.log(files)
  
    // const cid = await client.storeDirectory(files)
    // console.log({ cid })
  
    // const arrayBuffer = reader.result;
    console.log([files]);
    const blob = new Blob([files], { type: 'text/csv' });
  
    const cid = await client.storeBlob(blob)
    console.log(cid)
  
    const status = await client.status(cid)
    console.log(status)
    return status.cid;
  
  
  
  }

  var transporter = nodemailer.createTransport({
    port: 465,
    secure: true,
    service: 'gmail',
    auth: {
         user: process.env.GMAIL_MAIL,
         pass: process.env.GMAIL_PASS
    }
});
  

// exports.api = functions.https.onRequest(app);
