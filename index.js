const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const puppeteer = require('puppeteer');
const express = require('express');
const functions = require('firebase-functions');
const chromium = require('chrome-aws-lambda');
// const puppeteer = require('puppeteer-core');

const app = express();

app.get('/getComments', async (req, res) => {
    console.log(req.query);
    const result = await getYTComment(req.query.searchText);
    res.send(result);
});

app.get('/getComment', async (req, res) => {
    console.log(req.query);
    const result = await scrapeComments(req.query.searchText);
    res.send(result);
});

app.get('/getCommentTemp', async (req, res) => {
    console.log(req.query);
    const result = await scrapeCommentsOnlyTen(req.query.searchText);
    res.send(result);
});

app.get('/', async (req, res) => {
    res.send("hello");
});

const server = app.listen(process.env.PORT || '3001', () => {
    console.log('server listening on port %s', server.address().port);
});

const getYTComment = async (ytSearch) =>{
    const apiKey = 'AIzaSyBcEMoyxi2qHWcKjX1_Cw7oQuWj4AsWdOs';
    let tempComments = new Array();
    let tempVideoURLs = new Array();
    let channelId = "UCeAQsCuhMxAowmOa_Rl1oTw";
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

async function scrapeComments(videoUrl) {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().headless()) // 여기를 수정
        .build();

let count = 0;
let results = new Array();
try {
    // YouTube 동영상 페이지로 이동
    await driver.get(videoUrl);

    // 페이지가 로드될 때까지 기다림
    await driver.wait(until.elementLocated(By.tagName('body')), 10000);

    // 스크롤 다운하여 댓글을 더 로드
    let lastHeight = await driver.executeScript('return document.documentElement.scrollHeight');
    while (true) {
        await driver.executeScript('window.scrollTo(0, document.documentElement.scrollHeight);');
        await driver.sleep(1000); // 기다리는 시간은 상황에 따라 조정
        let newHeight = await driver.executeScript('return document.documentElement.scrollHeight');
        if (newHeight === lastHeight) {
            break;
        }
        lastHeight = newHeight;
    }

    // 댓글 추출
    let comments = await driver.findElements(By.id('content-text'));
    for (let comment of comments) {
        let commentText = await comment.getText();
        results.push(commentText);
        count++;
        // console.log(commentText);
    }
} finally {
    // 드라이버 종료
    console.log(count);
    
    await driver.quit();
    return results;
}
}


async function scrapeCommentsOnlyTen(videoUrl) {
    const browser = await puppeteer.launch({
        executablePath: await chromium.executablePath,
        args: chromium.args,
        headless: chromium.headless,
        defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();
    await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await autoScroll(page);

    const comments = await page.evaluate(() => {
        const commentsArray = [];
        const commentElements = document.querySelectorAll('#content-text');
        for (let i = 0; i < commentElements.length; i++) {
            // if (i >= 10) break; // 최대 10개의 댓글만 추출
            commentsArray.push(commentElements[i].innerText);
        }
        return commentsArray;
    });

    await browser.close();
    return comments;
}


async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            const distance = 5;
            const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

// exports.api = functions.https.onRequest(app);
